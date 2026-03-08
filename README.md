# AI SDR Dashboard

Autonomous AI Sales Development Representative — a full-stack tool for AI-powered lead generation and personalized outreach.

## Architecture

```
├── backend/          # FastAPI + Python AI agents
│   ├── agents/       # ICP parser, lead researcher, outreach generator
│   ├── models/       # SQLAlchemy models + Pydantic schemas
│   ├── routers/      # REST API endpoints
│   └── main.py
└── frontend/         # Next.js 14 + Tailwind dashboard
    ├── app/          # Pages: dashboard, campaigns, analytics, settings
    ├── components/   # LeadsTable, MessagePanel, StatCard, etc.
    └── lib/          # API client + utils
```

## Quick Start

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your API keys
uvicorn main:app --reload

# Seed pre-built OKC Roofing Leads campaign (optional, run once)
python seed.py
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open http://localhost:3000

## Features

- **Campaign Management** — define ICP in plain English, AI parses it into structured criteria
- **AI Lead Generation** — generate leads matching your ICP using LLM (mock mode) or web search (Tavily)
- **Lead Research** — AI researches each lead, scores ICP match, identifies pain points
- **Personalized Outreach** — generate hyper-personalized LinkedIn or email messages
- **Analytics Dashboard** — pipeline funnel, response rates, cost tracking
- **Multi-LLM Support** — Claude (Anthropic), GPT (OpenAI), or any model via OpenRouter
- **Cost Tracking** — per-message token and cost logging

## API Keys

Configure in Settings page or via `.env`:

| Provider | Use | Get Key |
|---|---|---|
| Anthropic | Claude models (recommended) | console.anthropic.com |
| OpenAI | GPT models | platform.openai.com |
| OpenRouter | All models via one API | openrouter.ai |
| Tavily | Web search for lead research | tavily.com |

## Ethical Note

- LinkedIn automation may violate their ToS — use generated messages manually
- Always respect CAN-SPAM, GDPR, and CASL regulations
- This tool is for authorized, legitimate sales outreach only

## Deploy

```bash
# Docker Compose
cp .env.example .env  # add API keys
docker-compose up -d
```

Deploy backend to **Railway** or **Render**, frontend to **Vercel**.
