"""DuckDuckGo Search service for AI Web Research mode."""
import asyncio
import logging
from duckduckgo_search import DDGS

logger = logging.getLogger(__name__)

def _sync_search_duckduckgo(query: str, max_results: int = 5) -> list[dict]:
    results: list[dict] = []
    if not query or not query.strip():
        return results

    try:
        ddgs = DDGS()
        raw_results = ddgs.text(query.strip(), max_results=max_results)
        if raw_results:
            for item in raw_results:
                title = item.get("title", "")
                snippet = item.get("body", item.get("snippet", ""))
                link = item.get("href", item.get("link", ""))
                results.append({
                    "title": title,
                    "snippet": snippet,
                    "link": link,
                })
    except Exception as e:
        logger.warning(f"DuckDuckGo search failed for query '{query}': {e}")
        return []

    return results

async def search_duckduckgo(query: str, max_results: int = 5) -> list[dict]:
    if not query or not query.strip():
        return []

    try:
        return await asyncio.to_thread(_sync_search_duckduckgo, query, max_results)
    except Exception as e:
        logger.warning(f"DuckDuckGo search async execution failed for query '{query}': {e}")
        return []

def format_search_results(query: str, results: list[dict]) -> str:
    if not results:
        return ""

    lines = [f"Web Search Results for '{query}':"]
    for idx, item in enumerate(results, start=1):
        title = item.get("title", "No Title")
        snippet = item.get("snippet", "No Snippet")
        link = item.get("link", "")
        lines.append(f"{idx}. {title}: {snippet} ({link})")

    return "\n".join(lines)
