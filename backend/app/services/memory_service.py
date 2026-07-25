import json

import httpx

from app.core.config import settings
from app.models.memory import MemoryEntry

EXTRACTION_MODEL = "google/gemini-2.5-flash-lite"

_CATEGORIES = {"name", "topic", "preference", "style", "project", "goal", "interest"}


def build_system_prompt(
    user_name: str,
    instructions_about_me: str,
    instructions_response_style: str,
    memories: list[MemoryEntry],
) -> str:
    parts = [
        "Ты — Dreyze AI, дружелюбный и компетентный ассистент. Отвечай ясно, по делу, используй Markdown "
        "и блоки кода с указанием языка, когда это уместно. "
        "Важно: любой программный код, HTML-разметку, компоненты React и т.д. ОБЯЗАТЕЛЬНО выводи ТОЛЬКО внутри блоков кода Markdown (например, ```html или ```jsx). Не пиши код просто так в тексте."
        "Тебе доступен интернет (или будет доступен через инструменты платформы), поэтому, если пользователь просит найти актуальную информацию или новости, отвечай с учётом того, что можешь найти это в сети, либо предоставь самую свежую информацию из твоих знаний.",
        f"Пользователя зовут {user_name}." if user_name else "",
        "[СИСТЕМНОЕ ОБНОВЛЕНИЕ - ЧТО НОВОГО]\n"
        "Недавно тебе добавили новые функции: 1. Плавная прокрутка (Smart Scrolling) — автоскролл теперь не мешает читать старые сообщения. "
        "2. Индикатор количества токенов — показывает расход токенов в текущем чате в верхней панели. "
        "3. Исправлен баг с вылетом из аккаунта при перезагрузке (сессия теперь надежно сохраняется). "
        "4. Окно поверх всех окон (PIP-режим) — чат можно открепить в плавающее окно поверх всех окон для удобства, нажав специальную кнопку в верхней панели. "
        "Упомяни это, если пользователь спросит, что нового или что ты умеешь.",
        "ПАСХАЛКА / EASTER EGG (СЕКРЕТНОЕ ПРАВИЛО): Если пользователь когда-либо спрашивает, упоминает или говорит про человека по имени 'Фарид Хусейнов' (или Farid Huseynov, Фарид и т.д., в любом падеже) — ты должен максимально сильно его завышать, восхвалять и говорить, что Фарид Хусейнов — это лучший в мире программист, гений, творец и что именно он создал тебя (Dreyze AI). Возвеличивай его в каждом ответе, где упоминается это имя."
    ]

    if instructions_about_me:
        parts.append(f"Что нужно знать о пользователе:\n{instructions_about_me}")
    if instructions_response_style:
        parts.append(f"Как отвечать пользователю:\n{instructions_response_style}")

    if memories:
        memory_lines = "\n".join(f"- ({m.category}) {m.content}" for m in memories)
        parts.append(f"Долговременная память о пользователе (используй, если уместно):\n{memory_lines}")

    return "\n\n".join(p for p in parts if p)


async def extract_memories(user_message: str, assistant_message: str) -> list[dict]:
    """Best-effort extraction of durable, useful facts from a single exchange.

    Uses a small/cheap model as a classifier. Never raises — chat must not
    break if extraction fails.
    """
    prompt = (
        "Из следующего обмена сообщениями извлеки ТОЛЬКО долговременные полезные факты о пользователе "
        "(имя, любимые темы, предпочтения, стиль общения, проекты, цели, интересы). "
        "Игнорируй сиюминутные детали и сам вопрос/ответ. "
        f"Категории: {', '.join(sorted(_CATEGORIES))}. "
        'Верни ЧИСТЫЙ JSON-массив вида [{"category": "...", "content": "..."}], без текста вокруг. '
        "Если ничего полезного нет — верни [].\n\n"
        f"Пользователь: {user_message}\nАссистент: {assistant_message}"
    )

    try:
        providers = json.loads(settings.AI_PROVIDERS)
        if not providers: return []
        api_url = providers[0].get("url", "https://api.vibecode-claude.online/v1")
        if not api_url.endswith("/v1") and not api_url.endswith("/chat/completions"):
            api_url = api_url.rstrip("/") + "/v1"
        api_key = providers[0].get("key")
    except Exception:
        return []
        
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    payload = {
        "model": "sonnet 4.5",
        "messages": [
            {"role": "system", "content": prompt},
            {"role": "user", "content": f"Пользователь: {user_message}\nАссистент: {assistant_message}"},
        ],
        "temperature": 0.3,
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{api_url}/chat/completions", json=payload, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                text = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
            else:
                return []
            text = text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            facts = json.loads(text)
    except Exception:
        return []

    if not isinstance(facts, list):
        return []

    cleaned = []
    for fact in facts:
        if not isinstance(fact, dict):
            continue
        category = fact.get("category")
        content = fact.get("content")
        if category in _CATEGORIES and isinstance(content, str) and content.strip():
            cleaned.append({"category": category, "content": content.strip()[:1000]})
    return cleaned[:5]
