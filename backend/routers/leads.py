from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.database import get_db, Lead, Message, Campaign, LeadStatus
from models.schemas import (
    LeadCreate, LeadResponse, LeadStatusUpdate, MessageResponse,
    ResearchLeadRequest, GenerateOutreachRequest, GenerateLeadsRequest,
)
from agents.lead_researcher import research_lead, generate_mock_leads
from agents.outreach_generator import generate_outreach
import uuid
from datetime import datetime

router = APIRouter(prefix="/leads", tags=["leads"])


@router.get("/campaign/{campaign_id}", response_model=list[LeadResponse])
async def list_leads(campaign_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Lead).where(Lead.campaign_id == campaign_id).order_by(Lead.score.desc(), Lead.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=LeadResponse)
async def create_lead(body: LeadCreate, db: AsyncSession = Depends(get_db)):
    lead = Lead(id=str(uuid.uuid4()), **body.model_dump())
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return lead


@router.patch("/{lead_id}/status", response_model=LeadResponse)
async def update_lead_status(lead_id: str, body: LeadStatusUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead.status = body.status
    lead.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(lead)
    return lead


@router.delete("/{lead_id}")
async def delete_lead(lead_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    await db.delete(lead)
    await db.commit()
    return {"deleted": True}


@router.post("/generate", response_model=list[LeadResponse])
async def generate_leads(body: GenerateLeadsRequest, db: AsyncSession = Depends(get_db)):
    """Generate leads matching ICP using LLM (mock mode) or web search."""
    result = await db.execute(select(Campaign).where(Campaign.id == body.campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    raw_leads = await generate_mock_leads(
        icp_description=campaign.icp_description,
        icp_parsed=campaign.icp_parsed or {},
        count=body.count,
    )

    created = []
    for raw in raw_leads:
        lead = Lead(
            id=str(uuid.uuid4()),
            campaign_id=body.campaign_id,
            name=raw.get("name", "Unknown"),
            title=raw.get("title"),
            company=raw.get("company"),
            company_size=raw.get("company_size"),
            industry=raw.get("industry"),
            location=raw.get("location"),
            email=raw.get("email"),
            linkedin_url=raw.get("linkedin_url"),
            pain_points=raw.get("pain_points", []),
            status=LeadStatus.new,
            score=raw.get("icp_match_score", 70),
        )
        db.add(lead)
        created.append(lead)

    await db.commit()
    for lead in created:
        await db.refresh(lead)
    return created


@router.post("/research", response_model=LeadResponse)
async def research_lead_endpoint(body: ResearchLeadRequest, db: AsyncSession = Depends(get_db)):
    """Research a lead using LLM + optional web search."""
    result = await db.execute(select(Lead).where(Lead.id == body.lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Get campaign ICP
    camp_result = await db.execute(select(Campaign).where(Campaign.id == lead.campaign_id))
    campaign = camp_result.scalar_one_or_none()
    icp = campaign.icp_parsed if campaign else {}

    # Run research
    lead.status = LeadStatus.researching
    await db.commit()

    research_data, provider, model, tokens, cost = await research_lead(
        lead_name=lead.name,
        lead_title=lead.title,
        lead_company=lead.company,
        icp_criteria=icp,
        use_web_search=body.use_web_search,
    )

    lead.research_notes = research_data.get("research_summary", "")
    lead.pain_points = research_data.get("pain_points", lead.pain_points or [])
    lead.score = research_data.get("icp_match_score", lead.score)
    lead.status = LeadStatus.ready
    lead.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(lead)
    return lead


@router.post("/outreach", response_model=MessageResponse)
async def generate_outreach_endpoint(body: GenerateOutreachRequest, db: AsyncSession = Depends(get_db)):
    """Generate a personalized outreach message for a lead."""
    result = await db.execute(select(Lead).where(Lead.id == body.lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    research = {
        "research_summary": lead.research_notes or "",
        "pain_points": lead.pain_points or [],
        "personalization_hooks": [],
        "company_insights": [],
        "recent_news": [],
    }

    lead_dict = {
        "name": lead.name,
        "title": lead.title,
        "company": lead.company,
        "industry": lead.industry,
        "company_size": lead.company_size,
        "location": lead.location,
        "pain_points": lead.pain_points or [],
    }

    msg_data, provider, model, tokens, cost = await generate_outreach(
        lead=lead_dict,
        research=research,
        channel=body.channel,
        tone=body.tone,
        focus=body.focus,
    )

    message = Message(
        id=str(uuid.uuid4()),
        campaign_id=lead.campaign_id,
        lead_id=lead.id,
        channel=body.channel,
        type="outreach",
        content=msg_data.get("body", ""),
        subject=msg_data.get("subject"),
        llm_provider=provider,
        llm_model=model,
        tokens_used=tokens,
        cost_usd=cost,
    )
    db.add(message)

    if lead.status in (LeadStatus.new, LeadStatus.ready, LeadStatus.researching):
        lead.status = LeadStatus.contacted
        lead.sent_at = datetime.utcnow() if hasattr(lead, "sent_at") else None
        lead.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(message)
    return message


@router.get("/{lead_id}/messages", response_model=list[MessageResponse])
async def get_lead_messages(lead_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Message).where(Message.lead_id == lead_id).order_by(Message.created_at)
    )
    return result.scalars().all()
