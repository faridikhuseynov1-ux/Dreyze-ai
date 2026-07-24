"""Unit tests for DuckDuckGo search service."""
import pytest
from unittest.mock import patch, MagicMock
from app.services.search_service import (
    search_duckduckgo,
    format_search_results,
)

@pytest.mark.asyncio
async def test_search_duckduckgo_success():
    mock_ddg_output = [
        {
            "title": "FastAPI Web Framework",
            "body": "High performance Python framework for building APIs.",
            "href": "https://fastapi.tiangolo.com",
        }
    ]
    with patch("app.services.search_service.DDGS") as MockDDGS:
        mock_instance = MagicMock()
        mock_instance.text.return_value = mock_ddg_output
        MockDDGS.return_value = mock_instance

        results = await search_duckduckgo("fastapi python", max_results=1)
        assert len(results) == 1
        assert results[0]["title"] == "FastAPI Web Framework"

@pytest.mark.asyncio
async def test_search_duckduckgo_empty_query():
    results = await search_duckduckgo("")
    assert results == []

@pytest.mark.asyncio
async def test_search_duckduckgo_error_fallback():
    with patch("app.services.search_service.DDGS") as MockDDGS:
        mock_instance = MagicMock()
        mock_instance.text.side_effect = Exception("Rate limit")
        MockDDGS.return_value = mock_instance

        results = await search_duckduckgo("test query")
        assert results == []
