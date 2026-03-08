"""
ICP Parser Agent: converts a natural-language ICP description into structured fields.
"""
import json
import re
from agents.llm_router import call_llm

SYSTEM = """You are an expert sales strategist. Parse the given Ideal Customer Profile (ICP) description
into a structured JSON object. Extract as many specific details as possible.

Return ONLY valid JSON with these fields (use null if not mentioned):
{
  "company_sizes": ["1-10", "11-50", "51-200", "201-500", "500+"],  // which sizes apply
  "industries": ["SaaS", "Healthcare", ...],
  "job_titles": ["VP Sales", "Head of Marketing", ...],
  "seniority_levels": ["C-suite", "VP", "Director", "Manager"],
  "pain_points": ["slow lead response", "manual data entry", ...],
  "locations": ["USA", "New York", ...],
  "revenue_range": "1M-10M",
  "tech_stack": ["Salesforce", "HubSpot", ...],
  "buying_signals": ["hiring SDRs", "raised funding", ...],
  "exclusions": ["already uses competitor", ...]
}"""


async def parse_icp(description: str) -> dict:
    """Parse an ICP description into structured fields."""
    messages = [{"role": "user", "content": f"Parse this ICP description:\n\n{description}"}]

    content, provider, model, tokens, cost = await call_llm(
        messages=messages,
        system=SYSTEM,
        max_tokens=512,
    )

    # Extract JSON from response
    try:
        # Try direct parse first
        return json.loads(content)
    except json.JSONDecodeError:
        # Try to extract JSON block
        match = re.search(r'\{.*\}', content, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {"raw": description, "parse_error": True}
