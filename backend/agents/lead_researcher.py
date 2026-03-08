"""
Lead Researcher Agent: researches a lead using web search (Tavily) or generates
a plausible research profile via LLM when no search API is available.
"""
import json
import re
from typing import Optional
from agents.llm_router import call_llm
from config import settings

RESEARCH_SYSTEM = """You are an elite B2B sales researcher. Given a lead's basic info and their company's
Ideal Customer Profile criteria, write a concise research brief that a salesperson could use
to send a hyper-personalized outreach message.

Return JSON with:
{
  "research_summary": "2-3 sentence summary of the person and company",
  "company_insights": ["insight 1", "insight 2", "insight 3"],
  "pain_points": ["specific pain point 1", "specific pain point 2"],
  "recent_news": ["any notable recent events or signals"],
  "personalization_hooks": ["hook 1 based on their background", "hook 2 based on company"],
  "icp_match_score": 85,
  "icp_match_reasons": ["reason 1", "reason 2"]
}"""

MOCK_LEADS_SYSTEM = """You are a B2B sales database. Generate realistic lead profiles matching the
given Ideal Customer Profile. Each lead should be a real-seeming business professional.

Return a JSON array of leads with these fields:
[{
  "name": "Full Name",
  "title": "Job Title",
  "company": "Company Name",
  "company_size": "51-200",
  "industry": "SaaS",
  "location": "San Francisco, CA",
  "email": "firstname@company.com",
  "linkedin_url": "https://linkedin.com/in/firstname-lastname",
  "pain_points": ["pain point 1", "pain point 2"]
}]"""


async def research_lead(
    lead_name: str,
    lead_title: Optional[str],
    lead_company: Optional[str],
    icp_criteria: dict,
    use_web_search: bool = False,
) -> tuple[dict, str, str, int, float]:
    """
    Research a lead. Returns (research_data, provider, model, tokens, cost).
    """
    context = f"""
Lead: {lead_name}
Title: {lead_title or 'Unknown'}
Company: {lead_company or 'Unknown'}

ICP Criteria:
{json.dumps(icp_criteria, indent=2)}
"""

    if use_web_search and settings.tavily_api_key:
        search_results = await _tavily_search(f"{lead_name} {lead_company} {lead_title}")
        context += f"\n\nWeb Search Results:\n{search_results}"

    messages = [{"role": "user", "content": f"Research this lead:\n{context}"}]

    content, provider, model, tokens, cost = await call_llm(
        messages=messages,
        system=RESEARCH_SYSTEM,
        max_tokens=768,
    )

    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r'\{.*\}', content, re.DOTALL)
        data = json.loads(match.group()) if match else {"research_summary": content}

    return data, provider, model, tokens, cost


async def generate_mock_leads(icp_description: str, icp_parsed: dict, count: int = 10) -> list[dict]:
    """Generate mock leads matching the ICP (no external API needed)."""
    messages = [
        {
            "role": "user",
            "content": f"""Generate {count} realistic B2B leads matching this ICP:

Description: {icp_description}

Parsed criteria: {json.dumps(icp_parsed, indent=2)}

Make them diverse in company size, location, and title while staying within the ICP.
Return ONLY a valid JSON array.""",
        }
    ]

    content, provider, model, tokens, cost = await call_llm(
        messages=messages,
        system=MOCK_LEADS_SYSTEM,
        max_tokens=2048,
    )

    try:
        # Clean up response
        content = content.strip()
        if content.startswith("```"):
            content = re.sub(r"```(?:json)?\n?", "", content).strip("` \n")
        return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r'\[.*\]', content, re.DOTALL)
        if match:
            return json.loads(match.group())
        return []


async def _tavily_search(query: str) -> str:
    """Search using Tavily API."""
    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=settings.tavily_api_key)
        results = client.search(query=query, max_results=3)
        snippets = [r.get("content", "") for r in results.get("results", [])]
        return "\n\n".join(snippets[:3])
    except Exception as e:
        return f"Search unavailable: {str(e)}"
