from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models.database import get_db, Campaign, Lead, LeadStatus
from models.schemas import CampaignCreate, CampaignResponse
from agents.icp_parser import parse_icp
import uuid
from datetime import datetime

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


@router.get("/", response_model=list[CampaignResponse])
async def list_campaigns(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Campaign).order_by(Campaign.created_at.desc()))
    campaigns = result.scalars().all()

    responses = []
    for c in campaigns:
        counts = await db.execute(
            select(
                func.count(Lead.id).label("total"),
                func.sum((Lead.status == LeadStatus.contacted).cast(int)).label("contacted"),
                func.sum((Lead.status == LeadStatus.responded).cast(int)).label("responded"),
            ).where(Lead.campaign_id == c.id)
        )
        row = counts.first()
        responses.append(
            CampaignResponse(
                id=c.id,
                name=c.name,
                icp_description=c.icp_description,
                icp_parsed=c.icp_parsed or {},
                status=c.status,
                created_at=c.created_at,
                lead_count=row.total or 0,
                contacted_count=row.contacted or 0,
                responded_count=row.responded or 0,
            )
        )
    return responses


@router.post("/", response_model=CampaignResponse)
async def create_campaign(body: CampaignCreate, db: AsyncSession = Depends(get_db)):
    icp_parsed = {}
    try:
        icp_parsed = await parse_icp(body.icp_description)
    except Exception:
        pass  # ICP parsing is best-effort

    campaign = Campaign(
        id=str(uuid.uuid4()),
        name=body.name,
        icp_description=body.icp_description,
        icp_parsed=icp_parsed,
        status="active",
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)

    return CampaignResponse(
        id=campaign.id,
        name=campaign.name,
        icp_description=campaign.icp_description,
        icp_parsed=campaign.icp_parsed or {},
        status=campaign.status,
        created_at=campaign.created_at,
        lead_count=0,
        contacted_count=0,
        responded_count=0,
    )


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(campaign_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    counts = await db.execute(
        select(
            func.count(Lead.id).label("total"),
            func.sum((Lead.status == LeadStatus.contacted).cast(int)).label("contacted"),
            func.sum((Lead.status == LeadStatus.responded).cast(int)).label("responded"),
        ).where(Lead.campaign_id == campaign_id)
    )
    row = counts.first()

    return CampaignResponse(
        id=campaign.id,
        name=campaign.name,
        icp_description=campaign.icp_description,
        icp_parsed=campaign.icp_parsed or {},
        status=campaign.status,
        created_at=campaign.created_at,
        lead_count=row.total or 0,
        contacted_count=row.contacted or 0,
        responded_count=row.responded or 0,
    )


@router.delete("/{campaign_id}")
async def delete_campaign(campaign_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    await db.delete(campaign)
    await db.commit()
    return {"deleted": True}
