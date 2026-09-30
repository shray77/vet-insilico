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

const DEFAULT_CLOUD_URL = process.env.NEXT_PUBLIC_VET_API_URL || "https://vet-api.shray77.workers.dev";

/**
 * Зеркала vet-api — обход РКН-блокировки *.workers.dev в РФ (без VPN).
 * Кандидаты перебираются по порядку до первого живого (кеш выбора 5 мин).
 * Как завести зеркало: см. mirror/ в репо shray77/vet-api (Supabase Edge
 * Functions, 10 минут, бесплатно) или кастомный домен на воркере.
 */
const CLOUD_MIRRORS: string[] = [
  "https://dmehnabcnesuublbftli.supabase.co/functions/v1/vet-api",
];

function getOverrideUrl(): string | null {
  if (typeof window !== "undefined") {
    try {
      const override = localStorage.getItem("vet:api_url");
      if (override) return override.replace(/\/+$/, "");
    } catch {}
  }
  return null;
}

/* ─── Выученная база: запоминаем рабочий канал на 24 ч ───
 * Без этого РФ-браузер платит таймаут workers.dev (~4.5 с) при каждой
 * попытке после истечения 5-минутного кеша. С «выученной» базой — один
 * раз в сутки; если она умерла — полный перебор и перезапись. */

const LEARNED_KEY = "vet:api_resolved";
const LEARNED_TTL_MS = 24 * 60 * 60 * 1000;

function getLearnedBase(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LEARNED_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { base?: unknown; at?: unknown };
    if (
      typeof p.base === "string" && p.base &&
      typeof p.at === "number" && Date.now() - p.at < LEARNED_TTL_MS
    ) {
      return p.base;
    }
  } catch {}
  return null;
}

function storeLearnedBase(base: string): void {
  try {
    localStorage.setItem(LEARNED_KEY, JSON.stringify({ base, at: Date.now() }));
  } catch {}
}

function clearLearnedBase(): void {
  try {
    localStorage.removeItem(LEARNED_KEY);
  } catch {}
}

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
/** После неудачной пробы всех каналов раньше держали дефолт 5 мин — РФ-браузер
 *  всё это время ловил мгновенный NetworkError. 60 с хватает. */
const NEGATIVE_TTL_MS = 60 * 1000;
let statusCache: CloudStatus | null = null;

/* ─── Разрешение базового URL: дефолт → зеркала (обход РКН) ─── */

let activeBase: string | null = null;
let resolvedAt = 0;
let resolveInFlight: Promise<string | null> | null = null;

/** Синхронный доступ к текущему базовому URL (до первого resolve — дефолт). */
export function cloudUrl(): string {
  return getOverrideUrl() ?? activeBase ?? DEFAULT_CLOUD_URL;
}

/** Быстрый статус одного кандидата: GET /v1/insilico/status с таймаутом.
 *  Без Content-Type: GET без тела и лишних заголовков — простой CORS-запрос,
 *  браузер не делает OPTIONS-префлайт (при RTT 1-2.5 с он удваивал латентность). */
