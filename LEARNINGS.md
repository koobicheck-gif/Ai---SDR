# Learnings & Development Notes

All architectural decisions, patterns, and lessons captured during the build of the AI SDR Dashboard.

---

## Architecture Decisions

### FastAPI over Flask/Django
- Chosen for native `async/await` support — critical for AI agent workflows that make many I/O-bound calls (LLM API, web search)
- Pydantic models give free request validation and OpenAPI/Swagger docs with zero extra code
- `lifespan` context manager is the cleanest way to run async startup logic (DB init, restoring persisted config)

### SQLite as default, PostgreSQL as upgrade path
- SQLite via `aiosqlite` + `sqlalchemy[asyncio]` works for single-instance deployments (solo operator, small team)
- Stored in a named Docker volume so data survives container rebuilds
- **Gotcha:** SQLite doesn't handle concurrent writes across multiple Uvicorn workers well. Keep `--workers 1` when using SQLite. Swap to `DATABASE_URL=postgresql+asyncpg://...` to scale.

### Multi-LLM router (`llm_router.py`)
- Single `call_llm(prompt, provider, model)` function routes to Anthropic / OpenAI / OpenRouter
- OpenRouter uses the `openai` client with a custom `base_url` — any model reachable through one SDK
- Every call returns `(content, tokens_used, cost_usd)` — plugged straight into the `Message` row for spend visibility
- Default provider/model live in `AppConfig` (DB-persisted) so they survive restarts and don't need a redeploy to change

### AppConfig over environment variables for runtime config
- API keys and LLM preferences written to `AppConfig` table via the Settings UI
- On startup (`lifespan`), those values are reloaded into `os.environ` and the `settings` object
- This means the backend restores its full configuration after a container restart without any manual re-entry of keys

---

## Auth Layer

### Shared-secret header (`X-Dashboard-Secret`)
- Stateless — no sessions, no JWTs, no DB lookups on every request
- Suitable for self-hosted single-tenant tools
- Enabled only when `DASHBOARD_SECRET` env var is set; omitting it disables auth entirely (local dev unchanged)

### Middleware ordering with CORS
- `@app.middleware("http")` decorators in FastAPI are inserted at the **front** of the middleware chain — they run before `CORSMiddleware`
- To avoid blocking CORS preflight requests (`OPTIONS`), the auth middleware explicitly skips `OPTIONS` method
- Public paths (`/health`, `/`, `/docs`, `/openapi.json`, `/redoc`) are also exempt

### Next.js route group `(dashboard)` for layout isolation
- All protected pages moved into `app/(dashboard)/` — a Next.js route group (parentheses in name = transparent URL, no route segment added)
- The group's `layout.tsx` wraps children in `<AuthGate>` + `<Sidebar>`. The login page at `app/login/` sits outside the group so it inherits only the root layout (no sidebar, no auth check)
- This is cleaner than checking `pathname !== "/login"` inside a single root layout

### AuthGate client component
- Must be a `"use client"` component because it reads `localStorage` (SSR has no `window`)
- Returns `null` (renders nothing) until the `useEffect` fires and confirms `dashboard_secret` is present — prevents a flash of protected content
- Redirects to `/login?from=<current-path>` so the user lands back where they came from after login

### Login page flow
1. User enters password → page calls `GET /health` with `X-Dashboard-Secret: <entered>` header
2. `200` → correct (or auth disabled) → store in `localStorage`, redirect
3. `401` → wrong password → show inline error
4. Network error → backend unreachable → store `__DEMO__` marker, enter demo mode

### Demo mode (`__DEMO__` marker)
- Stored in `localStorage` exactly like a real secret, but `api.ts` request interceptor skips attaching it as a header
- Allows GitHub Pages visitors (no backend) to browse the UI with mock/seed data without getting stuck on the login page
- A 401 from a real API call in demo mode would still clear the marker and redirect to login — the only way into demo mode is via the "Continue in Demo Mode" button or a network error on login

---

## GitHub Pages Deployment

### Static export with Next.js App Router
- `output: "export"` in `next.config.ts` generates a fully static `/out` directory
- `GITHUB_PAGES=true` env var at build time activates `basePath` and `trailingSlash` settings
- `generateStaticParams()` in `campaigns/[id]/page.tsx` pre-generates pages for known mock campaign IDs — required because dynamic routes can't be resolved at request time in a static export

### SPA 404 redirect workaround
- GitHub Pages serves a `404.html` for any path that isn't a real file
- Copy `index.html` → `404.html` at build time (GitHub Actions step)
- A small inline script in `<head>` detects the redirect (via `?p=` query param) and calls `history.replaceState` to restore the real URL before React hydrates
- This makes client-side routing work on hard refreshes and direct links

### basePath casing
- GitHub Pages repo name determines the basePath (e.g. `/Ai---SDR`)
- The path is **case-sensitive** — mismatching the repo name casing breaks all asset loads (JS/CSS 404s)
- Always verify: `basePath` in `next.config.ts` must exactly match the GitHub repo name

---

## AI Agent Patterns

### ICP parser
- Takes free-text natural language ("B2B SaaS companies 50-500 employees…") and returns structured JSON
- Uses LLM with a strict JSON-extraction prompt; the structured output drives lead filtering and scoring
- Stored as `icp_parsed` JSON column on the `Campaign` model — parsed once on campaign creation, reused by the lead agent

