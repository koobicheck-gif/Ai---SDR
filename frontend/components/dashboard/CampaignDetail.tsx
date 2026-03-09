"use client";
import { useEffect, useState } from "react";
import { campaignApi, leadApi, Campaign, Lead } from "@/lib/api";
import { LeadsTable } from "@/components/dashboard/LeadsTable";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import {
  ArrowLeft, Zap, RefreshCw, ChevronDown, Users, Send, MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function CampaignDetail({ id }: { id: string }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [count, setCount] = useState(10);
  const [showICP, setShowICP] = useState(false);

  async function load() {
    const [c, l] = await Promise.all([campaignApi.get(id), leadApi.listByCampaign(id)]);
    setCampaign(c);
    setLeads(l);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await leadApi.generate({ campaign_id: id, count, use_mock: true });
      load();
    } catch {
      alert("Lead generation failed — check your API key in Settings.");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  if (!campaign) return <div className="p-8">Campaign not found</div>;

  const icp = campaign.icp_parsed as Record<string, unknown>;

  return (
    <div className="p-8">
      <div className="flex items-start gap-4 mb-6">
        <Link href="/campaigns">
          <Button variant="ghost" size="sm" className="p-2">
            <ArrowLeft size={16} />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">{campaign.name}</h1>
          <p className="mt-1 text-sm text-slate-500 line-clamp-2">{campaign.icp_description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>{n} leads</option>
            ))}
          </select>
          <Button onClick={handleGenerate} loading={generating}>
            <Zap size={15} /> Generate Leads
          </Button>
          <Button variant="outline" onClick={load} className="p-2">
            <RefreshCw size={15} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Leads", value: campaign.lead_count, icon: Users },
          { label: "Contacted", value: campaign.contacted_count, icon: Send },
          { label: "Responded", value: campaign.responded_count, icon: MessageSquare },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-violet-50 flex items-center justify-center">
                  <Icon size={18} className="text-violet-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {Object.keys(icp).length > 0 && !icp.parse_error && (
        <div className="mb-6 rounded-xl border border-violet-200 bg-violet-50 overflow-hidden">
          <button
            onClick={() => setShowICP(!showICP)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-violet-700"
          >
            <span>Parsed ICP Criteria</span>
            <ChevronDown size={16} className={cn("transition-transform", showICP && "rotate-180")} />
          </button>
          {showICP && (
            <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(icp).map(([key, val]) => {
                if (!val || (Array.isArray(val) && val.length === 0)) return null;
                const display = Array.isArray(val) ? (val as string[]).join(", ") : String(val);
                return (
                  <div key={key} className="bg-white rounded-lg p-3 border border-violet-100">
                    <p className="text-xs font-medium text-violet-500 capitalize mb-1">
                      {key.replace(/_/g, " ")}
                    </p>
                    <p className="text-sm text-slate-700 line-clamp-2">{display}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <LeadsTable leads={leads} onRefresh={load} />
    </div>
  );
}
