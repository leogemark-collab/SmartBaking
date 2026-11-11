"""Local service settings loaded from the ignored service .env file."""

from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8-sig",
        env_prefix="FORECAST_",
        extra="ignore",
    )

    api_key: SecretStr | None = None
    host: str = "127.0.0.1"
    port: int = Field(default=8001, ge=1, le=65535)
