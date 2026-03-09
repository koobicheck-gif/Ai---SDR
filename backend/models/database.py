from sqlalchemy import Column, String, Integer, Float, DateTime, Text, JSON, Enum as SAEnum, ForeignKey, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.ext.asyncio import async_sessionmaker
from datetime import datetime
import enum
from config import settings


engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class LeadStatus(str, enum.Enum):
    new = "new"
    researching = "researching"
    ready = "ready"
    contacted = "contacted"
    responded = "responded"
    qualified = "qualified"
    disqualified = "disqualified"


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    icp_description = Column(Text, nullable=False)
    icp_parsed = Column(JSON, default={})
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    leads = relationship("Lead", back_populates="campaign", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="campaign", cascade="all, delete-orphan")


class Lead(Base):
    __tablename__ = "leads"

    id = Column(String, primary_key=True)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False)
    name = Column(String, nullable=False)
    title = Column(String)
    company = Column(String)
    company_size = Column(String)
    industry = Column(String)
    location = Column(String)
    email = Column(String)
    linkedin_url = Column(String)
    research_notes = Column(Text)
    pain_points = Column(JSON, default=[])
    status = Column(SAEnum(LeadStatus), default=LeadStatus.new)
    score = Column(Integer, default=0)  # 0-100 ICP match score
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    campaign = relationship("Campaign", back_populates="leads")
    messages = relationship("Message", back_populates="lead", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False)
    lead_id = Column(String, ForeignKey("leads.id"), nullable=False)
    channel = Column(String, default="linkedin")  # linkedin | email | twitter
    type = Column(String, default="outreach")  # outreach | followup | reply
    content = Column(Text, nullable=False)
    subject = Column(String)  # for email
    sent_at = Column(DateTime)
    replied_at = Column(DateTime)
    llm_provider = Column(String)
    llm_model = Column(String)
    tokens_used = Column(Integer, default=0)
    cost_usd = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    campaign = relationship("Campaign", back_populates="messages")
    lead = relationship("Lead", back_populates="messages")


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(String, primary_key=True)
    provider = Column(String, nullable=False)  # anthropic | openai | openrouter | tavily
    key_preview = Column(String)  # last 4 chars only for display
    is_active = Column(String, default="true")
    created_at = Column(DateTime, default=datetime.utcnow)


class AppConfig(Base):
    """Generic key-value store for persisted app configuration (API keys, LLM settings)."""
    __tablename__ = "app_config"

    key = Column(String, primary_key=True)
    value = Column(Text, nullable=True)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # SQLite-safe migration: add app_config table if it didn't exist yet
        # (create_all is idempotent for new tables, so this is handled above)
