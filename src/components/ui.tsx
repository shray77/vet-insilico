"use client";

import Link from "next/link";
import HubHeader from "./HubHeader";
import { type ReactNode } from "react";

// ─── Color themes for tool pages ────────────────────────────────────
export type ToolColor = "teal" | "rose" | "indigo" | "fuchsia" | "amber" | "purple" | "emerald" | "cyan" | "orange" | "blue";

const COLOR_MAP: Record<ToolColor, { bg: string; border: string; text: string; title: string }> = {
  teal:    { bg: "bg-teal-50 dark:bg-teal-950/30",       border: "border-teal-200 dark:border-teal-800",       text: "text-teal-800 dark:text-teal-200",       title: "text-teal-900 dark:text-teal-100" },
  rose:    { bg: "bg-rose-50 dark:bg-rose-950/30",       border: "border-rose-200 dark:border-rose-800",       text: "text-rose-800 dark:text-rose-200",       title: "text-rose-900 dark:text-rose-100" },
  indigo:  { bg: "bg-indigo-50 dark:bg-indigo-950/30",   border: "border-indigo-200 dark:border-indigo-800",   text: "text-indigo-800 dark:text-indigo-200",   title: "text-indigo-900 dark:text-indigo-100" },
  fuchsia: { bg: "bg-fuchsia-50 dark:bg-fuchsia-950/30", border: "border-fuchsia-200 dark:border-fuchsia-800", text: "text-fuchsia-800 dark:text-fuchsia-200", title: "text-fuchsia-900 dark:text-fuchsia-100" },
  amber:   { bg: "bg-amber-50 dark:bg-amber-950/30",     border: "border-amber-200 dark:border-amber-800",     text: "text-amber-800 dark:text-amber-200",     title: "text-amber-900 dark:text-amber-100" },
  purple:  { bg: "bg-purple-50 dark:bg-purple-950/30",   border: "border-purple-200 dark:border-purple-800",   text: "text-purple-800 dark:text-purple-200",   title: "text-purple-900 dark:text-purple-100" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-800 dark:text-emerald-200", title: "text-emerald-900 dark:text-emerald-100" },
  cyan:    { bg: "bg-cyan-50 dark:bg-cyan-950/30",       border: "border-cyan-200 dark:border-cyan-800",       text: "text-cyan-800 dark:text-cyan-200",       title: "text-cyan-900 dark:text-cyan-100" },
  orange:  { bg: "bg-orange-50 dark:bg-orange-950/30",   border: "border-orange-200 dark:border-orange-800",   text: "text-orange-800 dark:text-orange-200",   title: "text-orange-900 dark:text-orange-100" },
  blue:    { bg: "bg-blue-50 dark:bg-blue-950/30",       border: "border-blue-200 dark:border-blue-800",       text: "text-blue-800 dark:text-blue-200",       title: "text-blue-900 dark:text-blue-100" },
};

// ─── ToolPageLayout ─────────────────────────────────────────────────
interface ToolPageLayoutProps {
  /** Tool name shown in breadcrumb + hero */
  name: string;
  /** Icon emoji shown in hero */
  icon: string;
  /** Short description shown in hero */
  description: string;
  /** Color theme */
  color?: ToolColor;
  /** Page content */
  children: ReactNode;
}

/**
 * Shared layout for all tool pages — eliminates ~50 lines of boilerplate
 * per page (breadcrumb + hero + main wrapper).
 *
 * Usage:
 *   <ToolPageLayout name="Codon Optimization" icon="🔤" description="..." color="fuchsia">
 *     {/* page content * /}
 *   </ToolPageLayout>
 */
export function ToolPageLayout({ name, icon, description, color = "teal", children }: ToolPageLayoutProps) {
  const c = COLOR_MAP[color];
  return (
    <div className="min-h-screen">
      <HubHeader />
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-teal-500">Хаб</Link>
          <span className="mx-1">/</span>
          <span>{name}</span>
        </div>
        {/* Hero */}
        <div className={`rounded-xl ${c.bg} border ${c.border} p-4 mb-6`}>
          <h2 className={`font-semibold ${c.title} mb-1`}>{icon} {name}</h2>
          <p className={`text-sm ${c.text}`}>{description}</p>
        </div>
        {children}
      </main>
    </div>
  );
}

// ─── LoadingPanel ───────────────────────────────────────────────────
export function LoadingPanel({ message = "Загрузка..." }: { message?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-400">
      <div className="inline-block animate-spin h-6 w-6 border-2 border-zinc-300 dark:border-zinc-700 border-t-teal-500 rounded-full mb-3" />
      <div className="text-sm">{message}</div>
    </div>
  );
}

// ─── EmptyPanel ─────────────────────────────────────────────────────
export function EmptyPanel({ message = "Заполните параметры для расчёта..." }: { message?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center text-zinc-400">
      <div className="text-3xl mb-2">📋</div>
      <div className="text-sm">{message}</div>
    </div>
  );
}

// ─── ErrorAlert ─────────────────────────────────────────────────────
export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="text-xs text-red-500 p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
      ⚠️ {message}
    </div>
  );
}

// ─── SampleSelector ─────────────────────────────────────────────────
interface SampleSelectorProps {
  samples: { name: string }[];
  currentIdx: number;
  onSelect: (idx: number) => void;
  label?: string;
}

export function SampleSelector({ samples, currentIdx, onSelect, label = "Примеры" }: SampleSelectorProps) {
  return (
    <div className="mb-4">
      <span className="text-xs text-zinc-500 block mb-1.5">{label}:</span>
      <div className="flex flex-wrap gap-1.5">
        {samples.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`px-2 py-1 rounded-md text-xs border transition-colors ${
              i === currentIdx
                ? "bg-teal-500 text-white border-teal-500"
                : "bg-transparent border-zinc-200 dark:border-zinc-700 hover:bg-accent"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── InputField helpers ─────────────────────────────────────────────
export function TextField({
  label, value, onChange, placeholder, rows, mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs text-zinc-500">{label}</span>
      {rows ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm ${mono ? "font-mono" : ""}`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm ${mono ? "font-mono" : ""}`}
        />
      )}
    </label>
  );
}

export function SelectField({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-xs text-zinc-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

// ─── CopyButton ─────────────────────────────────────────────────────
export function CopyButton({ text, label = "Копировать" }: { text: string; label?: string }) {
  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch {}
      document.body.removeChild(ta);
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="px-2 py-1 rounded-md text-xs border border-zinc-200 dark:border-zinc-700 hover:bg-accent transition-colors"
    >
      📋 {label}
    </button>
  );
}
