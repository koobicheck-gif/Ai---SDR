"use client";
import { useState } from "react";
import { Lead, LeadStatus, leadApi } from "@/lib/api";
import { STATUS_COLORS, STATUS_LABELS, cn, timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Search,
  Microscope,
  Send,
  ChevronDown,
  LinkedinIcon,
  Mail,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { MessagePanel } from "./MessagePanel";

interface LeadsTableProps {
  leads: Lead[];
  onRefresh: () => void;
}

const STATUSES: LeadStatus[] = [
  "new", "researching", "ready", "contacted", "responded", "qualified", "disqualified",
];

export function LeadsTable({ leads, onRefresh }: LeadsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [outreachLead, setOutreachLead] = useState<Lead | null>(null);

  const filtered = leads.filter((l) => {
    const matchSearch =
      !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.company || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.title || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  async function handleResearch(lead: Lead) {
    setLoadingId(lead.id);
    try {
      await leadApi.research({ lead_id: lead.id, use_web_search: false });
      onRefresh();
    } catch (e) {
      alert("Research failed — check your API key in Settings.");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(lead: Lead) {
    if (!confirm(`Delete ${lead.name}?`)) return;
    await leadApi.delete(lead.id);
    onRefresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setStatusFilter("all")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              statusFilter === "all"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            )}
          >
            All ({leads.length})
          </button>
          {STATUSES.map((s) => {
            const count = leads.filter((l) => l.status === s).length;
            if (!count) return null;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  statusFilter === s
                    ? "bg-slate-900 text-white border-slate-900"
                    : STATUS_COLORS[s] + " hover:opacity-80"
                )}
              >
                {STATUS_LABELS[s]} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">
                  Lead
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">
                  Company
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">
                  Score
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">
                  Added
                </th>
                <th className="text-right px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">
                    No leads found. Generate some leads to get started.
                  </td>
                </tr>
              )}
              {filtered.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedLead(lead)}
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{lead.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{lead.title || "—"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-slate-700">{lead.company || "—"}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {[lead.industry, lead.company_size].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <Badge className={STATUS_COLORS[lead.status]}>{STATUS_LABELS[lead.status]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 rounded-full bg-slate-100">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            lead.score >= 80 ? "bg-green-500" : lead.score >= 60 ? "bg-yellow-500" : "bg-red-400"
                          )}
                          style={{ width: `${lead.score}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600">{lead.score}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{timeAgo(lead.created_at)}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {lead.linkedin_url && (
                        <a
                          href={lead.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          title="LinkedIn"
                        >
                          <LinkedinIcon size={14} />
                        </a>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={loadingId === lead.id}
                        onClick={() => handleResearch(lead)}
                        title="Research"
                        className="p-1.5"
                      >
                        <Microscope size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setOutreachLead(lead)}
                        title="Generate Outreach"
                        className="p-1.5"
                      >
                        <Send size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(lead)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead Detail Panel */}
      {selectedLead && (
        <MessagePanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onRefresh={onRefresh}
        />
      )}

      {/* Outreach Modal */}
      {outreachLead && (
        <OutreachModal
          lead={outreachLead}
          onClose={() => setOutreachLead(null)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}

function OutreachModal({
  lead,
  onClose,
  onRefresh,
}: {
  lead: Lead;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [channel, setChannel] = useState<"linkedin" | "email">("linkedin");
  const [tone, setTone] = useState("professional");
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ content: string; subject?: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const msg = await leadApi.generateOutreach({
        lead_id: lead.id,
        channel,
        tone,
        focus: "pain_points",
      });
      setMessage({ content: msg.content, subject: msg.subject });
      onRefresh();
    } catch (e) {
      alert("Failed to generate outreach — check your API key in Settings.");
    } finally {
      setGenerating(false);
    }
  }

  async function copyToClipboard() {
    const text = message?.subject ? `Subject: ${message.subject}\n\n${message.content}` : message?.content || "";
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Generate Outreach</h2>
            <p className="text-sm text-slate-500">{lead.name} · {lead.company}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            ✕
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            {(["linkedin", "email"] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => setChannel(ch)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                  channel === ch
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
              >
                {ch === "linkedin" ? <LinkedinIcon size={15} /> : <Mail size={15} />}
                {ch.charAt(0).toUpperCase() + ch.slice(1)}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="direct">Direct</option>
            </select>
          </div>

          {message && (
            <div className="space-y-2">
              {message.subject && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Subject</p>
                  <p className="text-sm text-slate-800 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                    {message.subject}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Message</p>
                <textarea
                  value={message.content}
                  onChange={(e) => setMessage({ ...message, content: e.target.value })}
                  rows={7}
                  className="w-full text-sm text-slate-800 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            {message && (
              <Button variant="outline" onClick={copyToClipboard}>
                {copied ? "Copied!" : "Copy"}
              </Button>
            )}
            <Button onClick={handleGenerate} loading={generating}>
              {message ? "Regenerate" : "Generate"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
