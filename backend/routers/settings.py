from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.database import get_db, ApiKey
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter(prefix="/settings", tags=["settings"])


class ApiKeyUpsert(BaseModel):
    provider: str  # anthropic | openai | openrouter | tavily
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
    # Store in environment (in-memory for this session) and DB preview
    import os
    env_map = {
        "anthropic": "ANTHROPIC_API_KEY",
        "openai": "OPENAI_API_KEY",
        "openrouter": "OPENROUTER_API_KEY",
        "tavily": "TAVILY_API_KEY",
    }
    env_var = env_map.get(body.provider.lower())
    if env_var:
        os.environ[env_var] = body.api_key
        # Also update settings
        from config import settings
        setattr(settings, env_var.lower(), body.api_key)

    # Upsert preview in DB
    result = await db.execute(select(ApiKey).where(ApiKey.provider == body.provider))
    existing = result.scalar_one_or_none()

    preview = f"...{body.api_key[-4:]}" if len(body.api_key) > 4 else "****"

    if existing:
        existing.key_preview = preview
        existing.is_active = "true"
    else:
        db.add(ApiKey(
            id=str(uuid.uuid4()),
            provider=body.provider,
            key_preview=preview,
            is_active="true",
        ))

    await db.commit()
    return {"success": True, "provider": body.provider, "preview": preview}


@router.delete("/api-keys/{provider}")
async def delete_api_key(provider: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ApiKey).where(ApiKey.provider == provider))
    key = result.scalar_one_or_none()
    if key:
        await db.delete(key)
        await db.commit()
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
async def set_llm_config(body: LLMConfig):
    from config import settings
    settings.default_llm_provider = body.provider
    settings.default_model = body.model
    return {"provider": body.provider, "model": body.model}


@router.get("/llm-config")
async def get_llm_config():
    from config import settings
    return {"provider": settings.default_llm_provider, "model": settings.default_model}
