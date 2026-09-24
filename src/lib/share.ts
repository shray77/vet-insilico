/**
 * Share — сериализация сценариев расчётов в ссылку.
 *
 * Два режима:
 *   1. Облачный:   #s=<ID>  — payload в KV воркера vet-api (TTL 90 дней).
 *   2. Автономный: #j=<b64> — payload прямо в хеше (работает офлайн и в РФ,
 *      где workers.dev недоступен; state PK/PD ≈ 120 байт, base64url — ок).
 *
 * Функции чистые (кроме buildShareUrl, использующей location) → тестируются.
 */

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

export type Scenario = PkpdScenario;

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

/* ─────────── нормализация/валидация сценария ─────────── */

function clamp(n: unknown, min: number, max: number, dflt: number): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return dflt;
  return Math.min(max, Math.max(min, x));
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
    if (!isPkpdScenario(parsed)) return null;
    return normalizePkpd(parsed);
  } catch {
    return null;
  }
}

/** Разбор location.hash: "#s=ID" → {id}, "#j=b64" → {data}, иначе null. */
export function parseShareHash(hash: string): { id?: string; data?: PkpdScenario } {
  const h = hash.replace(/^#/, "").trim();
  if (!h) return {};
  for (const part of h.split("&")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq);
    const val = part.slice(eq + 1);
    if (key === "s" && /^[0-9A-Za-z]{6,12}$/.test(val)) return { id: val.toUpperCase() };
    if (key === "j" && val.length > 0 && val.length <= 4096) {
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
