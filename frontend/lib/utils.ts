import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { LeadStatus } from "./api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-slate-100 text-slate-700 border-slate-200",
  researching: "bg-blue-100 text-blue-700 border-blue-200",
  ready: "bg-cyan-100 text-cyan-700 border-cyan-200",
  contacted: "bg-yellow-100 text-yellow-700 border-yellow-200",
  responded: "bg-orange-100 text-orange-700 border-orange-200",
  qualified: "bg-green-100 text-green-700 border-green-200",
  disqualified: "bg-red-100 text-red-700 border-red-200",
};

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  researching: "Researching",
  ready: "Ready",
  contacted: "Contacted",
  responded: "Responded",
  qualified: "Qualified",
  disqualified: "Disqualified",
};

export function formatCost(usd: number): string {
  if (usd < 0.01) return `$${(usd * 100).toFixed(3)}¢`;
  return `$${usd.toFixed(4)}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n);
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
