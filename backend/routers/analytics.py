from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models.database import get_db, Lead, Message, Campaign, LeadStatus
from models.schemas import AnalyticsResponse

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/", response_model=AnalyticsResponse)
async def get_analytics(campaign_id: str = None, db: AsyncSession = Depends(get_db)):
    lead_query = select(Lead)
    msg_query = select(Message)
    if campaign_id:
        lead_query = lead_query.where(Lead.campaign_id == campaign_id)
        msg_query = msg_query.where(Message.campaign_id == campaign_id)

    leads_result = await db.execute(lead_query)
    leads = leads_result.scalars().all()

    msgs_result = await db.execute(msg_query)
    messages = msgs_result.scalars().all()

    total = len(leads)
    contacted = sum(1 for l in leads if l.status in (LeadStatus.contacted, LeadStatus.responded, LeadStatus.qualified))
    responded = sum(1 for l in leads if l.status in (LeadStatus.responded, LeadStatus.qualified))
    qualified = sum(1 for l in leads if l.status == LeadStatus.qualified)

    total_cost = sum(m.cost_usd or 0 for m in messages)
    total_tokens = sum(m.tokens_used or 0 for m in messages)

    # Status breakdown
    status_counts = {}
    for status in LeadStatus:
        status_counts[status.value] = sum(1 for l in leads if l.status == status)

    # Industry breakdown
    industry_counts = {}
    for l in leads:
        ind = l.industry or "Unknown"
        industry_counts[ind] = industry_counts.get(ind, 0) + 1

    # Messages by channel
    channel_counts = {}
    for m in messages:
        ch = m.channel or "unknown"
        channel_counts[ch] = channel_counts.get(ch, 0) + 1

    # Cost by provider
    cost_by_provider = {}
    for m in messages:
        p = m.llm_provider or "unknown"
        cost_by_provider[p] = cost_by_provider.get(p, 0.0) + (m.cost_usd or 0)

    return AnalyticsResponse(
        total_leads=total,
        contacted=contacted,
        responded=responded,
        qualified=qualified,
        response_rate=round(responded / contacted * 100, 1) if contacted > 0 else 0,
        qualification_rate=round(qualified / responded * 100, 1) if responded > 0 else 0,
        total_cost_usd=round(total_cost, 4),
        total_tokens=total_tokens,
        leads_by_status=status_counts,
        leads_by_industry=industry_counts,
        messages_by_channel=channel_counts,
        cost_by_provider={k: round(v, 4) for k, v in cost_by_provider.items()},
    )
