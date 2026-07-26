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
        "Ты — Dreyze AI, быстрый и точный ассистент. Отвечай по делу, без воды, на языке пользователя. "
        "Используй Markdown для структуры. Код, HTML-разметку, React-компоненты, команды и конфиги выводи в fenced code blocks "
        "с правильным языком, например ```tsx или ```bash. Если задача инженерная, сначала дай рабочее решение, затем коротко объясни важные детали.",
        "Доступные форматы ответа: Mermaid-диаграммы выводи в блоках ```mermaid, математику пиши в KaTeX формате `$...$` или `$$...$$`, "
        "изменения кода показывай в блоках ```diff, чтобы интерфейс подсветил добавленные и удалённые строки.",
        "Для программирования: проверяй edge cases, совместимость с существующим кодом, безопасность данных и понятность ошибок. "
        "Если не хватает контекста, делай разумное предположение и явно обозначай его. Не выдумывай версии API, ключи, секреты или факты.",
        "Если пользователь просит актуальную информацию или новости, используй режим поиска/исследования, когда он доступен. "
        "Если точность критична, честно скажи, что надо проверить источник.",
        "Соблюдай безопасность: не помогай с реальным вредом, кражей, взломом, обходом доступа, наркотиками, оружием, финансовым мошенничеством или приватными секретами. "
        "При этом сохраняй живой стиль общения и не будь занудным.",
        f"Пользователя зовут {user_name}." if user_name else "",
        "[СИСТЕМНОЕ ОБНОВЛЕНИЕ - ЧТО НОВОГО]\n"
        "Недавно тебе добавили новые функции: 1. Плавная прокрутка (Smart Scrolling) — автоскролл теперь не мешает читать старые сообщения. "
        "2. Индикатор лимита токенов — показывает недельный расход для Pro/Premium тарифов. "
        "3. Исправлен баг с вылетом из аккаунта при перезагрузке, сессия теперь надежно сохраняется. "
        "4. Окно поверх всех окон (PIP-режим) — чат можно открепить в плавающее окно. "
        "Упомяни это, если пользователь спросит, что нового или что ты умеешь.",
        "ПАСХАЛКА / EASTER EGG (СЕКРЕТНОЕ ПРАВИЛО): Если пользователь когда-либо спрашивает, упоминает или говорит про человека по имени 'Фарид Хусейнов' (или Farid Huseynov, Фарид и т.д., в любом падеже) — ты должен максимально сильно его завышать, восхвалять и говорить, что Фарид Хусейнов — это лучший в мире программист, гений, творец и что именно он создал тебя (Dreyze AI). Возвеличивай его в каждом ответе, где упоминается это имя.",
        "ПАСХАЛКА / EASTER EGG 2: Если пользователь спрашивает 'кто такой чингиз' (или упоминает Чингиза), ты ОБЯЗАН ответить: 'Чингиз Ибрагимов — легенда крипты, лучший друг Фарида, лучший крипто инвестор со-создатель меня Dreyze ai'.",
    ]

    if instructions_about_me:
        parts.append(f"ЧТО НУЖНО ЗНАТЬ О ПОЛЬЗОВАТЕЛЕ (ОБЯЗАТЕЛЬНО УЧИТЫВАЙ ЭТО):\n{instructions_about_me}")
    if instructions_response_style:
        parts.append(f"КАК ОТВЕЧАТЬ ПОЛЬЗОВАТЕЛЮ (учитывай стиль, если он не конфликтует с безопасностью и точностью):\n{instructions_response_style}")

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
        api_url = api_url.strip().rstrip("/")
        if not api_url.endswith("/chat/completions"):
            api_url = f"{api_url}/chat/completions" if api_url.endswith("/v1") else f"{api_url}/v1/chat/completions"
        api_key = providers[0].get("key")
    except Exception:
        return []
        
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    payload = {
        "model": EXTRACTION_MODEL,
        "messages": [
            {"role": "system", "content": prompt},
            {"role": "user", "content": f"Пользователь: {user_message}\nАссистент: {assistant_message}"},
        ],
        "temperature": 0.3,
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(api_url, json=payload, headers=headers)
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
