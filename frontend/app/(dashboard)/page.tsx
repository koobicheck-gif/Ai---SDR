"use client";
import { useEffect, useState } from "react";
import { campaignApi, analyticsApi, Campaign, Analytics } from "@/lib/api";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCost, timeAgo } from "@/lib/utils";
import {
  Users, Send, TrendingUp, DollarSign, Target, ArrowRight, Zap,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { STATUS_LABELS } from "@/lib/utils";

const COLORS = ["#7c3aed", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function HomePage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([analyticsApi.get(), campaignApi.list()])
      .then(([a, c]) => { setAnalytics(a); setCampaigns(c); })
      .finally(() => setLoading(false));
  }, []);

  const statusData = analytics
    ? Object.entries(analytics.leads_by_status)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: STATUS_LABELS[k as keyof typeof STATUS_LABELS] || k, value: v }))
    : [];

  const industryData = analytics
    ? Object.entries(analytics.leads_by_industry)
        .sort((a, b) => b[1] - a[1]).slice(0, 8)
        .map(([k, v]) => ({ name: k, count: v }))
    : [];

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Autonomous AI-powered lead generation and outreach</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard title="Total Leads" value={loading ? "—" : analytics?.total_leads ?? 0} icon={Users} color="violet" />
        <StatCard title="Contacted" value={loading ? "—" : analytics?.contacted ?? 0} subtitle={analytics ? `${analytics.response_rate}% response rate` : undefined} icon={Send} color="blue" />
        <StatCard title="Qualified" value={loading ? "—" : analytics?.qualified ?? 0} subtitle={analytics ? `${analytics.qualification_rate}% qual. rate` : undefined} icon={TrendingUp} color="green" />
        <StatCard title="AI Cost" value={loading ? "—" : formatCost(analytics?.total_cost_usd ?? 0)} subtitle={analytics ? `${analytics.total_tokens.toLocaleString()} tokens` : undefined} icon={DollarSign} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-slate-700">Pipeline Status</h2></CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No leads yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(val, name) => [`${val} leads`, name]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><h2 className="text-sm font-semibold text-slate-700">Leads by Industry</h2></CardHeader>
          <CardContent>
            {industryData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No leads yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={industryData} margin={{ left: -20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Recent Campaigns</h2>
            <Link href="/campaigns">
              <Button variant="ghost" size="sm" className="gap-1 text-violet-600">View all <ArrowRight size={14} /></Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center mb-4">
                <Target size={24} className="text-violet-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">No campaigns yet</h3>
              <p className="text-sm text-slate-500 mb-4">Create your first ICP and start generating qualified leads.</p>
              <Link href="/campaigns">
                <Button><Zap size={16} /> Create Campaign</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Campaign", "Leads", "Contacted", "Responded", "Created", ""].map((h) => (
                      <th key={h} className="text-left px-4 sm:px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {campaigns.slice(0, 5).map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 sm:px-6 py-3 font-medium text-slate-900">{c.name}</td>
                      <td className="px-4 sm:px-6 py-3 text-slate-600">{c.lead_count}</td>
                      <td className="px-4 sm:px-6 py-3 text-slate-600">{c.contacted_count}</td>
                      <td className="px-4 sm:px-6 py-3 text-slate-600">{c.responded_count}</td>
                      <td className="px-4 sm:px-6 py-3 text-slate-400 text-xs">{timeAgo(c.created_at)}</td>
                      <td className="px-4 sm:px-6 py-3">
                        <Link href={`/campaigns/${c.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
