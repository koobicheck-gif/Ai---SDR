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

    # CORS: comma-separated list of allowed origins.
    # Example: "http://localhost:3000,https://yourdomain.com"
    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    # Dashboard auth secret. If set, every API request must include:
    #   X-Dashboard-Secret: <value>
    # Leave unset to disable auth (fine for local dev behind firewall).
    dashboard_secret: Optional[str] = None

    # Default LLM provider: "anthropic" | "openai" | "openrouter"
    default_llm_provider: str = "anthropic"
    default_model: str = "claude-sonnet-4-6"

    class Config:
        env_file = ".env"

    def get_cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
