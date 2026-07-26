import asyncio
import html
import logging
import re
from html.parser import HTMLParser
from urllib.parse import urlparse

import httpx
from duckduckgo_search import DDGS

logger = logging.getLogger(__name__)

MAX_PAGE_CHARS = 7000
MAX_READ_PAGES = 3
URL_RE = re.compile(r"https?://[^\s<>)\]}\"']+", re.IGNORECASE)


class ReadableHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.skip_depth = 0
        self.title_parts: list[str] = []
        self.meta_description = ""
        self.text_parts: list[str] = []
        self._in_title = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        if tag in {"script", "style", "noscript", "svg", "canvas", "iframe"}:
            self.skip_depth += 1
            return
        if tag == "title":
            self._in_title = True
            return
        if tag == "meta":
            attr_map = {name.lower(): value or "" for name, value in attrs}
            name = attr_map.get("name", "").lower()
            prop = attr_map.get("property", "").lower()
            if name == "description" or prop == "og:description":
                self.meta_description = attr_map.get("content", "")[:500]
        if tag in {"p", "br", "li", "h1", "h2", "h3", "tr", "div", "section", "article"}:
            self.text_parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in {"script", "style", "noscript", "svg", "canvas", "iframe"} and self.skip_depth:
            self.skip_depth -= 1
        if tag == "title":
            self._in_title = False

    def handle_data(self, data: str) -> None:
        if self.skip_depth:
            return
        text = data.strip()
        if not text:
            return
        if self._in_title:
            self.title_parts.append(text)
        else:
            self.text_parts.append(text)


def extract_urls(text: str) -> list[str]:
    urls: list[str] = []
    for match in URL_RE.findall(text or ""):
        url = match.rstrip(".,;:!?")
        parsed = urlparse(url)
        if parsed.scheme in {"http", "https"} and parsed.netloc and url not in urls:
            urls.append(url)
    return urls


def _normalize_text(text: str) -> str:
    text = html.unescape(text)
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


async def read_web_page(url: str, max_chars: int = MAX_PAGE_CHARS) -> dict | None:
    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(connect=6, read=12, write=6, pool=6),
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; DreyzeAI/1.0; +https://dreyzfarid.online)",
                "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.4",
            },
        ) as client:
            response = await client.get(url)
            response.raise_for_status()
    except Exception as e:
        logger.warning("Failed to fetch page %s: %s", url, e)
        return None

    content_type = response.headers.get("content-type", "").split(";")[0].lower()
    raw_text = response.text
    if content_type == "text/plain":
        title = url
        description = ""
        text = _normalize_text(raw_text)
    else:
        parser = ReadableHTMLParser()
        try:
            parser.feed(raw_text)
        except Exception:
            logger.warning("Failed to parse page %s", url)
        title = _normalize_text(" ".join(parser.title_parts)) or url
        description = _normalize_text(parser.meta_description)
        text = _normalize_text(" ".join(parser.text_parts))

    if not text and not description:
        return None
    if len(text) > max_chars:
        text = f"{text[:max_chars]}\n\n[Страница обрезана до {max_chars} символов.]"
    return {"url": str(response.url), "title": title[:300], "description": description, "text": text}


async def read_pages(urls: list[str], max_pages: int = MAX_READ_PAGES) -> list[dict]:
    tasks = [read_web_page(url) for url in urls[:max_pages]]
    pages = await asyncio.gather(*tasks, return_exceptions=True)
    return [page for page in pages if isinstance(page, dict)]


def format_read_pages(pages: list[dict]) -> str:
    if not pages:
        return ""
    blocks = []
    for idx, page in enumerate(pages, start=1):
        description = f"\nОписание: {page['description']}" if page.get("description") else ""
        blocks.append(
            f"[Страница {idx}]\nURL: {page['url']}\nЗаголовок: {page['title']}{description}\nТекст:\n{page['text']}"
        )
    return "\n\n".join(blocks)


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
