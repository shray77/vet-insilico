/**
 * Share — сериализация сценариев расчётов в ссылку.
 *
 * Два режима:
 *   1. Облачный:   #s=<ID>  — payload в KV воркера vet-api (TTL 90 дней).
 *   2. Автономный: #j=<b64> — payload прямо в хеше (работает офлайн и в РФ,
 *      где workers.dev недоступен; короткие сценарии — ок).
 *
 * Поддерживаемые приложения (дискриминант app):
 *   pkpd (PK/PD Simulator), primer (PCR Primer Designer),
 *   crispr (CRISPR gRNA Designer), alignment (Sequence Alignment).
 *
 * Функции чистые (кроме build*Url, использующих location) → тестируются.
 */

import { cloudGetShare } from "./cloud";

/* ─────────── сценарии приложений ─────────── */

export interface PkpdScenario {
  v: 1;
  app: "pkpd";
  profileIdx: number;
  dose: number;
  interval: number;
  nDoses: number;
  mic: number;
  pdTarget: number;
}

export interface PrimerScenario {
  v: 1;
  app: "primer";
  seq: string;
  targetTm: number;
  minProduct: number;
  maxProduct: number;
  minLen: number;
  maxLen: number;
}

export interface CrisprScenario {
  v: 1;
  app: "crispr";
  seq: string;
  minScore: number;
}

export interface AlignmentScenario {
  v: 1;
  app: "alignment";
  a: string;
  b: string;
  type: "protein" | "dna";
  algo: "needleman-wunsch" | "smith-waterman";
  gap: number;
}

export type Scenario = PkpdScenario | PrimerScenario | CrisprScenario | AlignmentScenario;

/** Лимит автономного payload (#j=) в символах base64url (URL до ~64k, берём запас). */
export const AUTONOMOUS_LIMIT = 16000;

/* ─────────── base64url (UTF-8 safe) ─────────── */

export function toB64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromB64Url(b64: string): string {
  let norm = b64.replace(/-/g, "+").replace(/_/g, "/");
  while (norm.length % 4) norm += "=";
  const bin = atob(norm);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/* ─────────── нормализация/валидация ─────────── */

function clamp(n: unknown, min: number, max: number, dflt: number): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return dflt;
  return Math.min(max, Math.max(min, x));
}

/** Последовательность: A-Z, '-', '.'; uppercase; обрезка по лимиту. */
function cleanSeq(s: unknown, max = 12000): string {
  return typeof s === "string" ? s.toUpperCase().replace(/[^A-Z\-.]/g, "").slice(0, max) : "";
}

/** Строгая нормализация: доза/интервал/MIC внутри диапазонов UI-слайдеров. */
export function normalizePkpd(raw: unknown): PkpdScenario {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    v: 1,
    app: "pkpd",
    profileIdx: clamp(r.profileIdx, 0, 63, 0),
    dose: clamp(r.dose, 1, 30, 5),
    interval: clamp(r.interval, 6, 48, 24),
    nDoses: clamp(r.nDoses, 1, 15, 5),
    mic: clamp(r.mic, 0.05, 8, 1),
    pdTarget: clamp(r.pdTarget, 10, 500, 100),
  };
}

export function normalizePrimer(raw: unknown): PrimerScenario {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    v: 1,
    app: "primer",
    seq: cleanSeq(r.seq, 12000),
    targetTm: clamp(r.targetTm, 45, 70, 58),
    minProduct: clamp(r.minProduct, 50, 1000, 150),
    maxProduct: clamp(r.maxProduct, 100, 2000, 600),
    minLen: clamp(r.minLen, 17, 30, 18),
    maxLen: clamp(r.maxLen, 18, 35, 22),
  };
}

export function normalizeCrispr(raw: unknown): CrisprScenario {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    v: 1,
    app: "crispr",
    seq: cleanSeq(r.seq, 12000),
    minScore: clamp(r.minScore, 0, 100, 20),
  };
}

export function normalizeAlignment(raw: unknown): AlignmentScenario {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    v: 1,
    app: "alignment",
    a: cleanSeq(r.a, 8000),
    b: cleanSeq(r.b, 8000),
    type: r.type === "protein" ? "protein" : "dna",
    algo: r.algo === "smith-waterman" ? "smith-waterman" : "needleman-wunsch",
    gap: clamp(r.gap, -20, -2, -8),
  };
}

/** Единая точка входа: валидация пришедшего payload по дискриминанту app. */
export function normalizeScenario(raw: unknown): Scenario | null {
  const app = (raw as { app?: unknown } | null | undefined)?.app;
  if (app === "pkpd") return normalizePkpd(raw);
  if (app === "primer") return normalizePrimer(raw);
  if (app === "crispr") return normalizeCrispr(raw);
  if (app === "alignment") return normalizeAlignment(raw);
  return null;
}

export function isPkpdScenario(v: unknown): v is PkpdScenario {
  return Boolean(v && typeof v === "object" && (v as { app?: string }).app === "pkpd");
}

/* ─────────── хеш-кодирование ─────────── */

/** Полезная нагрузка автономной ссылки: base64url(JSON). */
export function encodeAutonomousPayload(sc: Scenario): string {
  return toB64Url(JSON.stringify(sc));
}

export function decodeAutonomousPayload(b64: string): Scenario | null {
  try {
    const parsed: unknown = JSON.parse(fromB64Url(b64));
    return normalizeScenario(parsed);
  } catch {
    return null;
  }
}

/** Размер автономной части URL (для проверки лимита до копирования). */
export function autonomousPayloadSize(sc: Scenario): number {
  return encodeAutonomousPayload(sc).length;
}

/** Разбор location.hash: "#s=ID" → {id}, "#j=b64" → {data}, иначе null. */
export function parseShareHash(hash: string): { id?: string; data?: Scenario } {
  const h = hash.replace(/^#/, "").trim();
  if (!h) return {};
  for (const part of h.split("&")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq);
    const val = part.slice(eq + 1);
    if (key === "s" && /^[0-9A-Za-z]{6,12}$/.test(val)) return { id: val.toUpperCase() };
    if (key === "j" && val.length > 0 && val.length <= AUTONOMOUS_LIMIT) {
      const data = decodeAutonomousPayload(val);
      if (data) return { data };
    }
  }
  return {};
}

/** Ссылка на текущую страницу с автономным payload (учитывает basePath). */
export function buildAutonomousShareUrl(sc: Scenario): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}#j=${encodeAutonomousPayload(sc)}`;
}

/** Ссылка с облачным id. */
export function buildCloudShareUrl(id: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}#s=${id}`;
}

/* ─────────── загрузка сценария из ссылки ─────────── */

/**
 * Единый поток загрузки: #s=<id> → облако (может упасть) → автономный #j=<b64>.
 * Возвращает нормализованный сценарий любого приложения; страница сама
 * фильтрует по sc.app и применяет только своё.
 */
export async function loadScenarioFromHash(hash: string): Promise<Scenario | null> {
  const parsed = parseShareHash(hash);
  if (parsed.data) return parsed.data;
  if (parsed.id) {
    try {
      const rec = await cloudGetShare(parsed.id);
      return normalizeScenario(rec.payload);
    } catch {
      return null; // облако недоступно (РФ) — остаёмся на дефолтных параметрах
    }
  }
  return null;
}
