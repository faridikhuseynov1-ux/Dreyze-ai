import json
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    # Database
    DATABASE_URL: str

    # JWT
    JWT_SECRET_KEY: str
    JWT_REFRESH_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    FRONTEND_URL: str = "https://dreyzfarid.online"
    ALLOWED_ORIGINS: str = "https://dreyzfarid.online"

    # Email
    RESEND_API_KEY: str
    EMAIL_FROM: str
    EMAIL_DELIVERY_REQUIRED: bool = False

    # AI
    OPENROUTER_API_KEY: str | None = None
    OPENROUTER_API_KEY_FALLBACK_1: str | None = None
    OPENROUTER_API_KEY_FALLBACK_2: str | None = None
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    AI_PROVIDERS: str = "[]"
    ANYMODEL_API_KEY: str | None = None
    ANYMODEL_BASE_URL: str = "https://anymodel.org/v1"

    # Uploads
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_MB: int = 20

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def ai_providers_list(self) -> list[dict[str, str]]:
        if not self.AI_PROVIDERS:
            return []
        try:
            providers = json.loads(self.AI_PROVIDERS)
        except json.JSONDecodeError:
            return []
        return [provider for provider in providers if provider.get("url") and provider.get("key")]

    @property
    def ai_base_url(self) -> str:
        providers = self.ai_providers_list
        if providers and not self.OPENROUTER_API_KEY:
            return providers[0]["url"].rstrip("/")
        return self.OPENROUTER_BASE_URL.rstrip("/")

    @property
    def ai_api_keys(self) -> list[str]:
        keys = [
            self.OPENROUTER_API_KEY,
            self.OPENROUTER_API_KEY_FALLBACK_1,
            self.OPENROUTER_API_KEY_FALLBACK_2,
        ]
        keys.extend(provider["key"] for provider in self.ai_providers_list)
        return [key for key in keys if key]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
