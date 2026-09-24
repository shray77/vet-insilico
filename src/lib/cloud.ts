/**
 * Cloud client — vet-api (Cloudflare Worker) для VetInSilico Hub.
 *
 * Архитектура: статика на GitHub Pages, вычисления/данные — на CF Worker.
 * РФ-посетители могут не достигать workers.dev → ВСЕ вызовы обязаны
 * быстро падать (таймауты) и не ломать UX: страница остаётся полностью
 * работоспособной без облака (fallback на локальные алгоритмы / свой HF-токен).
 *
 * Эндпоинты воркера: см. https://github.com/shray77/vet-api
 */

const DEFAULT_CLOUD_URL = "https://vet-api.shray77.workers.dev";

function getCloudUrl(): string {
  if (typeof window !== "undefined") {
    try {
      const override = localStorage.getItem("vet:api_url");
      if (override) return override.replace(/\/+$/, "");
    } catch {}
  }
  return process.env.NEXT_PUBLIC_VET_API_URL || DEFAULT_CLOUD_URL;
}

const CLOUD_URL = getCloudUrl();

/* ─────────── статус облака (probe с кешем) ─────────── */

export interface CloudStatus {
  reachable: boolean;
  /** Облачный AI включён на воркере (эдж-биндинг Workers AI и/или секрет HF_TOKEN). */
  ai: boolean;
  /** Канал AI: "workers-ai" (эдж) | "hf" | undefined. */
  aiBackend?: string;
  /** Сколько вспышек сейчас в KV-зеркале (если засеяно). */
  outbreaks: number | null;
  outbreaksUpdated: string | null;
  ms: number;
  checkedAt: number;
}

const PROBE_TTL_MS = 5 * 60 * 1000;
let probeCache: CloudStatus | null = null;
let probeInFlight: Promise<CloudStatus> | null = null;

async function fetchJson<T>(path: string, init?: RequestInit, timeoutMs = 6000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${CLOUD_URL}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err = (data as { error?: string } | null)?.error;
      const e = new Error(err || `vet-api ${res.status}`);
      (e as Error & { status?: number }).status = res.status;
      throw e;
    }
    return data as T;
  } finally {
    clearTimeout(t);
  }
}

/** Быстрая диагностика воркера. Кеш 5 мин; недоступность — не ошибка, а статус. */
export async function probeCloud(force = false): Promise<CloudStatus> {
  if (!force && probeCache && Date.now() - probeCache.checkedAt < PROBE_TTL_MS) {
    return probeCache;
  }
  if (probeInFlight) return probeInFlight;
  const t0 = Date.now();
  probeInFlight = fetchJson<{
    ai: boolean;
    aiBackend?: string;
    outbreaks: number | null;
    outbreaksUpdated: string | null;
  }>(
    "/v1/insilico/status",
    undefined,
    4500,
  )
    .then((d) => {
      probeCache = {
        reachable: true,
        ai: Boolean(d.ai),
        aiBackend: d.aiBackend,
        outbreaks: d.outbreaks,
        outbreaksUpdated: d.outbreaksUpdated,
        ms: Date.now() - t0,
        checkedAt: Date.now(),
      };
      return probeCache;
    })
    .catch(() => {
      probeCache = { reachable: false, ai: false, outbreaks: null, outbreaksUpdated: null, ms: Date.now() - t0, checkedAt: Date.now() };
      return probeCache;
    })
    .finally(() => {
      probeInFlight = null;
    });
  return probeInFlight;
}

/** Синхронный доступ к последнему probe (без запроса). */
export function lastCloudStatus(): CloudStatus | null {
  return probeCache;
}

export function cloudUrl(): string {
  return CLOUD_URL;
}

/* ─────────── Live-вспышки (из heatmap-зеркала) ─────────── */

export interface LiveOutbreak {
  id: number;
  disease_key: string;
  disease: string;
  region: string;
  region_geo: string;
  date: string;
  last_seen?: string;
  species: string;
  cases: number;
  deaths: number;
  status: string;
  source: string;
  lat?: number | null;
  lon?: number | null;
}

export interface LiveOutbreaksResult {
  ok: true;
  updated: string;
  totalInDataset: number;
  matched: number;
  outbreaks: LiveOutbreak[];
}

export async function fetchLiveOutbreaks(
  params: { q?: string; disease?: string; species?: string; since?: string; limit?: number } = {},
  timeoutMs = 6000,
): Promise<LiveOutbreaksResult> {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const qs = sp.toString();
  return fetchJson<LiveOutbreaksResult>(`/v1/insilico/outbreaks${qs ? `?${qs}` : ""}`, undefined, timeoutMs);
}

/* ─────────── Share: облачное хранение сценариев ─────────── */

export interface ShareRecord {
  app: string;
  title: string;
  payload: unknown;
  created: string;
  v: number;
}

export async function cloudShare(
  app: string,
  payload: unknown,
  title = "",
  timeoutMs = 8000,
): Promise<{ id: string; expiresInDays: number }> {
  return fetchJson<{ id: string; expiresInDays: number }>(
    "/v1/insilico/share",
    { method: "POST", body: JSON.stringify({ app, payload, title }) },
    timeoutMs,
  );
}

export async function cloudGetShare(id: string, timeoutMs = 8000): Promise<ShareRecord> {
  return fetchJson<ShareRecord>(`/v1/insilico/share/${encodeURIComponent(id)}`, undefined, timeoutMs);
}

/* ─────────── Облачный AI (прокси к HF router) ─────────── */

export interface CloudChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** LLM через воркер (без токена юзера). Бросает при 429/501/недоступности. */
export async function cloudChat(
  messages: CloudChatMessage[],
  opts: { maxTokens?: number; temperature?: number; signal?: AbortSignal } = {},
): Promise<string> {
  const data = await fetchJson<{ ok: boolean; content: string }>(
    "/v1/insilico/ai/chat",
    {
      method: "POST",
      body: JSON.stringify({
        messages,
        maxTokens: opts.maxTokens,
        temperature: opts.temperature,
      }),
      signal: opts.signal,
    },
    60000,
  );
  if (!data.ok || !data.content) throw new Error("пустой ответ облачного AI");
  return data.content;
}

/** ESM-2 fill-mask через воркер. Формат ответа — как у HF Inference API. */
export async function cloudEsm(
  inputs: string,
  opts: { model?: string; signal?: AbortSignal } = {},
): Promise<unknown> {
  const data = await fetchJson<{ ok: boolean; data: unknown }>(
    "/v1/insilico/ai/esm",
    { method: "POST", body: JSON.stringify({ inputs, model: opts.model }) , signal: opts.signal },
    60000,
  );
  return data.data;
}

/** Доступна ли облачная AI-маршрутизация (по последнему probe). */
export function cloudAiAvailable(): boolean {
  return Boolean(probeCache?.reachable && probeCache.ai);
}
