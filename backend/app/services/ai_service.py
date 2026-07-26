import base64
import json
from collections.abc import AsyncGenerator
from pathlib import Path
from typing import Literal

import httpx

from app.core.config import settings

Mode = Literal["fast", "smart", "reasoning", "research", "vision"]

# Model families are resolved to concrete OpenRouter ids per selected mode.
MODEL_CATALOG: dict[str, dict[str, str]] = {
    "claude": {
        "default": "cc/claude-opus-4-6",
        "fast": "cc/claude-sonnet-4-6",
        "reasoning": "cc/claude-sonnet-4-6",
        "vision": "cc/claude-opus-4-6",
    },
    "qwen": {
        "default": "am/qwen3.6-35b-a3b",
        "fast": "am/qwen3.6-35b-a3b",
        "reasoning": "am/qwen3.6-35b-a3b",
        "vision": "am/qwen3.6-35b-a3b",
    },
    "deepseek": {
        "default": "am/deepseek-v4-pro",
        "fast": "am/deepseek-v4-pro",
        "reasoning": "am/deepseek-v4-pro",
        "vision": "am/deepseek-v4-pro",
    },
    "glm": {
        "default": "glm/glm-5.1",
        "fast": "glm/glm-5.1",
        "reasoning": "glm/glm-5.1",
        "vision": "glm/glm-5.1",
    },
    "grok": {
        "default": "xai/grok-4",
        "fast": "xai/grok-4",
        "reasoning": "xai/grok-4",
        "vision": "xai/grok-4",
    },
    "gemini": {
        "default": "gc/gemini-2.5-pro",
        "fast": "gc/gemini-2.5-pro",
        "reasoning": "gc/gemini-2.5-pro",
        "vision": "gc/gemini-2.5-pro",
    },
    "gpt": {
        "default": "cx/gpt-5.2-pro-2025-12-11",
        "fast": "cx/gpt-5.2-pro-2025-12-11",
        "reasoning": "cx/gpt-5.2-pro-2025-12-11",
        "vision": "cx/gpt-5.2-pro-2025-12-11",
    },
    "kmc/kimi-for-coding": {
        "default": "kmc/kimi-for-coding",
        "fast": "kmc/kimi-for-coding",
        "reasoning": "kmc/kimi-for-coding",
        "vision": "kmc/kimi-for-coding",
    }
}

REASONING_MODES = {"reasoning"}


def resolve_model(model: str, mode: Mode, has_images: bool) -> tuple[str, bool, bool]:
    """Returns (openrouter_model_id, use_reasoning, use_web_search)."""
    family = MODEL_CATALOG.get(model, MODEL_CATALOG["claude"])

    if has_images or mode == "vision":
        model_id = family.get("vision", family["default"])
    elif mode == "fast":
        model_id = family.get("fast", family["default"])
    elif mode == "reasoning":
        model_id = family.get("reasoning", family["default"])
    else:
        model_id = family["default"]

    use_reasoning = mode == "reasoning"
    use_web_search = mode == "research"
    return model_id, use_reasoning, use_web_search


def _image_to_url(relative_or_absolute_url: str, content_type: str) -> str:
    """Local uploads live on disk and are not necessarily internet-reachable,
    so they're inlined as base64 data URIs, which every vision-capable model accepts.
    """
    if relative_or_absolute_url.startswith("http://") or relative_or_absolute_url.startswith("https://"):
        return relative_or_absolute_url

    relative_path = relative_or_absolute_url.removeprefix("/uploads/")
    file_path = Path(settings.UPLOAD_DIR) / relative_path
    if not file_path.is_file():
        return relative_or_absolute_url

    encoded = base64.b64encode(file_path.read_bytes()).decode("ascii")
    return f"data:{content_type};base64,{encoded}"


def build_user_content(text: str, attachments: list[dict]) -> str | list[dict]:
    """Builds an OpenAI-compatible content payload, inlining images as data URIs."""
    images = [a for a in attachments if a.get("kind") == "image"]
    if not images:
        return text

    parts: list[dict] = [{"type": "text", "text": text or "Проанализируй это изображение."}]
    for image in images:
        url = _image_to_url(image["url"], image.get("content_type", "image/png"))
        parts.append({"type": "image_url", "image_url": {"url": url}})
    return parts


def _provider_candidates() -> list[dict[str, str]]:
    providers = list(settings.ai_providers_list)
    for key in [
        settings.OPENROUTER_API_KEY,
        settings.OPENROUTER_API_KEY_FALLBACK_1,
        settings.OPENROUTER_API_KEY_FALLBACK_2,
    ]:
        if key:
            providers.append({"url": settings.OPENROUTER_BASE_URL, "key": key})

    seen: set[tuple[str, str]] = set()
    unique: list[dict[str, str]] = []
    for provider in providers:
        api_url = provider.get("url", "https://api.vibecode-claude.online/v1").strip()
        api_key = provider.get("key", "").strip()
        if not api_key:
            continue
        if not api_url.endswith("/v1") and not api_url.endswith("/chat/completions"):
            api_url = api_url.rstrip("/") + "/v1"
        identity = (api_url, api_key[-12:])
        if identity in seen:
            continue
        seen.add(identity)
        unique.append({"url": api_url, "key": api_key})
    return unique


async def stream_completion(
    messages: list[dict],
    model: str,
    mode: Mode,
    has_images: bool,
) -> AsyncGenerator[str, None]:
    """Streams assistant text chunks from OpenRouter as they arrive."""
    model_id, use_reasoning, use_web_search = resolve_model(model, mode, has_images)
    if use_web_search:
        model_id = f"{model_id}:online"

    payload: dict = {
        "model": model_id,
        "messages": messages,
        "stream": True,
        "temperature": 0.4 if mode == "fast" else 0.7,
    }
    if use_reasoning:
        payload["reasoning"] = {"effort": "high"}

    headers = {
        "Content-Type": "application/json",
        "HTTP-Referer": settings.FRONTEND_URL,
        "X-Title": "Dreyze AI Chat",
    }

    providers = _provider_candidates()
    if not providers:
        raise RuntimeError("No AI provider API keys configured")

    last_error = None
    has_yielded = False
    for provider in providers:
        api_url = provider["url"]
        api_key = provider.get("key")
        headers["Authorization"] = f"Bearer {api_key}"
        try:
            timeout = httpx.Timeout(connect=10, read=90, write=20, pool=10)
            async with httpx.AsyncClient(timeout=timeout) as client:
                async with client.stream(
                    "POST", f"{api_url}/chat/completions", json=payload, headers=headers
                ) as response:
                    if response.status_code != 200:
                        error_body = await response.aread()
                        last_error = f"Error {response.status_code} from {api_url}: {error_body.decode(errors='ignore')}"
                        if response.status_code in (429, 401, 403, 402, 529, 500, 502, 503, 504):
                            continue # Try next provider
                        else:
                            raise RuntimeError(last_error)
        
                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data: "):
                            continue
                        data = line.removeprefix("data: ").strip()
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                        except json.JSONDecodeError:
                            continue
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content")
                        if content:
                            has_yielded = True
                            yield content
                    return # Exit the function after a successful stream
        except Exception as e:
            if has_yielded:
                raise RuntimeError(f"Поток прерван (ошибка провайдера: {e})")
            last_error = str(e)
            continue
            
    if last_error:
        raise RuntimeError("AI временно не ответил. Попробуйте еще раз или выберите другую модель.")
