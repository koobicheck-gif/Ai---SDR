import axios, { AxiosError } from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// Attach the dashboard secret to every request (stored in localStorage after login)
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const secret = localStorage.getItem("dashboard_secret");
    if (secret && secret !== "__DEMO__") {
      config.headers["X-Dashboard-Secret"] = secret;
    }
  }
  return config;
});

// Surface backend error messages; redirect to /login on 401
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ detail?: string }>) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("dashboard_secret");
      window.location.href = "/login?error=unauthorized";
    }
    if (err.response?.data?.detail) {
      err.message = err.response.data.detail;
    }
    return Promise.reject(err);
  }
);

// Types
export interface Campaign {
  id: string;
  name: string;
  icp_description: string;
  icp_parsed: Record<string, unknown>;
  status: string;
  created_at: string;
  lead_count: number;
  contacted_count: number;
  responded_count: number;
}

export interface Lead {
  id: string;
  campaign_id: string;
  name: string;
  title: string | null;
  company: string | null;
  company_size: string | null;
  industry: string | null;
  location: string | null;
  email: string | null;
  linkedin_url: string | null;
  research_notes: string | null;
  pain_points: string[];
  status: LeadStatus;
  score: number;
  created_at: string;
  updated_at: string;
}

export type LeadStatus =
  | "new"
  | "researching"
  | "ready"
  | "contacted"
  | "responded"
  | "qualified"
  | "disqualified";

export interface Message {
  id: string;
  campaign_id: string;
  lead_id: string;
  channel: string;
  type: string;
  content: string;
  subject: string | null;
  sent_at: string | null;
  replied_at: string | null;
  llm_provider: string | null;
  llm_model: string | null;
  tokens_used: number;
  cost_usd: number;
  created_at: string;
}

export interface Analytics {
  total_leads: number;
  contacted: number;
  responded: number;
  qualified: number;
  response_rate: number;
  qualification_rate: number;
  total_cost_usd: number;
  total_tokens: number;
  leads_by_status: Record<string, number>;
  leads_by_industry: Record<string, number>;
  messages_by_channel: Record<string, number>;
  cost_by_provider: Record<string, number>;
}

// Demo mode: fall back to mock data when backend is unreachable
import {
  MOCK_CAMPAIGNS,
  MOCK_LEADS,
  EDMOND_LEADS,
  ALL_LEADS,
  MOCK_ANALYTICS,
} from "./mockData";

// Only fall back to mock data when the backend is unreachable (network error / timeout).
// When the backend IS reachable but returns an error (4xx/5xx), propagate it so the
// UI can show the real failure instead of silently serving stale mock data.
async function withFallback<T>(apiFn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await apiFn();
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      throw err; // Backend responded — surface the real error
    }
    return fallback; // Network error / backend unreachable — use mock data
  }
}

// API calls
export const campaignApi = {
  list: () =>
    withFallback(() => api.get<Campaign[]>("/campaigns/").then((r) => r.data), MOCK_CAMPAIGNS),
  create: (data: { name: string; icp_description: string }) =>
    api.post<Campaign>("/campaigns/", data).then((r) => r.data),
  get: (id: string) =>
    withFallback(
      () => api.get<Campaign>(`/campaigns/${id}`).then((r) => r.data),
      MOCK_CAMPAIGNS.find((c) => c.id === id) ?? MOCK_CAMPAIGNS[0]
    ),
  delete: (id: string) => api.delete(`/campaigns/${id}`).then((r) => r.data),
};

export const leadApi = {
  listByCampaign: (campaignId: string) =>
    withFallback(
      () => api.get<Lead[]>(`/leads/campaign/${campaignId}`).then((r) => r.data),
      ALL_LEADS.filter((l) => l.campaign_id === campaignId)
    ),
  generate: (data: { campaign_id: string; count: number; use_mock: boolean }) =>
    api.post<Lead[]>("/leads/generate", data).then((r) => r.data),
  research: (data: { lead_id: string; use_web_search: boolean }) =>
    api.post<Lead>("/leads/research", data).then((r) => r.data),
  generateOutreach: (data: {
    lead_id: string;
    channel: string;
    tone: string;
    focus: string;
  }) => api.post<Message>("/leads/outreach", data).then((r) => r.data),
  getMessages: (leadId: string) =>
    withFallback(
      () => api.get<Message[]>(`/leads/${leadId}/messages`).then((r) => r.data),
      [] as Message[]
    ),
  updateStatus: (leadId: string, status: LeadStatus) =>
    api.patch<Lead>(`/leads/${leadId}/status`, { status }).then((r) => r.data),
  delete: (leadId: string) => api.delete(`/leads/${leadId}`).then((r) => r.data),
};

export const analyticsApi = {
  get: (campaignId?: string) =>
    withFallback(
      () =>
        api
          .get<Analytics>("/analytics/", {
            params: campaignId ? { campaign_id: campaignId } : {},
          })
          .then((r) => r.data),
      MOCK_ANALYTICS
    ),
};

export const settingsApi = {
  getApiKeys: () => withFallback(() => api.get("/settings/api-keys").then((r) => r.data), []),
  upsertApiKey: (data: { provider: string; api_key: string }) =>
    api.post("/settings/api-keys", data).then((r) => r.data),
  deleteApiKey: (provider: string) =>
    api.delete(`/settings/api-keys/${provider}`).then((r) => r.data),
  getModels: () =>
    withFallback(() => api.get("/settings/models").then((r) => r.data), {
      anthropic: [
        { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5 (fastest, cheapest)" },
        { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6 (balanced)" },
      ],
      openai: [{ id: "gpt-4o-mini", name: "GPT-4o Mini (cheap)" }],
    }),
  getLLMConfig: () =>
    withFallback(() => api.get("/settings/llm-config").then((r) => r.data), {
      provider: "anthropic",
      model: "claude-sonnet-4-6",
    }),
  setLLMConfig: (data: { provider: string; model: string }) =>
    api.post("/settings/llm-config", data).then((r) => r.data),
};
