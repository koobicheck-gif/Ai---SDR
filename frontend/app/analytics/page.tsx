"use client";
import { useEffect, useState } from "react";
import { analyticsApi, campaignApi, Analytics, Campaign } from "@/lib/api";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { formatCost, STATUS_LABELS } from "@/lib/utils";
import {
  Users, Send, TrendingUp, DollarSign, Zap, Target,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";

const COLORS = ["#7c3aed", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [loading, setLoading] = useState(true);

  async function load(campaignId?: string) {
    setLoading(true);
    const [a, c] = await Promise.all([
      analyticsApi.get(campaignId || undefined),
      campaignApi.list(),
    ]);
    setAnalytics(a);
    setCampaigns(c);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const statusData = analytics
    ? Object.entries(analytics.leads_by_status)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: STATUS_LABELS[k as keyof typeof STATUS_LABELS] || k, value: v }))
    : [];

  const industryData = analytics
    ? Object.entries(analytics.leads_by_industry)
        .sort((a, b) => b[1] - a[1]).slice(0, 10)
        .map(([k, v]) => ({ industry: k, leads: v }))
    : [];

  const channelData = analytics
    ? Object.entries(analytics.messages_by_channel)
        .map(([k, v]) => ({ name: k, messages: v }))
    : [];

  const costData = analytics
    ? Object.entries(analytics.cost_by_provider)
        .map(([k, v]) => ({ provider: k, cost: v }))
    : [];

  const funnelData = analytics
    ? [
        { stage: "Total", count: analytics.total_leads },
        { stage: "Contacted", count: analytics.contacted },
        { stage: "Responded", count: analytics.responded },
        { stage: "Qualified", count: analytics.qualified },
      ]
    : [];

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Performance metrics across campaigns</p>
        </div>
        <select
          value={selectedCampaign}
          onChange={(e) => {
            setSelectedCampaign(e.target.value);
            load(e.target.value || undefined);
          }}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
        >
          <option value="">All Campaigns</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard title="Total Leads" value={loading ? "—" : analytics?.total_leads ?? 0} icon={Users} color="violet" />
        <StatCard
          title="Response Rate"
          value={loading ? "—" : `${analytics?.response_rate ?? 0}%`}
          subtitle={analytics ? `${analytics.responded} responded` : undefined}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Qualification Rate"
          value={loading ? "—" : `${analytics?.qualification_rate ?? 0}%`}
          subtitle={analytics ? `${analytics.qualified} qualified` : undefined}
          icon={Target}
          color="blue"
        />
        <StatCard
          title="Total AI Cost"
          value={loading ? "—" : formatCost(analytics?.total_cost_usd ?? 0)}
          subtitle={analytics ? `${analytics.total_tokens.toLocaleString()} tokens` : undefined}
          icon={DollarSign}
          color="orange"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Funnel */}
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-slate-700">Sales Funnel</h2></CardHeader>
          <CardContent>
            {funnelData.every((d) => d.count === 0) ? (
              <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={funnelData} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 12 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status Pie */}
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-slate-700">Lead Status Distribution</h2></CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No data</div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-full sm:w-[60%] shrink-0">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">
                        {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5">
                  {statusData.map((s, i) => (
                    <div key={s.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-xs text-slate-600">{s.name}</span>
                      </div>
                      <span className="text-xs font-medium text-slate-900">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Industry */}
        <Card className="lg:col-span-2">
          <CardHeader><h2 className="text-sm font-semibold text-slate-700">Leads by Industry</h2></CardHeader>
          <CardContent>
            {industryData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={industryData} margin={{ left: -20 }}>
                  <XAxis dataKey="industry" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Cost by Provider */}
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-slate-700">Cost by Provider</h2></CardHeader>
          <CardContent>
            {costData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No AI calls yet</div>
            ) : (
              <div className="space-y-3">
                {costData.map((d, i) => (
                  <div key={d.provider}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-600 capitalize">{d.provider}</span>
                      <span className="text-xs text-slate-900 font-medium">{formatCost(d.cost)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(d.cost / Math.max(...costData.map((x) => x.cost))) * 100}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Total</span>
                    <span className="font-semibold text-slate-900">
                      {formatCost(analytics?.total_cost_usd ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