async function probeStatus(base: string, timeoutMs = 4500): Promise<{ ok: boolean; data?: Record<string, unknown> }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/v1/insilico/status`, {
      signal: ctrl.signal,
    });
    if (!res.ok) return { ok: false };
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    return data?.ok ? { ok: true, data } : { ok: false };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Выбирает рабочий базовый URL: override (localStorage) → зеркала → дефолт.
 * Кеш 5 мин (негативный — 60 с). Override приоритетен, но exclude-хедж может
 * перепрыгнуть и его: мёртвый override хуже живого зеркала.
 * exclude — база, только что словившая сетевой фейл (вызов перебирает каналы).
 */
export async function resolveCloudBase(force = false, exclude?: string): Promise<string | null> {
  const pick = (b: string): string | null => (exclude && b === exclude ? null : b);
  const override = getOverrideUrl();
  if (override && pick(override)) return override;
  if (!exclude) {
    if (!force && activeBase && Date.now() - resolvedAt < PROBE_TTL_MS) return activeBase;
    if (!force && resolvedAt && Date.now() - resolvedAt < NEGATIVE_TTL_MS) return DEFAULT_CLOUD_URL;
  }
  if (resolveInFlight) return resolveInFlight;
  resolveInFlight = (async () => {
    // Быстрый старт: выученная база с прошлого раза — один проб вместо цепочки
    const learned = !force ? getLearnedBase() : null;
    if (learned && pick(learned)) {
      const st = await probeStatus(learned);
      if (st.ok) {
        activeBase = learned;
        resolvedAt = Date.now();
        return learned;
      }
    }
    // Порядок: дефолт первым — мир ходит напрямую на воркер, зеркало
    // нагружают только те, кто не смог достучаться (РФ: таймаут workers.dev
    // ~4.5 с раз в сутки, затем зеркало). Зеркало = личный free-tier проект.
    const candidates = [DEFAULT_CLOUD_URL, ...CLOUD_MIRRORS].filter((b) => b !== learned && pick(b));
    for (const base of candidates) {
      const st = await probeStatus(base);
      if (st.ok) {
        activeBase = base;
        resolvedAt = Date.now();
        storeLearnedBase(base);
        return base;
      }
    }
    // всё мертво — негатив-кеш 60 с; выученную базу сбрасываем, чтобы
    // в следующий цикл переучиться. exclude-вызов получает null и
    // просто ретроит исходную ошибку, а не молча бьётся в труп.
    clearLearnedBase();
    resolvedAt = Date.now();
    return exclude ? null : DEFAULT_CLOUD_URL;
  })().finally(() => {
    resolveInFlight = null;
  });
  return resolveInFlight;
}

async function fetchJsonBase<T>(base: string, path: string, init?: RequestInit, timeoutMs = 6000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      signal: ctrl.signal,
      // Content-Type шлём только с телом: GET без него — простой CORS-запрос
      // без OPTIONS-префлайта (при RTT 1-2.5 с префлайт удваивал латентность).
      headers: init?.body
        ? { "Content-Type": "application/json", ...(init?.headers ?? {}) }
        : init?.headers,
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

/** Сетевой фейл канала (РКН-ресет/офлайн/наш таймаут), а не ответ воркера. */
function isNetworkDead(e: unknown, signal?: AbortSignal | null): boolean {
  if (signal?.aborted) return false; // отмена/initiator — перебор не нужен
  if (e instanceof TypeError) return true; // NetworkError / Failed to fetch / Load failed
  return (e as { name?: string })?.name === "AbortError"; // наш таймаут
}

/** Хедж: если база по сети мертва, один раз перепрыгиваем на другой канал.
 *  HTTP-ошибки воркера (429/502…) не хеджируем — каналы ведут к одному воркеру. */
async function fetchJson<T>(path: string, init?: RequestInit, timeoutMs = 6000): Promise<T> {
  const signal = init?.signal;
  const primary = await resolveCloudBase();
  if (!primary) throw new Error("ни один облачный канал не доступен");
  try {
    return await fetchJsonBase<T>(primary, path, init, timeoutMs);
  } catch (e) {
    if (!isNetworkDead(e, signal)) throw e;
    const alt = await resolveCloudBase(true, primary);
    if (!alt || alt === primary) throw e;
    return await fetchJsonBase<T>(alt, path, init, timeoutMs);
  }
}

/** Быстрая диагностика воркера (через выбранное зеркало). Кеш 5 мин; недоступность — не ошибка, а статус. */
export async function probeCloud(force = false): Promise<CloudStatus> {
  if (!force && statusCache && Date.now() - statusCache.checkedAt < PROBE_TTL_MS) {
    return statusCache;
  }
  const t0 = Date.now();
  const base = await resolveCloudBase(force);
  if (!base) {
    statusCache = { reachable: false, ai: false, outbreaks: null, outbreaksUpdated: null, ms: Date.now() - t0, checkedAt: Date.now() };
    return statusCache;
  }
  const st = await probeStatus(base);
  if (st.ok && st.data) {
    statusCache = {
      reachable: true,
      ai: Boolean(st.data.ai),
      aiBackend: typeof st.data.aiBackend === "string" ? st.data.aiBackend : undefined,
      outbreaks: typeof st.data.outbreaks === "number" ? st.data.outbreaks : null,
      outbreaksUpdated: typeof st.data.outbreaksUpdated === "string" ? st.data.outbreaksUpdated : null,
      ms: Date.now() - t0,
      checkedAt: Date.now(),
    };
  } else {
    statusCache = { reachable: false, ai: false, outbreaks: null, outbreaksUpdated: null, ms: Date.now() - t0, checkedAt: Date.now() };
  }
  return statusCache;
}

/** Синхронный доступ к последнему probe (без запроса). */
export function lastCloudStatus(): CloudStatus | null {
  return statusCache;
}

/* ─────────── Статистика использования (публичная, без IP) ─────────── */

export interface CloudStats {
  ok: boolean;
  today: { aiChat: number; aiChatHits: number; aiEsm: number; shares: number };
  week: { date: string; aiChat: number; aiChatHits: number; aiEsm: number; shares: number }[];
  aiBackend?: string;
}

/** Агрегаты за 7 дней: AI-расчёты (эдж/HF), попадания в кеш, шары. Недоступность — не ошибка (null → strip скрыт). */
export async function fetchCloudStats(timeoutMs = 5000): Promise<CloudStats> {
  return fetchJson<CloudStats>("/v1/insilico/stats", undefined, timeoutMs);
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
  return Boolean(statusCache?.reachable && statusCache.ai);
}
