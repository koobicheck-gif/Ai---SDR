"use client";
import { useState, useEffect } from "react";
import { Lead, Message, leadApi } from "@/lib/api";
import { STATUS_COLORS, STATUS_LABELS, cn, timeAgo, formatCost } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { X, MessageSquare, Linkedin, Mail, Bot } from "lucide-react";
import { LeadStatus } from "@/lib/api";

interface MessagePanelProps {
  lead: Lead;
  onClose: () => void;
  onRefresh: () => void;
}

const STATUS_OPTIONS: LeadStatus[] = [
  "new", "researching", "ready", "contacted", "responded", "qualified", "disqualified",
];

export function MessagePanel({ lead, onClose, onRefresh }: MessagePanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    leadApi.getMessages(lead.id).then(setMessages).finally(() => setLoading(false));
  }, [lead.id]);

  async function handleStatusChange(status: LeadStatus) {
    setUpdatingStatus(true);
    try {
      await leadApi.updateStatus(lead.id, status);
      onRefresh();
    } finally {
      setUpdatingStatus(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/20 z-40 flex justify-end" onClick={onClose}>
      <div
        className="h-full w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-slate-900 truncate">{lead.name}</h2>
            <p className="text-sm text-slate-500 truncate">
              {lead.title} {lead.company ? `· ${lead.company}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 ml-2">
            <X size={16} />
          </button>
        </div>

        {/* Lead Info */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Status</span>
            <select
              value={lead.status}
              disabled={updatingStatus}
              onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
              className={cn(
                "text-xs font-semibold rounded-full border px-2.5 py-1 cursor-pointer focus:outline-none",
                STATUS_COLORS[lead.status]
              )}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">ICP Score</span>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-24 rounded-full bg-slate-200">
                <div
                  className={cn(
                    "h-full rounded-full",
                    lead.score >= 80 ? "bg-green-500" : lead.score >= 60 ? "bg-yellow-500" : "bg-red-400"
                  )}
                  style={{ width: `${lead.score}%` }}
                />
              </div>
              <span className="text-xs font-medium text-slate-700">{lead.score}/100</span>
            </div>
          </div>
          {lead.industry && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Industry</span>
              <span className="text-xs text-slate-700">{lead.industry}</span>
            </div>
          )}
          {lead.location && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Location</span>
              <span className="text-xs text-slate-700">{lead.location}</span>
            </div>
          )}
        </div>

        {/* Research Notes */}
        {lead.research_notes && (
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Bot size={12} /> AI Research Notes
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">{lead.research_notes}</p>
          </div>
        )}

        {/* Pain Points */}
        {lead.pain_points?.length > 0 && (
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-2">Pain Points</p>
            <div className="flex flex-wrap gap-1.5">
              {lead.pain_points.map((p, i) => (
                <Badge key={i} className="bg-red-50 text-red-600 border-red-100 text-xs">
                  {p}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-xs font-medium text-slate-500 mb-3 flex items-center gap-1.5">
            <MessageSquare size={12} /> Conversation Log
          </p>
          {loading && (
            <p className="text-sm text-slate-400 text-center py-8">Loading...</p>
          )}
          {!loading && messages.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">
              No messages yet. Generate outreach to get started.
            </p>
          )}
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    {msg.channel === "linkedin" ? (
                      <Linkedin size={12} className="text-blue-600" />
                    ) : (
                      <Mail size={12} className="text-slate-500" />
                    )}
                    <span className="text-xs font-medium text-slate-600 capitalize">{msg.channel}</span>
                    <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-xs">
                      {msg.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{formatCost(msg.cost_usd)}</span>
                    <span className="text-xs text-slate-400">{timeAgo(msg.created_at)}</span>
                  </div>
                </div>
                <div className="px-3 py-2.5">
                  {msg.subject && (
                    <p className="text-xs font-medium text-slate-500 mb-1">
                      Subject: <span className="text-slate-700">{msg.subject}</span>
                    </p>
                  )}
                  <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
                <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
                  <p className="text-xs text-slate-400">
                    {msg.llm_provider} · {msg.llm_model} · {msg.tokens_used} tokens
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
