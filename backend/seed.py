"""
Seed script: pre-populates the database with an OKC Roofing Leads campaign
and 20 realistic homeowner leads across the OKC metro area.

Usage:
    python seed.py

Run this once after starting the backend for the first time.
"""
import asyncio
import uuid
from datetime import datetime
from models.database import init_db, AsyncSessionLocal, Campaign, Lead, LeadStatus

OKC_ROOFING_ICP = (
    "Homeowners in Oklahoma City metro area (OKC, Edmond, Moore, Norman, Yukon, Mustang, "
    "Choctaw, Midwest City, Del City, Piedmont) whose roof is 10+ years old OR has visible "
    "hail/storm damage. Target property owners (not renters), single-family homes and small "
    "commercial properties. Pain points: insurance claim navigation, storm damage repair, aging "
    "shingles, energy inefficiency, leaks. Buying signals: recent hail event in their zip code, "
    "home age 10-20 years, active insurance policy, HOA compliance notices. Exclude: new "
    "construction, apartments, properties listed for sale."
)

OKC_ICP_PARSED = {
    "company_sizes": None,
    "industries": ["Residential Real Estate", "Property Management", "Small Commercial"],
    "job_titles": ["Homeowner", "Property Owner", "Property Manager", "HOA Board Member"],
    "seniority_levels": ["Owner"],
    "pain_points": [
        "hail storm damage from recent OKC storm",
        "aging shingles (10-20 year old roof)",
        "insurance claim navigation",
        "active roof leaks",
        "energy inefficiency from old roofing",
        "HOA compliance letter for roof condition",
    ],
    "locations": [
        "Oklahoma City, OK",
        "Edmond, OK",
        "Moore, OK",
        "Norman, OK",
        "Yukon, OK",
        "Mustang, OK",
        "Midwest City, OK",
        "Choctaw, OK",
        "Del City, OK",
        "Piedmont, OK",
    ],
    "revenue_range": None,
    "tech_stack": None,
    "buying_signals": [
        "recent OKC hail event",
        "home built 2000-2015",
        "homeowner insurance active",
        "HOA compliance notice",
        "neighbor already got new roof",
    ],
    "exclusions": ["renters", "new construction", "listed for sale", "apartments"],
}