### Lead research agent
- Enriches a lead with company context, pain points, and an ICP match score (0–100)
- Pain points stored as a JSON array column — renders as tags in the UI
- Research notes stored as free text — displayed in the message panel as context for outreach

### Outreach generator
- Consumes the lead record (name, company, title, pain points, research notes) + campaign ICP
- Generates channel-specific messages (LinkedIn DM, email subject+body, Twitter DM)
- Token usage and cost recorded per `Message` row for analytics

---

## Database Design

### Status enum progression for leads
```
new → researching → ready → contacted → responded → qualified → disqualified
```
- Forward-only by design; state is set explicitly via the API (no automatic transitions)
- The analytics pipeline aggregates by status to show funnel drop-off

### AppConfig key-value table
- Originally had an `ApiKey` model. Replaced with a generic `AppConfig` (key/value) table
- Supports both API keys (`api_key.<provider>`) and LLM config (`llm.provider`, `llm.model`) in one table
- Easier to extend without DB migrations for new config keys

### Cost tracking on messages
- `tokens_used` (int) + `cost_usd` (float) columns on the `Message` model
- `llm_provider` and `llm_model` columns let analytics break down spend by provider
- `calculate_cost()` in `llm_router.py` maps `(provider, model, tokens)` → USD

---

## Frontend Patterns

### `withFallback` API wrapper
- All API calls in `lib/api.ts` go through a wrapper that falls back to mock data on network errors
- This makes the GitHub Pages demo fully functional even with no backend running

### Axios interceptors for auth
- **Request interceptor:** reads `dashboard_secret` from `localStorage`, attaches as `X-Dashboard-Secret` header (skipped if value is `__DEMO__`)
- **Response interceptor:** on `401`, clears `localStorage` and hard-navigates to `/login?error=unauthorized` — ensures any expired/revoked session is cleaned up automatically
- Both interceptors guard `typeof window !== "undefined"` since api.ts can be imported in SSR context

### SSR-safe localStorage access
- `localStorage` is undefined during SSR/SSG. Always guard with `typeof window !== "undefined"` before accessing
- `AuthGate` uses `useEffect` (client-only) for the redirect — avoids hydration mismatch

### Tailwind CSS 4
- No `tailwind.config.js` needed for basic usage — CSS-first configuration
- Custom colors and fonts declared in `globals.css` with `@theme`
- `cn()` utility (clsx + tailwind-merge) used throughout for conditional class composition

---

## Deployment & Docker

### Docker Compose service ordering
- `frontend` depends on `backend` with `condition: service_healthy`
- Backend healthcheck: `curl -f http://localhost:8000/health` every 30s, 3 retries
- Frontend only starts after backend is confirmed healthy — prevents connection errors on cold start

### NEXT_PUBLIC_API_URL baked at build time
- Next.js `NEXT_PUBLIC_*` vars are inlined into the JS bundle during `next build`
- The frontend container's `Dockerfile` accepts `NEXT_PUBLIC_API_URL` as a build `ARG` and sets it as `ENV` before running `next build`
- **Consequence:** changing the backend URL requires a frontend rebuild + redeploy — not runtime-configurable
- For remote servers: set `NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:8000` in `.env` before `docker compose up --build`

### Volume persistence
- `sdr_db` named volume mounts at `/app/data` in the backend container
- SQLite DB path: `sqlite+aiosqlite:////app/data/sdr.db` (four slashes = absolute path)
- Volume survives `docker compose down`; only destroyed with `docker compose down -v`

---

## Known Gotchas

| Issue | Cause | Fix |
|-------|-------|-----|
| SQLite write errors with multiple workers | SQLite has no row-level locking for concurrent writes | Use `--workers 1` with SQLite, or switch to PostgreSQL |
| GitHub Pages 404 on hard refresh | Pages serves 404.html for unknown paths | Copy `index.html` → `404.html`; use 404-redirect script in `<head>` |
| basePath 404 for assets | Case mismatch between `basePath` config and GitHub repo name | Exact-match repo name casing in `next.config.ts` |
| CORS preflight blocked by auth middleware | `@app.middleware` runs before `CORSMiddleware` intercepts OPTIONS | Skip `OPTIONS` method in auth middleware |
| `localStorage is not defined` during SSR | Next.js SSG evaluates client modules server-side | Always guard with `typeof window !== "undefined"` |
| Login page re-redirect loop | AuthGate in layout wraps login page | Use `(dashboard)` route group — login page is outside the group |
| API key not persisted after restart | Keys stored in memory only | Write to `AppConfig` table on save; restore in `lifespan` startup |
| `NEXT_PUBLIC_API_URL` wrong for remote deploy | Defaults to `localhost:8000` | Set correct IP/domain in `.env` before building the frontend container |

---

## Future Considerations

- **PostgreSQL** for multi-user / high-concurrency deployments (swap `DATABASE_URL`)
- **Rate limiting** (e.g. `slowapi`) requires Redis for correctness across multiple workers — in-memory limits are per-process only
- **OAuth / SSO** (GitHub, Google) to replace the shared-secret login for team deployments
- **Background task queue** (Celery + Redis, or FastAPI `BackgroundTasks`) for long-running research/outreach jobs that shouldn't block the HTTP response
- **Webhook callbacks** for async lead enrichment (Tavily searches can be slow)
- **Email sending integration** (SendGrid, Resend) to go from generated messages to actual sends
- **LinkedIn API** (official, approved) to replace manually-copy-pasted outreach
- **Vercel + Railway** for managed cloud deployment without Docker management overhead
