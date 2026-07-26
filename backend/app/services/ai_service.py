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
        "default": "ag/claude-sonnet-4-6",
        "fast": "ag/claude-sonnet-4-6",
        "reasoning": "ag/claude-sonnet-4-6",
        "vision": "ag/claude-sonnet-4-6",
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
        "fast": "xai/grok-code-fast-1",
        "reasoning": "xai/grok-4-fast-reasoning",
        "vision": "xai/grok-4",
    },
    "gemini": {
        "default": "gc/gemini-2.5-flash",
        "fast": "gc/gemini-2.5-flash-lite",
        "reasoning": "gc/gemini-2.5-pro",
        "vision": "gc/gemini-2.5-pro",
    },
    "gpt": {
        "default": "cx/gpt-5.6-sol",
        "fast": "cx/gpt-5.4-mini",
        "reasoning": "cx/gpt-5.6-sol",
        "vision": "cx/gpt-5.6-sol",
    },
    "kmc/kimi-for-coding": {
        "default": "kmc/kimi-for-coding",
        "fast": "kmc/kimi-for-coding",
        "reasoning": "kmc/kimi-for-coding",
        "vision": "kmc/kimi-for-coding",
    }
}

MODEL_FALLBACKS: dict[str, list[str]] = {
    "claude": ["cc/claude-sonnet-5", "cc/claude-opus-5", "cc/claude-haiku-4-5-20251001"],
    "qwen": ["am/qwen3.6-35b-a3b"],
    "deepseek": ["am/deepseek-v4-flash", "am/deepseek-v4-pro"],
    "glm": ["glm/glm-5.2", "glm/glm-5.1", "glm/glm-4.6v"],
    "grok": ["xai/grok-4", "xai/grok-4-fast-reasoning", "xai/grok-3"],
    "gemini": ["gc/gemini-2.5-flash", "gc/gemini-2.5-flash-lite", "gc/gemini-2.5-pro"],
    "gpt": ["cx/gpt-5.4-mini", "cx/gpt-5.5", "cx/gpt-5.6-sol"],
    "kmc/kimi-for-coding": ["kmc/kimi-for-coding", "cx/gpt-5.4-mini"],
    "llama": ["ag/gpt-oss-120b-medium", "cx/gpt-5.4-mini"],
}

REASONING_MODES = {"reasoning"}
READABLE_DOCUMENT_TYPES = {
    "application/json",
    "text/csv",
    "text/markdown",
    "text/plain",
}
MAX_DOCUMENT_CHARS = 12000


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


def _upload_path(relative_or_absolute_url: str) -> Path | None:
    if relative_or_absolute_url.startswith("http://") or relative_or_absolute_url.startswith("https://"):
        return None
    relative_path = relative_or_absolute_url.removeprefix("/uploads/")
    file_path = Path(settings.UPLOAD_DIR) / relative_path
    if not file_path.is_file():
        return None
    return file_path


def _read_document_text(attachment: dict) -> str:
    content_type = attachment.get("content_type", "")
    name = attachment.get("name", "document")
    if content_type not in READABLE_DOCUMENT_TYPES:
        return f"[Файл {name}: тип {content_type or 'unknown'} загружен, но текст из него пока не извлекается.]"

    file_path = _upload_path(attachment.get("url", ""))
    if file_path is None:
        return f"[Файл {name}: не удалось найти локальный файл для чтения.]"

    raw = file_path.read_bytes()
    text = raw.decode("utf-8", errors="replace").strip()
    if not text:
        return f"[Файл {name}: файл пустой.]"
    if len(text) > MAX_DOCUMENT_CHARS:
        text = f"{text[:MAX_DOCUMENT_CHARS]}\n\n[Файл обрезан до {MAX_DOCUMENT_CHARS} символов.]"
    return f"[Файл {name}]\n{text}"


def build_user_content(text: str, attachments: list[dict]) -> str | list[dict]:
    """Builds an OpenAI-compatible content payload, inlining images and readable documents."""
    images = [a for a in attachments if a.get("kind") == "image"]
    documents = [a for a in attachments if a.get("kind") == "document"]
    document_text = "\n\n".join(_read_document_text(document) for document in documents)

    if document_text:
        text = f"{text}\n\n[Содержимое прикрепленных файлов]\n{document_text}".strip()

    if not images:
        return text

    parts: list[dict] = [{"type": "text", "text": text or "Проанализируй это изображение."}]
    for image in images:
        url = _image_to_url(image["url"], image.get("content_type", "image/png"))
        parts.append({"type": "image_url", "image_url": {"url": url}})
    return parts


def _normalize_chat_completions_url(api_url: str) -> str:
    api_url = api_url.strip().rstrip("/")
    if api_url.endswith("/chat/completions"):
        return api_url
    if api_url.endswith("/v1"):
        return f"{api_url}/chat/completions"
    return f"{api_url}/v1/chat/completions"


def _provider_candidates() -> list[dict[str, str]]:
    providers = list(settings.ai_providers_list)
    if settings.ANYMODEL_API_KEY:
        providers.append({"url": settings.ANYMODEL_BASE_URL, "key": settings.ANYMODEL_API_KEY})
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
        chat_url = _normalize_chat_completions_url(api_url)
        identity = (api_url, api_key[-12:])
        if identity in seen:
            continue
        seen.add(identity)
        unique.append({"url": chat_url, "key": api_key})
    return unique


def _model_candidates(model: str, mode: Mode, has_images: bool) -> list[str]:
    model_id, _, use_web_search = resolve_model(model, mode, has_images)
    candidates = [model_id, *MODEL_FALLBACKS.get(model, []), *MODEL_FALLBACKS["gpt"]]

    unique: list[str] = []
    for candidate in candidates:
        if not candidate or candidate in unique:
            continue
        unique.append(f"{candidate}:online" if use_web_search and not candidate.endswith(":online") else candidate)
    return unique


async def stream_completion(
    messages: list[dict],
    model: str,
    mode: Mode,
    has_images: bool,
) -> AsyncGenerator[str, None]:
    """Streams assistant text chunks from OpenRouter as they arrive."""
    _, use_reasoning, _ = resolve_model(model, mode, has_images)

    payload: dict = {
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
    for model_id in _model_candidates(model, mode, has_images):
        payload["model"] = model_id
        for provider in providers:
            chat_url = provider["url"]
            api_key = provider.get("key")
            headers["Authorization"] = f"Bearer {api_key}"
            try:
                timeout = httpx.Timeout(connect=10, read=90, write=20, pool=10)
                async with httpx.AsyncClient(timeout=timeout) as client:
                    async with client.stream(
                        "POST", chat_url, json=payload, headers=headers
                    ) as response:
                        if response.status_code != 200:
                            error_body = await response.aread()
                            last_error = f"Error {response.status_code} from {chat_url} model {model_id}: {error_body.decode(errors='ignore')}"
                            continue

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
                        return
            except Exception as e:
                if has_yielded:
                    raise RuntimeError(f"Поток прерван (ошибка провайдера: {e})")
                last_error = str(e)
                continue
            
    if last_error:
        raise RuntimeError("AI временно не ответил. Попробуйте еще раз или выберите другую модель.")
