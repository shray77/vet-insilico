/**
 * HuggingFace Inference API client.
 *
 * Uses Qwen2.5-Coder-3B-Instruct (FOSS, Apache 2.0, 3B params) via nscale provider
 * for chat completions (OpenAI-compatible API) and ESM-2 for protein mask prediction.
 *
 * All requests go directly from the browser to https://router.huggingface.co
 * using the user-provided HF token (no backend involved).
 *
 * Models:
 *   - Qwen/Qwen2.5-Coder-3B-Instruct  (Apache 2.0, 3B params, multilingual, $0.01/1K in)
 *   - facebook/esm2_t6_8M_UR50D       (MIT, 8M params, protein language model, free)
 *
 * Pricing note: HF gives free inference credits; Qwen-Coder-3B at $0.01/$0.03 per 1K tokens
 * means ~16M tokens per $0.50 credit — enough for thousands of analyses.
 */

const HF_TOKEN_KEY = "vis-hf-token";
const ROUTER_BASE = "https://router.huggingface.co";
const LLM_MODEL = "Qwen/Qwen2.5-Coder-3B-Instruct";

/** Get stored HF token (or empty if not set). */
export function getHfToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(HF_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

/** Persist HF token to localStorage. */
export function setHfToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    if (token) localStorage.setItem(HF_TOKEN_KEY, token);
    else localStorage.removeItem(HF_TOKEN_KEY);
  } catch {}
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Call Qwen2.5-Coder-3B-Instruct via OpenAI-compatible chat completions API.
 * Returns the assistant's text response.
 */
export async function chatComplete(
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number; signal?: AbortSignal } = {},
): Promise<string> {
  const token = getHfToken();
  if (!token) {
    throw new Error("HF token не задан — откройте «Настройки ML» в шапке");
  }

  const res = await fetch(`${ROUTER_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Provider": "nscale",
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages,
      max_tokens: opts.maxTokens ?? 512,
      temperature: opts.temperature ?? 0.3,
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (res.status === 401) throw new Error("Неверный HF token");
    if (res.status === 402) throw new Error("Недостаточно кредитов на HuggingFace (пополните на huggingface.co/billing)");
    if (res.status === 429) throw new Error("Rate limit на HuggingFace (попробуйте через минуту)");
    throw new Error(`HF API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Пустой ответ от LLM");
  return content.trim();
}

/**
 * Predict masked amino acid probabilities using ESM-2 (8M params).
 *
 * Input must contain <mask> token. Returns top candidates with scores.
 *
 * Example: predictMaskedResidue("MKT<mask>YIAK") → [{token_str:"A", score:0.31}, ...]
 */
export async function predictMaskedResidue(
  sequence: string,
  opts: { signal?: AbortSignal } = {},
): Promise<{ token_str: string; score: number; sequence: string }[]> {
  const token = getHfToken();
  if (!token) throw new Error("HF token не задан");

  const res = await fetch(
    `${ROUTER_BASE}/hf-inference/models/facebook/esm2_t6_8M_UR50D`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: sequence }),
      signal: opts.signal,
    },
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`ESM-2 API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("ESM-2: неожиданный ответ");
  return data.map((d: any) => ({
    token_str: d.token_str,
    score: d.score,
    sequence: d.sequence,
  }));
}

/**
 * Compute "naturalness" score for a peptide via ESM-2.
 * Strategy: mask each position in turn, predict the actual residue, take mean prob.
 *
 * Higher score = more "natural" / conserved (typical of real protein).
 */
export async function peptideNaturalness(
  peptide: string,
  opts: { signal?: AbortSignal } = {},
): Promise<{ score: number; perResidue: { aa: string; prob: number }[] }> {
  const aa = peptide.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, "");
  if (aa.length < 3 || aa.length > 12) {
    throw new Error("ESM-2: длина пептида 3-12 а.о.");
  }

  const perResidue: { aa: string; prob: number }[] = [];

  for (let i = 0; i < aa.length; i++) {
    const masked = aa.slice(0, i) + "<mask>" + aa.slice(i + 1);
    try {
      const predictions = await predictMaskedResidue(masked, opts);
      const hit = predictions.find((p) => p.token_str === aa[i]);
      perResidue.push({ aa: aa[i], prob: hit?.score ?? 0 });
    } catch (e) {
      // Bail out — caller will handle
      throw e;
    }
  }

  const score = perResidue.reduce((a, b) => a + b.prob, 0) / perResidue.length;
  return { score: Number(score.toFixed(4)), perResidue };
}

/**
 * Check if HF token is valid by making a tiny test request.
 */
export async function validateHfToken(token: string): Promise<{ ok: boolean; error?: string; user?: string }> {
  try {
    const res = await fetch(`${ROUTER_BASE}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Provider": "nscale",
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      }),
    });
    if (res.status === 401) return { ok: false, error: "Неверный токен" };
    if (res.status === 402) return { ok: false, error: "Нет кредитов на HF (нужно пополнить)" };
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

/**
 * Generic LLM JSON analyzer — used by drug-repurposing, ADMET, etc.
 * Returns parsed JSON or throws.
 */
export async function analyzeWithLLM<T = any>(
  systemPrompt: string,
  userPrompt: string,
  opts: { maxTokens?: number; temperature?: number; signal?: AbortSignal } = {},
): Promise<T> {
  const raw = await chatComplete(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    opts,
  );
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("LLM не вернул JSON");
  try {
    return JSON.parse(jsonMatch[0]) as T;
  } catch {
    throw new Error("LLM вернул невалидный JSON");
  }
}
