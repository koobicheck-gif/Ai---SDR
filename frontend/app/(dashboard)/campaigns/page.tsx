"use client";
import { useEffect, useState } from "react";
import { campaignApi, Campaign } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { timeAgo } from "@/lib/utils";
import { Plus, Target, Trash2, ArrowRight, Users, Send, MessageSquare, Home } from "lucide-react";
import Link from "next/link";

const TEMPLATES: { name: string; icp: string; icon: string; tag: string }[] = [
  {
    name: "OKC Roofing Leads",
    tag: "Recommended",
    icon: "🏠",
    icp: "Homeowners in Oklahoma City metro area (OKC, Edmond, Moore, Norman, Yukon, Mustang, Choctaw, Midwest City, Del City, Piedmont) whose roof is 10+ years old OR has visible hail/storm damage. Target property owners (not renters), single-family homes and small commercial properties. Pain points: insurance claim navigation, storm damage repair, aging shingles, energy inefficiency, leaks. Buying signals: recent hail event in their zip code, home age 10-20 years, active insurance policy, HOA compliance notices. Exclude: new construction, apartments, properties listed for sale.",
  },
  {
    name: "B2B SaaS SDR Outreach",
    tag: "Popular",
    icon: "💼",
    icp: "B2B SaaS companies with 50-500 employees, VP of Sales or Head of Revenue, struggling with manual lead qualification, using Salesforce, US-based",
  },
  {
    name: "Dental Practice Automation",
    tag: "",
    icon: "🦷",
    icp: "Dental practices with 2+ locations, practice owner or office manager, overwhelmed with scheduling and no-shows, 10-50 staff",
  },
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", icp_description: "" });

  async function load() {
    setLoading(true);
    campaignApi.list().then(setCampaigns).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!form.name || !form.icp_description) return;
    setCreating(true);
    try {
      await campaignApi.create(form);
      setModalOpen(false);
      setForm({ name: "", icp_description: "" });
      load();
    } catch (e) {
      alert("Failed to create campaign");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete campaign "${name}"? This will also delete all leads.`)) return;
    await campaignApi.delete(id);
    load();
  }


  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Campaigns</h1>
          <p className="mt-1 text-sm text-slate-500">Each campaign targets a specific ICP with an AI agent</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> <span className="hidden sm:inline">New Campaign</span><span className="sm:hidden">New</span>
        </Button>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white h-48 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && campaigns.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-5">
            <Target size={32} className="text-violet-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">No campaigns yet</h2>
          <p className="text-sm text-slate-500 max-w-sm mb-6">
            Start with the{" "}
            <span className="font-semibold text-slate-700">OKC Roofing Leads</span>{" "}
            template to find homeowners in the Oklahoma City metro who need a new roof — or
            define your own ICP.
          </p>
          <Button onClick={() => {
            setForm({ name: TEMPLATES[0].name, icp_description: TEMPLATES[0].icp });
            setModalOpen(true);
          }}>
            <Home size={16} /> Start with OKC Roofing
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.map((c) => (
          <Card key={c.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="font-semibold text-slate-900 truncate">{c.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{timeAgo(c.created_at)}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  c.status === "active" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                }`}>
                  {c.status}
                </span>
              </div>

              <p className="text-sm text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                {c.icp_description}
              </p>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { icon: Users, label: "Leads", value: c.lead_count },
                  { icon: Send, label: "Contacted", value: c.contacted_count },
                  { icon: MessageSquare, label: "Responded", value: c.responded_count },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="text-center rounded-lg bg-slate-50 py-2">
                    <p className="text-lg font-bold text-slate-900">{value}</p>
                    <p className="text-xs text-slate-400">{label}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Link href={`/campaigns/${c.id}`} className="flex-1">
                  <Button variant="outline" className="w-full gap-1.5">
                    Open <ArrowRight size={13} />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  onClick={() => handleDelete(c.id, c.name)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="New Campaign"
        description="Define your Ideal Customer Profile to target the right leads"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Campaign Name</label>
            <input
              type="text"
              placeholder="e.g. Q1 SaaS Outreach, Dental Practices NYC"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              ICP Description
              <span className="ml-2 text-xs font-normal text-slate-400">
                The AI will parse this into structured criteria
              </span>
            </label>
            <textarea
              rows={4}
              placeholder="Describe your ideal customer in plain English: company size, industry, job titles, pain points, tech stack, location..."
              value={form.icp_description}
              onChange={(e) => setForm({ ...form, icp_description: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Quick-start templates:</p>
            <div className="space-y-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setForm({ name: t.name, icp_description: t.icp })}
                  className="w-full text-left bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-300 rounded-lg px-3 py-2.5 transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-base leading-none">{t.icon}</span>
                    <span className="text-xs font-semibold text-slate-700 group-hover:text-violet-700">
                      {t.name}
                    </span>
                    {t.tag && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 font-medium">
                        {t.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1 pl-6">{t.icp}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              loading={creating}
              disabled={!form.name || !form.icp_description}
            >
              Create Campaign
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
