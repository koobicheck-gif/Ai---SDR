from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
from models.database import LeadStatus


# Campaign schemas
class CampaignCreate(BaseModel):
    name: str
    icp_description: str


class CampaignResponse(BaseModel):
    id: str
    name: str
    icp_description: str
    icp_parsed: dict
    status: str
    created_at: datetime
    lead_count: int = 0
    contacted_count: int = 0
    responded_count: int = 0

    class Config:
        from_attributes = True


# Lead schemas
class LeadCreate(BaseModel):
    campaign_id: str
    name: str
    title: Optional[str] = None
    company: Optional[str] = None
    company_size: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    email: Optional[str] = None
    linkedin_url: Optional[str] = None


class LeadResponse(BaseModel):
    id: str
    campaign_id: str
    name: str
    title: Optional[str]
    company: Optional[str]
    company_size: Optional[str]
    industry: Optional[str]
    location: Optional[str]
    email: Optional[str]
    linkedin_url: Optional[str]
    research_notes: Optional[str]
    pain_points: List[str]
    status: LeadStatus
    score: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LeadStatusUpdate(BaseModel):
    status: LeadStatus


# Message schemas
class MessageResponse(BaseModel):
    id: str
    campaign_id: str
    lead_id: str
    channel: str
    type: str
    content: str
    subject: Optional[str]
    sent_at: Optional[datetime]
    replied_at: Optional[datetime]
    llm_provider: Optional[str]
    llm_model: Optional[str]
    tokens_used: int
    cost_usd: float
    created_at: datetime

    class Config:
        from_attributes = True


# Agent request schemas
class ResearchLeadRequest(BaseModel):
    lead_id: str
    use_web_search: bool = False


class GenerateOutreachRequest(BaseModel):
    lead_id: str
    channel: str = "linkedin"
    tone: str = "professional"  # professional | casual | direct
    focus: str = "pain_points"  # pain_points | achievements | mutual


class GenerateLeadsRequest(BaseModel):
    campaign_id: str
    count: int = 10
    use_mock: bool = True  # use mock data if no search API


class ICPParseRequest(BaseModel):
    description: str


# Analytics schemas
class AnalyticsResponse(BaseModel):
    total_leads: int
    contacted: int
    responded: int
    qualified: int
    response_rate: float
    qualification_rate: float
    total_cost_usd: float
    total_tokens: int
    leads_by_status: dict
    leads_by_industry: dict
    messages_by_channel: dict
    cost_by_provider: dict
