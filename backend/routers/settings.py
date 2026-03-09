import os
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.database import get_db, ApiKey, AppConfig
from pydantic import BaseModel

router = APIRouter(prefix="/settings", tags=["settings"])

ENV_MAP = {
    "anthropic": "ANTHROPIC_API_KEY",
    "openai": "OPENAI_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
    "tavily": "TAVILY_API_KEY",
}


class ApiKeyUpsert(BaseModel):
    provider: str
    api_key: str


class LLMConfig(BaseModel):
    provider: str
    model: str


@router.get("/api-keys")
async def list_api_keys(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ApiKey))
    keys = result.scalars().all()
    return [
        {
            "id": k.id,
            "provider": k.provider,
            "key_preview": k.key_preview,
            "is_active": k.is_active,
            "created_at": k.created_at,
        }
        for k in keys
    ]


@router.post("/api-keys")
async def upsert_api_key(body: ApiKeyUpsert, db: AsyncSession = Depends(get_db)):
    provider = body.provider.lower()
    env_var = ENV_MAP.get(provider)
    if not env_var:
        raise HTTPException(status_code=400, detail=f"Unknown provider '{body.provider}'. Must be one of: {list(ENV_MAP)}")

    # Apply to current process
    os.environ[env_var] = body.api_key
    from config import settings
    setattr(settings, env_var.lower(), body.api_key)

    # Persist full key in AppConfig so it survives restarts
    config_key = f"api_key.{provider}"
    config_result = await db.execute(select(AppConfig).where(AppConfig.key == config_key))
    existing_config = config_result.scalar_one_or_none()
    if existing_config:
        existing_config.value = body.api_key
    else:
        db.add(AppConfig(key=config_key, value=body.api_key))

    # Upsert display preview in ApiKey table
    preview = f"...{body.api_key[-4:]}" if len(body.api_key) > 4 else "****"
    key_result = await db.execute(select(ApiKey).where(ApiKey.provider == body.provider))
    existing_key = key_result.scalar_one_or_none()
    if existing_key:
        existing_key.key_preview = preview
        existing_key.is_active = "true"
    else:
        db.add(ApiKey(id=str(uuid.uuid4()), provider=body.provider, key_preview=preview, is_active="true"))

    await db.commit()
    return {"success": True, "provider": body.provider, "preview": preview}


@router.delete("/api-keys/{provider}")
async def delete_api_key(provider: str, db: AsyncSession = Depends(get_db)):
    provider_lower = provider.lower()

    # Remove display record
    key_result = await db.execute(select(ApiKey).where(ApiKey.provider == provider))
    key = key_result.scalar_one_or_none()
    if key:
        await db.delete(key)

    # Remove persisted full key
    config_key = f"api_key.{provider_lower}"
    config_result = await db.execute(select(AppConfig).where(AppConfig.key == config_key))
    config = config_result.scalar_one_or_none()
    if config:
        await db.delete(config)

    await db.commit()

    # Remove from current process environment
    env_var = ENV_MAP.get(provider_lower)
    if env_var and env_var in os.environ:
        del os.environ[env_var]

    return {"deleted": True}


AVAILABLE_MODELS = {
    "anthropic": [
        {"id": "claude-haiku-4-5-20251001", "name": "Claude Haiku 4.5 (fastest, cheapest)"},
        {"id": "claude-sonnet-4-6", "name": "Claude Sonnet 4.6 (balanced)"},
        {"id": "claude-opus-4-6", "name": "Claude Opus 4.6 (most capable)"},
    ],
    "openai": [
        {"id": "gpt-4o-mini", "name": "GPT-4o Mini (cheap)"},
        {"id": "gpt-4o", "name": "GPT-4o (capable)"},
    ],
    "openrouter": [
        {"id": "anthropic/claude-sonnet-4-6", "name": "Claude Sonnet 4.6 via OpenRouter"},
        {"id": "openai/gpt-4o-mini", "name": "GPT-4o Mini via OpenRouter"},
        {"id": "google/gemini-flash-1.5", "name": "Gemini Flash (cheap)"},
        {"id": "meta-llama/llama-3.3-70b-instruct", "name": "Llama 3.3 70B (open source)"},
    ],
}


@router.get("/models")
async def get_available_models():
    return AVAILABLE_MODELS


@router.post("/llm-config")
async def set_llm_config(body: LLMConfig, db: AsyncSession = Depends(get_db)):
    from config import settings
    settings.default_llm_provider = body.provider
    settings.default_model = body.model

    # Persist to DB
    for key, value in [("llm.provider", body.provider), ("llm.model", body.model)]:
        result = await db.execute(select(AppConfig).where(AppConfig.key == key))
        existing = result.scalar_one_or_none()
        if existing:
            existing.value = value
        else:
            db.add(AppConfig(key=key, value=value))

    await db.commit()
    return {"provider": body.provider, "model": body.model}


@router.get("/llm-config")
async def get_llm_config(db: AsyncSession = Depends(get_db)):
    from config import settings

    provider_result = await db.execute(select(AppConfig).where(AppConfig.key == "llm.provider"))
    model_result = await db.execute(select(AppConfig).where(AppConfig.key == "llm.model"))
    provider_cfg = provider_result.scalar_one_or_none()
    model_cfg = model_result.scalar_one_or_none()

    return {
        "provider": provider_cfg.value if provider_cfg else settings.default_llm_provider,
        "model": model_cfg.value if model_cfg else settings.default_model,
    }
