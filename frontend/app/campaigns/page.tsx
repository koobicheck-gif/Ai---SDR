"use client";
import { useEffect, useState } from "react";
import { campaignApi, Campaign } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { timeAgo } from "@/lib/utils";
import { Plus, Target, Trash2, ArrowRight, Users, Send, MessageSquare } from "lucide-react";
import Link from "next/link";

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

  const ICP_EXAMPLES = [
    "B2B SaaS companies with 50-500 employees, VP of Sales or Head of Revenue, struggling with manual lead qualification, using Salesforce, US-based",
    "Dental practices with 2+ locations, practice owner or office manager, overwhelmed with scheduling and no-shows, 10-50 staff",
    "Real estate agencies with 5-20 agents, broker/owner, losing leads because of slow follow-up, operating in Southeast US",
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campaigns</h1>
          <p className="mt-1 text-sm text-slate-500">Each campaign targets a specific ICP with an AI agent</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> New Campaign
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
            Define your Ideal Customer Profile and let the AI find and engage matching leads.
          </p>
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Create your first campaign
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
            <p className="text-xs font-medium text-slate-500 mb-2">Examples:</p>
            <div className="space-y-2">
              {ICP_EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setForm({ ...form, icp_description: ex })}
                  className="w-full text-left text-xs text-slate-500 hover:text-violet-600 bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-200 rounded-lg px-3 py-2 transition-colors"
                >
                  {ex}
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
