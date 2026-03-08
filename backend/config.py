from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # LLM providers
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    openrouter_api_key: Optional[str] = None

    # Search
    tavily_api_key: Optional[str] = None

    # App
    database_url: str = "sqlite+aiosqlite:///./sdr.db"
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    # Default LLM provider: "anthropic" | "openai" | "openrouter"
    default_llm_provider: str = "anthropic"
    default_model: str = "claude-sonnet-4-6"

    class Config:
        env_file = ".env"


settings = Settings()
