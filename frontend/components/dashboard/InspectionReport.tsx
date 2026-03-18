"use client";

import { useRef, useState, useCallback } from "react";
import { Camera, Download, Loader2, X } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Condition = "Good" | "Fair" | "Poor" | "N/A" | "";

interface PhotoSlot {
  id: string;
  label: string;
  url: string | null;
  condition: Condition;
  notes: string;
}

interface FormData {
  reportNumber: string;
  date: string;
  address: string;
  ownerName: string;
  inspectorName: string;
  phone: string;
  roofAge: string;
  overallCondition: Condition;
  recommendation: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SLOT_DEFS: { id: string; label: string }[] = [
  { id: "front", label: "Front Elevation" },
  { id: "rear", label: "Rear Elevation" },
  { id: "left", label: "Left Side" },
  { id: "right", label: "Right Side" },
  { id: "overview1", label: "Roof Overview 1" },
  { id: "overview2", label: "Roof Overview 2" },
  { id: "ridge", label: "Ridge Line" },
  { id: "gutters", label: "Gutters & Downspouts" },
  { id: "flashing", label: "Flashing / Valleys" },
  { id: "damage1", label: "Damaged Area 1" },
  { id: "damage2", label: "Damaged Area 2" },
  { id: "damage3", label: "Damaged Area 3" },
  { id: "damage4", label: "Damaged Area 4" },
  { id: "interior1", label: "Interior / Attic 1" },
  { id: "interior2", label: "Interior / Attic 2" },
];

const CONDITIONS: Condition[] = ["Good", "Fair", "Poor", "N/A"];

const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  Good: { bg: "#DCFCE7", color: "#166534" },
  Fair: { bg: "#FEF3C7", color: "#92400E" },
  Poor: { bg: "#FEE2E2", color: "#991B1B" },
  "N/A": { bg: "#F1F5F9", color: "#475569" },
  "": { bg: "#F1F5F9", color: "#475569" },
};

function makeInitialSlots(): PhotoSlot[] {
  return SLOT_DEFS.map((s) => ({
    ...s,
    url: null,
    condition: "",
    notes: "",
  }));
}

