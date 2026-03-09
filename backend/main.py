import os
import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import select
from models.database import init_db, AsyncSessionLocal, AppConfig
from routers import campaigns, leads, analytics, settings
from config import settings as app_settings

logger = logging.getLogger(__name__)

ENV_MAP = {
    "anthropic": "ANTHROPIC_API_KEY",
    "openai": "OPENAI_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
    "tavily": "TAVILY_API_KEY",
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    # Restore persisted API keys and LLM config from DB into process environment
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(AppConfig))
        for cfg in result.scalars().all():
            if cfg.value is None:
                continue
            if cfg.key.startswith("api_key."):
                provider = cfg.key.split(".", 1)[1]
                env_var = ENV_MAP.get(provider)
                if env_var:
                    os.environ[env_var] = cfg.value
                    setattr(app_settings, env_var.lower(), cfg.value)
            elif cfg.key == "llm.provider":
                app_settings.default_llm_provider = cfg.value
            elif cfg.key == "llm.model":
                app_settings.default_model = cfg.value
    yield


app = FastAPI(
    title="AI SDR Dashboard API",
    description="Autonomous AI Sales Development Representative",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths exempt from auth (health probe, root info, Swagger UI)
_PUBLIC_PATHS = {"/health", "/", "/docs", "/openapi.json", "/redoc"}


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    """Enforce X-Dashboard-Secret header when DASHBOARD_SECRET env var is set."""
    if app_settings.dashboard_secret:
        # Always allow CORS preflight and public paths through
        if request.method != "OPTIONS" and request.url.path not in _PUBLIC_PATHS:
            secret = request.headers.get("X-Dashboard-Secret", "")
            if secret != app_settings.dashboard_secret:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Unauthorized — invalid or missing dashboard secret"},
                )
    return await call_next(request)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled error on %s %s: %s", request.method, request.url, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
    )


app.include_router(campaigns.router)
app.include_router(leads.router)
app.include_router(analytics.router)
app.include_router(settings.router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/")
async def root():
    return {"message": "AI SDR Dashboard API", "docs": "/docs"}