# 20 realistic OKC-area homeowner leads
LEADS = [
    {
        "name": "Brad Hutchinson",
        "title": "Homeowner",
        "company": "Hutchinson Residence",
        "company_size": "Single Family",
        "industry": "Residential Real Estate",
        "location": "Edmond, OK 73034",
        "email": "bhutchinson@gmail.com",
        "linkedin_url": "https://linkedin.com/in/brad-hutchinson-okc",
        "pain_points": [
            "roof hail damage from May storm",
            "insurance adjuster scheduled next week",
            "shingles visibly cracked",
        ],
        "score": 95,
    },
    {
        "name": "Tammy Kowalczyk",
        "title": "Homeowner",
        "company": "Kowalczyk Residence",
        "company_size": "Single Family",
        "industry": "Residential Real Estate",
        "location": "Moore, OK 73160",
        "email": "tammy.k@outlook.com",
        "linkedin_url": None,
        "pain_points": [
            "roof is 14 years old",
            "active leak in master bedroom",
            "got insurance quote last month",
        ],
        "score": 91,
    },
    {
        "name": "Derrick Sampson",
        "title": "Homeowner",
        "company": "Sampson Residence",
        "company_size": "Single Family",
        "industry": "Residential Real Estate",
        "location": "Yukon, OK 73099",
        "email": "dsampson82@yahoo.com",
        "linkedin_url": "https://linkedin.com/in/derrick-sampson-yukon",
        "pain_points": [
            "HOA notice for deteriorating roof",
            "home built 2004",
            "three neighbors recently replaced roofs",
        ],
        "score": 88,
    },
    {
        "name": "Lisa Tran",
        "title": "Property Manager",
        "company": "Tran Property Group",
        "company_size": "2-5 properties",
        "industry": "Property Management",
        "location": "Oklahoma City, OK 73112",
        "email": "lisa@tranpropertygroup.com",
        "linkedin_url": "https://linkedin.com/in/lisa-tran-okc-properties",
        "pain_points": [
            "managing 3 rental homes all with aging roofs",
            "tenant complaints about leaks",
            "needs bulk pricing",
        ],
        "score": 93,
    },
    {
        "name": "Mark Okafor",
        "title": "Homeowner",
        "company": "Okafor Residence",
        "company_size": "Single Family",
        "industry": "Residential Real Estate",
        "location": "Norman, OK 73069",
        "email": "mark.okafor@gmail.com",
        "linkedin_url": None,
        "pain_points": [
            "roof damaged in April tornado warning storm",
            "filed insurance claim",
            "waiting for contractor quotes",
        ],
        "score": 97,
    },
    {
        "name": "Carolyn Biggs",
        "title": "Homeowner",
        "company": "Biggs Residence",
        "company_size": "Single Family",
        "industry": "Residential Real Estate",
        "location": "Mustang, OK 73064",
        "email": "cbiggs.mustang@gmail.com",
        "linkedin_url": None,
        "pain_points": [
            "roof 17 years old",
            "high energy bills from poor insulation",
            "seen local roofing ads but hasn't called",
        ],
        "score": 82,
    },
    {
        "name": "Jason Weatherford",
        "title": "Homeowner",
        "company": "Weatherford Residence",
        "company_size": "Single Family",
        "industry": "Residential Real Estate",
        "location": "Choctaw, OK 73020",
        "email": "jweatherford@hotmail.com",
        "linkedin_url": "https://linkedin.com/in/jason-weatherford-choctaw",
        "pain_points": [
            "hail dents visible on gutters and roof",
            "neighbor filed claim and got full replacement",
            "unsure how to navigate insurance",
        ],
        "score": 90,
    },
    {
        "name": "Angela Norris",
        "title": "Homeowner",
        "company": "Norris Residence",
        "company_size": "Single Family",
        "industry": "Residential Real Estate",
        "location": "Midwest City, OK 73130",
        "email": "angela.norris.mwc@gmail.com",
        "linkedin_url": None,
        "pain_points": [
            "roof flashing failing around chimney",
            "water damage in attic",
            "home built 2001",
        ],
        "score": 86,
    },
    {
        "name": "Curtis Beaumont",
        "title": "Homeowner",
        "company": "Beaumont Residence",
        "company_size": "Single Family",
        "industry": "Residential Real Estate",
        "location": "Edmond, OK 73003",
        "email": "c.beaumont.okc@gmail.com",
        "linkedin_url": "https://linkedin.com/in/curtis-beaumont-edmond",
        "pain_points": [
            "roof inspection failed",
            "refinancing home requires roof repair",
            "bank holding up closing",
        ],
        "score": 98,
    },
    {
        "name": "Sandra Patel",
        "title": "Property Owner",
        "company": "Patel Rentals LLC",
        "company_size": "5-10 properties",
        "industry": "Property Management",
        "location": "Oklahoma City, OK 73107",
        "email": "sandra@patelrentals.com",
        "linkedin_url": "https://linkedin.com/in/sandra-patel-okc",
        "pain_points": [
            "portfolio of rental homes needs roof upgrades",
            "insurance renewal threatened by roof age",
            "looking for volume discount contractor",
        ],
        "score": 94,
    },
    {
        "name": "Tyler Grimes",
        "title": "Homeowner",
        "company": "Grimes Residence",
        "company_size": "Single Family",
        "industry": "Residential Real Estate",
        "location": "Yukon, OK 73099",
        "email": "tgrimes.yukon@gmail.com",
        "linkedin_url": None,
        "pain_points": [
            "noticed missing shingles after last storm",
            "DIY patch failed",
            "roof is 11 years old",
        ],
        "score": 83,
    },
    {
        "name": "Renee Calloway",
        "title": "Homeowner",
        "company": "Calloway Residence",
        "company_size": "Single Family",
        "industry": "Residential Real Estate",
        "location": "Del City, OK 73115",
        "email": "reneecalloway2005@yahoo.com",
        "linkedin_url": None,
        "pain_points": [
            "insurance company threatening non-renewal",
            "roof condition letter received",
            "on fixed income, needs financing options",
        ],
        "score": 87,
    },
    {
        "name": "Greg Ashford",
        "title": "Homeowner",
        "company": "Ashford Residence",
        "company_size": "Single Family",
        "industry": "Residential Real Estate",
        "location": "Piedmont, OK 73078",
        "email": "greg.ashford.okc@gmail.com",
        "linkedin_url": "https://linkedin.com/in/greg-ashford-piedmont",
        "pain_points": [
            "storm rolled through Piedmont last month",
            "hail damage on two sides of roof",
            "already has State Farm claim number",
        ],
        "score": 96,
    },
    {
        "name": "Melissa York",
        "title": "Homeowner",
        "company": "York Residence",
        "company_size": "Single Family",
        "industry": "Residential Real Estate",
        "location": "Norman, OK 73072",
        "email": "melissayork.norman@gmail.com",
        "linkedin_url": None,
        "pain_points": [
            "roof 13 years old, starting to look weathered",
            "thinking about selling in 2-3 years",
            "wants to increase home value",
        ],
        "score": 79,
    },
    {
        "name": "Rodney Baptiste",
        "title": "Homeowner",
        "company": "Baptiste Residence",
        "company_size": "Single Family",
        "industry": "Residential Real Estate",
        "location": "Edmond, OK 73025",
        "email": "rbaptiste.edmond@gmail.com",
        "linkedin_url": "https://linkedin.com/in/rodney-baptiste",
        "pain_points": [
            "entire street got new roofs after May hail",
            "his insurance adjuster confirmed damage",
            "needs contractor ASAP",
        ],
        "score": 99,
    },
    {
        "name": "Kim Hartley",
        "title": "HOA Board President",
        "company": "Stonebridge HOA",
        "company_size": "50-unit community",
        "industry": "Small Commercial",
        "location": "Oklahoma City, OK 73142",
        "email": "kim.hartley@stonebridgehoa.org",
        "linkedin_url": "https://linkedin.com/in/kim-hartley-okc-hoa",
        "pain_points": [
            "HOA community roofs need replacement",
            "managing 12 townhome units with aging roofs",
            "needs bonded/insured contractor",
        ],
        "score": 85,
    },
    {
        "name": "Dale Morrison",
        "title": "Homeowner",
        "company": "Morrison Residence",
        "company_size": "Single Family",
        "industry": "Residential Real Estate",
        "location": "Moore, OK 73170",
        "email": "dale.morrison.moore@gmail.com",
        "linkedin_url": None,
        "pain_points": [
            "roof damaged in 2023 Moore storm",
            "insurance claim still open",
            "frustrated with current contractor ghosting",
        ],
        "score": 92,
    },
    {
        "name": "Patricia Dunn",
        "title": "Homeowner",
        "company": "Dunn Residence",
        "company_size": "Single Family",
        "industry": "Residential Real Estate",
        "location": "Mustang, OK 73064",
        "email": "pdunn.mustang@outlook.com",
        "linkedin_url": None,
        "pain_points": [
            "roof 16 years old",
            "quotes from two contractors already",
            "wants one more competitive bid",
        ],
        "score": 88,
    },
    {
        "name": "Anthony Shields",
        "title": "Homeowner",
        "company": "Shields Residence",
        "company_size": "Single Family",
        "industry": "Residential Real Estate",
        "location": "Choctaw, OK 73020",
        "email": "anthony.shields82@gmail.com",
        "linkedin_url": "https://linkedin.com/in/anthony-shields-okc",
        "pain_points": [
            "recent inspection showed granule loss",
            "planning home renovation",
            "roof must be done before interior work starts",
        ],
        "score": 81,
    },
    {
        "name": "Brenda Castillo",
        "title": "Homeowner",
        "company": "Castillo Residence",
        "company_size": "Single Family",
        "industry": "Residential Real Estate",
        "location": "Midwest City, OK 73110",
        "email": "brenda.castillo.mwc@gmail.com",
        "linkedin_url": None,
        "pain_points": [
            "hail storm hit Midwest City zip code last week",
            "saw door hanger from another company",
            "wants multiple quotes",
        ],
        "score": 90,
    },
]


async def seed():
    await init_db()

    async with AsyncSessionLocal() as db:
        # Check if already seeded
        from sqlalchemy import select
        existing = await db.execute(select(Campaign).where(Campaign.name == "OKC Roofing Leads"))
        if existing.scalar_one_or_none():
            print("✓ Already seeded — OKC Roofing Leads campaign exists.")
            return

        # Create campaign
        campaign_id = str(uuid.uuid4())
        campaign = Campaign(
            id=campaign_id,
            name="OKC Roofing Leads",
            icp_description=OKC_ROOFING_ICP,
            icp_parsed=OKC_ICP_PARSED,
            status="active",
            created_at=datetime.utcnow(),
        )
        db.add(campaign)

        # Create leads
        for lead_data in LEADS:
            lead = Lead(
                id=str(uuid.uuid4()),
                campaign_id=campaign_id,
                status=LeadStatus.new,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                **lead_data,
            )
            db.add(lead)

        await db.commit()
        print(f"✓ Seeded OKC Roofing Leads campaign with {len(LEADS)} leads.")
        print(f"  Campaign ID: {campaign_id}")
        print("  Open http://localhost:3000/campaigns to view.")


if __name__ == "__main__":
    asyncio.run(seed())