function todayString() {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function reportNumber() {
  return `RRP-${Date.now().toString().slice(-6)}`;
}

// ── Badge component (shared by form + print template) ─────────────────────────

function ConditionBadge({
  condition,
  large = false,
}: {
  condition: Condition | "";
  large?: boolean;
}) {
  if (!condition) return null;
  const s = BADGE_STYLES[condition] ?? BADGE_STYLES[""];
  return (
    <span
      style={{
        display: "inline-block",
        background: s.bg,
        color: s.color,
        borderRadius: "4px",
        padding: large ? "4px 14px" : "2px 8px",
        fontSize: large ? "13px" : "9px",
        fontWeight: 600,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        lineHeight: "1.4",
      }}
    >
      {condition}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function InspectionReport() {
  const printRef = useRef<HTMLDivElement>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [form, setForm] = useState<FormData>({
    reportNumber: reportNumber(),
    date: todayString(),
    address: "",
    ownerName: "",
    inspectorName: "",
    phone: "",
    roofAge: "",
    overallCondition: "",
    recommendation: "",
  });

  const [slots, setSlots] = useState<PhotoSlot[]>(makeInitialSlots());
  const [generating, setGenerating] = useState(false);

  // ── Form helpers ────────────────────────────────────────────────────────────

  const setField = (field: keyof FormData, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const updateSlot = (id: string, patch: Partial<PhotoSlot>) =>
    setSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );

  const handlePhoto = useCallback(
    (id: string, file: File | null) => {
      if (!file) return;
      const prev = slots.find((s) => s.id === id)?.url;
      if (prev) URL.revokeObjectURL(prev);
      updateSlot(id, { url: URL.createObjectURL(file) });
    },
    [slots]
  );

  const clearPhoto = (id: string) => {
    const slot = slots.find((s) => s.id === id);
    if (slot?.url) URL.revokeObjectURL(slot.url);
    updateSlot(id, { url: null });
  };

  // ── PDF generation ──────────────────────────────────────────────────────────

  const downloadPDF = async () => {
    if (!printRef.current) return;
    setGenerating(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all(
        [import("jspdf"), import("html2canvas")]
      );

      const canvas = await html2canvas(printRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 15000,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF("p", "mm", "a4");
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = 210;
      const imgH = (canvas.height * imgW) / canvas.width;

      pdf.addImage(imgData, "JPEG", 0, 0, imgW, imgH, "", "FAST");
      let left = imgH - pageH;
      let pos = 0;
      while (left > 0) {
        pos = left - imgH;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, pos, imgW, imgH, "", "FAST");
        left -= pageH;
      }

      const safeName = (form.address || "report").replace(/[^a-z0-9]/gi, "-");
      const safeDate = (form.date || "").replace(/[^a-z0-9]/gi, "-");
      pdf.save(`RRP-Inspection-${safeName}-${safeDate}.pdf`);
    } finally {
      setGenerating(false);
    }
  };

  // ── Slot grid for input form ────────────────────────────────────────────────

  const renderInputSlot = (slot: PhotoSlot) => (
    <div key={slot.id} className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-slate-700">{slot.label}</p>

      {/* Photo box */}
      <div
        className="relative rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden cursor-pointer hover:border-violet-400 transition-colors"
        style={{ height: 140 }}
        onClick={() => fileInputRefs.current[slot.id]?.click()}
      >
        {slot.url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slot.url}
              alt={slot.label}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
              onClick={(e) => {
                e.stopPropagation();
                clearPhoto(slot.id);
              }}
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-1 text-slate-400">
            <Camera size={22} />
            <span className="text-xs">Tap to add photo</span>
          </div>
        )}
        <input
          ref={(el) => {
            fileInputRefs.current[slot.id] = el;
          }}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handlePhoto(slot.id, e.target.files?.[0] ?? null)}
        />
      </div>

      {/* Condition */}
      <div className="flex gap-1 flex-wrap">
        {CONDITIONS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => updateSlot(slot.id, { condition: c })}
            className="text-xs px-2 py-0.5 rounded-full border transition-colors"
            style={
              slot.condition === c
                ? {
                    background: BADGE_STYLES[c].bg,
                    color: BADGE_STYLES[c].color,
                    borderColor: BADGE_STYLES[c].color,
                    fontWeight: 600,
                  }
                : {}
            }
          >
            {c}
          </button>
        ))}
      </div>

      {/* Notes */}
      <input
        type="text"
        placeholder="Notes (optional)"
        value={slot.notes}
        onChange={(e) => updateSlot(slot.id, { notes: e.target.value })}
        className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-400"
      />
    </div>
  );

  // ── Print template (off-screen, captured by html2canvas) ────────────────────

  const overallStyle = BADGE_STYLES[form.overallCondition] ?? BADGE_STYLES[""];

  const renderPrintSlot = (slot: PhotoSlot) => (
    <td
      key={slot.id}
      style={{
        width: "240px",
        padding: "8px 12px 12px 12px",
        verticalAlign: "top",
      }}
    >
      {/* Label */}
      <div
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: "9px",
          fontWeight: 600,
          color: "#374151",
          marginBottom: "4px",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {slot.label}
      </div>

      {/* Photo cell — always fixed size */}
      <div
        style={{
          width: "216px",
          height: "150px",
          overflow: "hidden",
          borderRadius: "4px",
          background: "#F1F5F9",
          border: "1px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {slot.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={slot.url}
            alt={slot.label}
            style={{
              width: "216px",
              height: "150px",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: "9px",
              color: "#94A3B8",
              textAlign: "center",
              padding: "8px",
            }}
          >
            No photo
          </span>
        )}
      </div>

      {/* Badge + notes */}
      <div style={{ marginTop: "5px" }}>
        {slot.condition && <ConditionBadge condition={slot.condition} />}
        {slot.notes && (
          <div
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: "8px",
              color: "#64748B",
              fontStyle: "italic",
              marginTop: "3px",
              lineHeight: "1.4",
            }}
          >
            {slot.notes}
          </div>
        )}
      </div>
    </td>
  );

  // Build photo rows — 2 per row
  const photoRows: PhotoSlot[][] = [];
  for (let i = 0; i < slots.length; i += 2) {
    photoRows.push(slots.slice(i, i + 2));
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Font import ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap');
      `}</style>

      {/* ── Page header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Roof Inspection Report</h1>
          <p className="text-xs text-slate-500 mt-0.5">Fill in details → upload photos → Download PDF</p>
        </div>
        <button
          type="button"
          onClick={downloadPDF}
          disabled={generating}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          {generating ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          {generating ? "Generating…" : "Download PDF"}
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 pb-24 md:pb-6 space-y-6">
        {/* ── Section 1: Property Info ── */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wide">
            Property Information
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "Property Address *", field: "address" as const, placeholder: "123 Main St, OKC, OK 73101" },
              { label: "Owner Name *", field: "ownerName" as const, placeholder: "John Smith" },
              { label: "Inspector Name", field: "inspectorName" as const, placeholder: "Your name" },
              { label: "Phone", field: "phone" as const, placeholder: "(405) 555-0100" },
              { label: "Report #", field: "reportNumber" as const, placeholder: "Auto-generated" },
              { label: "Date", field: "date" as const, placeholder: "Today" },
            ].map(({ label, field, placeholder }) => (
              <div key={field}>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
                <input
                  type="text"
                  value={form[field]}
                  onChange={(e) => setField(field, e.target.value)}
                  placeholder={placeholder}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 2: Photo Slots ── */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wide">
            Photo Documentation
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {slots.map(renderInputSlot)}
          </div>
        </div>

        {/* ── Section 3: Summary ── */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wide">
            Summary & Recommendation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Overall Roof Condition
              </label>
              <div className="flex gap-2 flex-wrap">
                {(["Good", "Fair", "Poor"] as Condition[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setField("overallCondition", c)}
                    className="px-4 py-1.5 rounded-lg border text-sm font-semibold transition-colors"
                    style={
                      form.overallCondition === c
                        ? {
                            background: BADGE_STYLES[c].bg,
                            color: BADGE_STYLES[c].color,
                            borderColor: BADGE_STYLES[c].color,
                          }
                        : {}
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Estimated Roof Age (years)
              </label>
              <input
                type="number"
                min={0}
                max={99}
                value={form.roofAge}
                onChange={(e) => setField("roofAge", e.target.value)}
                placeholder="e.g. 12"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Recommended Action
              </label>
              <textarea
                value={form.recommendation}
                onChange={(e) => setField("recommendation", e.target.value)}
                placeholder="Describe recommended repairs, replacement timeline, or next steps…"
                rows={3}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── HIDDEN PRINT TEMPLATE ─────────────────────────────────────────────
           Off-screen but rendered — captured by html2canvas for the PDF.
           Uses only inline styles, px units, table layout. No Tailwind.
      ──────────────────────────────────────────────────────────────────────── */}
      <div
        ref={printRef}
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: "794px",
          background: "#ffffff",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: "10px",
          color: "#0F172A",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 32px 16px 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          {/* Left: company */}
          <div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#0F172A",
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
              }}
            >
              Repair-First Roofing
            </div>
            <div style={{ fontSize: "10px", color: "#64748B", marginTop: "2px" }}>
              Professional Roof Inspection Services
            </div>
          </div>

          {/* Right: report identity */}
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#0369A1",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Roof Inspection Report
            </div>
            <table
              style={{ marginTop: "4px", marginLeft: "auto", borderSpacing: 0 }}
            >
              <tbody>
                {[
                  ["Report #", form.reportNumber],
                  ["Date", form.date],
                  ["Inspector", form.inspectorName || "—"],
                  ["Phone", form.phone || "—"],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td
                      style={{
                        fontSize: "9px",
                        color: "#64748B",
                        paddingRight: "8px",
                        paddingBottom: "2px",
                        textAlign: "right",
                      }}
                    >
                      {k}
                    </td>
                    <td
                      style={{
                        fontSize: "9px",
                        color: "#0F172A",
                        fontWeight: 600,
                        paddingBottom: "2px",
                      }}
                    >
                      {v}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Navy divider */}
        <div style={{ background: "#0F172A", height: "3px", margin: "0 32px" }} />

        {/* Property info banner */}
        <div
          style={{
            margin: "12px 32px",
            background: "#F8FAFC",
            borderLeft: "4px solid #0369A1",
            borderRadius: "4px",
            padding: "10px 16px",
          }}
        >
          <table style={{ borderSpacing: 0, width: "100%" }}>
            <tbody>
              <tr>
                <td style={{ width: "50%", verticalAlign: "top" }}>
                  <span style={{ fontSize: "8px", color: "#64748B", display: "block" }}>
                    Property Address
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A" }}>
                    {form.address || "—"}
                  </span>
                </td>
                <td style={{ verticalAlign: "top" }}>
                  <span style={{ fontSize: "8px", color: "#64748B", display: "block" }}>
                    Owner Name
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#0F172A" }}>
                    {form.ownerName || "—"}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section heading: Photos */}
        <div
          style={{
            margin: "4px 32px 8px 32px",
            fontSize: "9px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            color: "#475569",
            borderBottom: "1px solid #E2E8F0",
            paddingBottom: "4px",
          }}
        >
          Photo Documentation
        </div>

        {/* Photo grid — table-based, 2 columns */}
        <table
          style={{
            borderSpacing: 0,
            margin: "0 20px",
            width: "calc(100% - 40px)",
          }}
        >
          <tbody>
            {photoRows.map((row, ri) => (
              <tr key={ri}>{row.map(renderPrintSlot)}</tr>
            ))}
          </tbody>
        </table>

        {/* Section heading: Summary */}
        <div
          style={{
            margin: "16px 32px 8px 32px",
            fontSize: "9px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            color: "#475569",
            borderBottom: "1px solid #E2E8F0",
            paddingBottom: "4px",
          }}
        >
          Summary & Recommendation
        </div>

        {/* Overall condition banner */}
        {form.overallCondition && (
          <div
            style={{
              margin: "0 32px 12px 32px",
              background: overallStyle.bg,
              borderRadius: "6px",
              padding: "10px 18px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <span
              style={{
                fontSize: "9px",
                fontWeight: 600,
                color: overallStyle.color,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Overall Condition
            </span>
            <ConditionBadge condition={form.overallCondition} large />
            {form.roofAge && (
              <span
                style={{
                  fontSize: "9px",
                  color: overallStyle.color,
                  marginLeft: "auto",
                }}
              >
                Est. Roof Age: <strong>{form.roofAge} years</strong>
              </span>
            )}
          </div>
        )}

        {/* Recommendation */}
        <div style={{ margin: "0 32px 8px 32px" }}>
          <div style={{ fontSize: "9px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
            Recommended Action
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "#1E293B",
              lineHeight: "1.6",
              whiteSpace: "pre-wrap",
              background: "#F8FAFC",
              borderRadius: "4px",
              padding: "8px 12px",
              minHeight: "40px",
            }}
          >
            {form.recommendation || "No recommendation entered."}
          </div>
        </div>

        {/* Signature line */}
        <div
          style={{
            margin: "16px 32px 24px 32px",
            borderTop: "1px solid #E2E8F0",
            paddingTop: "12px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "9px", color: "#64748B" }}>Inspector Signature</div>
            <div
              style={{
                marginTop: "18px",
                borderBottom: "1px solid #0F172A",
                width: "180px",
              }}
            />
            <div style={{ fontSize: "9px", color: "#374151", marginTop: "4px" }}>
              {form.inspectorName || "Inspector Name"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "9px", color: "#64748B" }}>Date</div>
            <div
              style={{
                marginTop: "18px",
                borderBottom: "1px solid #0F172A",
                width: "120px",
              }}
            />
            <div style={{ fontSize: "9px", color: "#374151", marginTop: "4px" }}>
              {form.date}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            background: "#0F172A",
            padding: "8px 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "8px", color: "#94A3B8" }}>
            Repair-First Roofing · Professional Inspection Services
          </span>
          <span style={{ fontSize: "8px", color: "#64748B" }}>
            {form.reportNumber}
          </span>
        </div>
      </div>
    </div>
  );
}
