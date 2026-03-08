import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

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

// API calls
export const campaignApi = {
  list: () => api.get<Campaign[]>("/campaigns/").then((r) => r.data),
  create: (data: { name: string; icp_description: string }) =>
    api.post<Campaign>("/campaigns/", data).then((r) => r.data),
  get: (id: string) => api.get<Campaign>(`/campaigns/${id}`).then((r) => r.data),
  delete: (id: string) => api.delete(`/campaigns/${id}`).then((r) => r.data),
};

export const leadApi = {
  listByCampaign: (campaignId: string) =>
    api.get<Lead[]>(`/leads/campaign/${campaignId}`).then((r) => r.data),
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
    api.get<Message[]>(`/leads/${leadId}/messages`).then((r) => r.data),
  updateStatus: (leadId: string, status: LeadStatus) =>
    api.patch<Lead>(`/leads/${leadId}/status`, { status }).then((r) => r.data),
  delete: (leadId: string) => api.delete(`/leads/${leadId}`).then((r) => r.data),
};

export const analyticsApi = {
  get: (campaignId?: string) =>
    api
      .get<Analytics>("/analytics/", {
        params: campaignId ? { campaign_id: campaignId } : {},
      })
      .then((r) => r.data),
};

export const settingsApi = {
  getApiKeys: () => api.get("/settings/api-keys").then((r) => r.data),
  upsertApiKey: (data: { provider: string; api_key: string }) =>
    api.post("/settings/api-keys", data).then((r) => r.data),
  deleteApiKey: (provider: string) =>
    api.delete(`/settings/api-keys/${provider}`).then((r) => r.data),
  getModels: () => api.get("/settings/models").then((r) => r.data),
  getLLMConfig: () => api.get("/settings/llm-config").then((r) => r.data),
  setLLMConfig: (data: { provider: string; model: string }) =>
    api.post("/settings/llm-config", data).then((r) => r.data),
};
