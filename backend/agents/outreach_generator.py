"""
Outreach Generator Agent: crafts personalized cold outreach messages per channel.
"""
import json
import re
from agents.llm_router import call_llm

LINKEDIN_SYSTEM = """You are a world-class B2B SDR who writes highly personalized LinkedIn messages
that get 30%+ response rates. You write like a human, never like a robot or a template.

Rules:
- LinkedIn connection request: max 300 chars, no pitch, just a genuine hook
- LinkedIn message: max 500 chars, one clear value prop, soft CTA
- Never use: "I hope this message finds you well", "I came across your profile", "synergies"
- Always reference something specific about their company/role/background
- End with a low-friction question, not "let me know if you're interested"

Return JSON: {"subject": null, "body": "the message text", "char_count": 123}"""

EMAIL_SYSTEM = """You are a world-class B2B SDR who writes cold emails with 40%+ open rates and
15%+ reply rates. You write like a peer reaching out, not a salesperson.

Rules:
- Subject line: 3-6 words, specific, no spam words, lowercase preferred
- Body: max 150 words, one problem → one solution → one ask
- No paragraphs longer than 2 sentences
- Reference something specific about their company
- Specific CTA: "15-min call Tuesday?" not "let me know if you're interested"

Return JSON: {"subject": "your subject line", "body": "email body text", "word_count": 89}"""


async def generate_outreach(
    lead: dict,
    research: dict,
    channel: str = "linkedin",
    tone: str = "professional",
    focus: str = "pain_points",
) -> tuple[dict, str, str, int, float]:
    """
    Generate a personalized outreach message.
    Returns (message_data, provider, model, tokens, cost).
    """
    system = LINKEDIN_SYSTEM if channel == "linkedin" else EMAIL_SYSTEM

    context = f"""
Lead Profile:
- Name: {lead.get('name')}
- Title: {lead.get('title')}
- Company: {lead.get('company')}
- Industry: {lead.get('industry')}
- Company Size: {lead.get('company_size')}
- Location: {lead.get('location')}

Research:
- Summary: {research.get('research_summary', 'N/A')}
- Company Insights: {json.dumps(research.get('company_insights', []))}
- Pain Points: {json.dumps(research.get('pain_points', lead.get('pain_points', [])))}
- Personalization Hooks: {json.dumps(research.get('personalization_hooks', []))}
- Recent News: {json.dumps(research.get('recent_news', []))}

Tone: {tone}
Focus: {focus}
Channel: {channel}
"""

    messages = [
        {
            "role": "user",
            "content": f"Write a {channel} outreach message for this lead:\n{context}\n\nReturn ONLY valid JSON.",
        }
    ]

    content, provider, model, tokens, cost = await call_llm(
        messages=messages,
        system=system,
        max_tokens=512,
    )

    try:
        content = content.strip()
        if content.startswith("```"):
            content = re.sub(r"```(?:json)?\n?", "", content).strip("` \n")
        data = json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r'\{.*\}', content, re.DOTALL)
        data = json.loads(match.group()) if match else {"body": content}

    return data, provider, model, tokens, cost


async def generate_followup(
    lead: dict,
    original_message: str,
    days_since_contact: int = 3,
    channel: str = "linkedin",
) -> tuple[dict, str, str, int, float]:
    """Generate a follow-up message."""
    system = """You are an expert B2B SDR writing follow-up messages.
Keep it short (< 100 words), add new value, don't guilt-trip.
Return JSON: {"subject": "Re: original subject or null", "body": "followup text"}"""

    messages = [
        {
            "role": "user",
            "content": f"""Write a follow-up message for:
Name: {lead.get('name')}
Company: {lead.get('company')}
Original message: {original_message}
Days since last contact: {days_since_contact}
Channel: {channel}

Return ONLY valid JSON.""",
        }
    ]

    content, provider, model, tokens, cost = await call_llm(
        messages=messages, system=system, max_tokens=256
    )

    try:
        data = json.loads(content.strip())
    except json.JSONDecodeError:
        match = re.search(r'\{.*\}', content, re.DOTALL)
        data = json.loads(match.group()) if match else {"body": content}

    return data, provider, model, tokens, cost
