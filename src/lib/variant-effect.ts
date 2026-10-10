/**
 * Variant Effect Prediction via ESM-2 Δ-log-likelihood.
 *
 * For each amino acid substitution, computes:
 *   ΔLL = log P(wild-type|masked) - log P(mutant|masked)
 *
 * Positive ΔLL = mutation is deleterious (less likely than wild-type).
 * Negative ΔLL = mutation is beneficial (more likely than wild-type).
 *
 * This is the standard deep-mutational-scanning metric (Meier et al. 2021).
 *
 * Uses ESM-2 650M (facebook/esm2_t33_650M_UR50D) via HF Inference API.
 * Free on HF free tier.
 */

import { getHfToken } from "./hf";

export interface VariantScore {
  /** Position (1-indexed). */
  position: number;
  /** Wild-type amino acid. */
  wildType: string;
  /** Mutant amino acid. */
  mutant: string;
  /** Δ-log-likelihood (positive = deleterious). */
  deltaLL: number;
  /** P(wild-type) from model. */
  wtProb: number;
  /** P(mutant) from model. */
  mutProb: number;
  /** Interpretation. */
  effect: "deleterious" | "neutral" | "beneficial";
  /** Confidence (how far from 0). */
  confidence: number;
}

export interface VariantEffectResult {
  /** Wild-type sequence. */
  sequence: string;
  /** All variant scores, sorted by ΔLL descending (most deleterious first). */
  variants: VariantScore[];
  /** Number of deleterious variants. */
  deleteriousCount: number;
  /** Number of beneficial variants. */
  beneficialCount: number;
  /** Mean ΔLL (overall direction of selection). */
  meanDeltaLL: number;
  /** Summary text. */
  summary: string;
}

const ESM2_MODEL = "facebook/esm2_t33_650M_UR50D";
const AMINO_ACIDS = "ACDEFGHIKLMNPQRSTVWY";

/**
 * Get ESM-2 logits at a masked position.
 * Returns probability distribution over all 20 amino acids.
 */
async function getResidueProbabilities(
  sequence: string,
  position: number, // 0-indexed
  signal?: AbortSignal,
): Promise<Record<string, number>> {
  const token = getHfToken();
  if (!token) throw new Error("HF token не задан");

  const masked = sequence.slice(0, position) + "<mask>" + sequence.slice(position + 1);
  const url = `https://router.huggingface.co/hf-inference/models/${ESM2_MODEL}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: masked }),
    signal,
  });

  if (!resp.ok) throw new Error(`ESM-2 API error: HTTP ${resp.status}`);

  const data = await resp.json();

  // Parse fill-mask response: [{score, token, token_str}, ...]
  const predictions = Array.isArray(data) ? data : [data];
  const probs: Record<string, number> = {};

  for (const pred of predictions) {
    if (pred.token_str && typeof pred.score === "number") {
      const aa = pred.token_str.trim().toUpperCase();
      if (AMINO_ACIDS.includes(aa)) {
        probs[aa] = pred.score;
      }
    }
  }

  return probs;
}

/**
 * Score a single variant: ΔLL = log P(wt) - log P(mut).
 *
 * @param sequence - wild-type protein sequence
 * @param position - 1-indexed position
 * @param mutantAA - mutant amino acid (single letter)
 * @param signal - AbortSignal
 */
export async function scoreVariant(
  sequence: string,
  position: number,
  mutantAA: string,
  signal?: AbortSignal,
): Promise<VariantScore> {
  const pos0 = position - 1; // 0-indexed
  if (pos0 < 0 || pos0 >= sequence.length) {
    throw new Error(`Position ${position} out of range (1-${sequence.length})`);
  }

  const wtAA = sequence[pos0].toUpperCase();
  const mutAA = mutantAA.toUpperCase().trim();

  if (!AMINO_ACIDS.includes(mutAA)) {
    throw new Error(`Invalid amino acid: ${mutantAA}`);
  }

  if (wtAA === mutAA) {
    return {
      position,
      wildType: wtAA,
      mutant: mutAA,
      deltaLL: 0,
      wtProb: 1,
      mutProb: 1,
      effect: "neutral",
      confidence: 0,
    };
  }

  // Get probabilities at this position
  const probs = await getResidueProbabilities(sequence, pos0, signal);

  const wtProb = probs[wtAA] ?? 0.001; // clamp to avoid -inf
  const mutProb = probs[mutAA] ?? 0.001;

  const deltaLL = Math.log(Math.max(wtProb, 1e-10)) - Math.log(Math.max(mutProb, 1e-10));

  let effect: "deleterious" | "neutral" | "beneficial";
  if (deltaLL > 2) effect = "deleterious";
  else if (deltaLL < -2) effect = "beneficial";
  else effect = "neutral";

  return {
    position,
    wildType: wtAA,
    mutant: mutAA,
    deltaLL: Number(deltaLL.toFixed(3)),
    wtProb: Number(wtProb.toFixed(4)),
    mutProb: Number(mutProb.toFixed(4)),
    effect,
    confidence: Number(Math.abs(deltaLL).toFixed(3)),
  };
}

/**
 * Score multiple variants in batches.
 *
 * @param sequence - wild-type protein sequence
 * @param variants - array of "position mutantAA" (e.g., "103 H" means pos 103 → H)
 * @param signal - AbortSignal
 * @param onProgress - callback (done, total)
 */
export async function scoreVariantSet(
  sequence: string,
  variants: { position: number; mutant: string }[],
  options: {
    signal?: AbortSignal;
    onProgress?: (done: number, total: number) => void;
  } = {},
): Promise<VariantEffectResult> {
  const { signal, onProgress } = options;

  if (variants.length === 0) {
    throw new Error("Нет вариантов для анализа");
  }

  // Group variants by position (batch same-position variants into one API call)
  const byPosition = new Map<number, string[]>();
  for (const v of variants) {
    if (!byPosition.has(v.position)) byPosition.set(v.position, []);
    const arr = byPosition.get(v.position);
    if (arr) arr.push(v.mutant);
  }

  const positions = Array.from(byPosition.keys());
  const results: VariantScore[] = [];
  let done = 0;

  // Process in batches of 5 (ESM-2 650M is heavier than 35M)
  const BATCH_SIZE = 5;
  for (let i = 0; i < positions.length; i += BATCH_SIZE) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const batch = positions.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (pos) => {
      const pos0 = pos - 1;
      const wtAA = sequence[pos0].toUpperCase();
      const mutants = byPosition.get(pos)!;

      try {
        const probs = await getResidueProbabilities(sequence, pos0, signal);
        return mutants.map((mutAA) => {
          const mutAAUpper = mutAA.toUpperCase().trim();
          const wtProb = probs[wtAA] ?? 0.001;
          const mutProb = probs[mutAAUpper] ?? 0.001;
          const deltaLL = Math.log(Math.max(wtProb, 1e-10)) - Math.log(Math.max(mutProb, 1e-10));

          let effect: "deleterious" | "neutral" | "beneficial";
          if (deltaLL > 2) effect = "deleterious";
          else if (deltaLL < -2) effect = "beneficial";
          else effect = "neutral";

          return {
            position: pos,
            wildType: wtAA,
            mutant: mutAAUpper,
            deltaLL: Number(deltaLL.toFixed(3)),
            wtProb: Number(wtProb.toFixed(4)),
            mutProb: Number(mutProb.toFixed(4)),
            effect,
            confidence: Number(Math.abs(deltaLL).toFixed(3)),
          } as VariantScore;
        });
      } catch {
        return mutants.map((mutAA) => ({
          position: pos,
          wildType: wtAA,
          mutant: mutAA.toUpperCase().trim(),
          deltaLL: 0,
          wtProb: 0,
          mutProb: 0,
          effect: "neutral" as const,
          confidence: 0,
        }));
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.flat());
    done += batch.length;
    onProgress?.(done, positions.length);
  }

  // Sort by ΔLL descending (most deleterious first)
  results.sort((a, b) => b.deltaLL - a.deltaLL);

  const deleteriousCount = results.filter((r) => r.effect === "deleterious").length;
  const beneficialCount = results.filter((r) => r.effect === "beneficial").length;
  const meanDeltaLL = results.reduce((s, r) => s + r.deltaLL, 0) / results.length;

  let summary: string;
  if (deleteriousCount > results.length * 0.3) {
    summary = `⚠️ ${deleteriousCount} из ${results.length} мутаций предсказаны как делеиторные. Возможна потеря функции белка.`;
  } else if (beneficialCount > results.length * 0.3) {
    summary = `📈 ${beneficialCount} из ${results.length} мутаций предсказаны как выгодные. Возможна адаптивная эволюция.`;
  } else {
    summary = `✅ Большинство мутаций нейтральны. ${deleteriousCount} делеиторных, ${beneficialCount} выгодных из ${results.length}.`;
  }

  return {
    sequence,
    variants: results,
    deleteriousCount,
    beneficialCount,
    meanDeltaLL: Number(meanDeltaLL.toFixed(3)),
    summary,
  };
}

/**
 * Parse variant input string.
 * Accepts formats: "H103Y", "D225G", "103 H Y", "103H>Y"
 */
export function parseVariantInput(input: string): { position: number; mutant: string }[] {
  const variants: { position: number; mutant: string }[] = [];
  const lines = input.split(/[\n,;]/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Try format: WTposMUT (e.g., "H103Y")
    let match = trimmed.match(/^([A-Za-z])(\d+)([A-Za-z])$/);
    if (match) {
      variants.push({ position: parseInt(match[2], 10), mutant: match[3] });
      continue;
    }

    // Try format: pos MUT (e.g., "103 Y")
    match = trimmed.match(/^(\d+)\s+([A-Za-z])$/);
    if (match) {
      variants.push({ position: parseInt(match[1], 10), mutant: match[2] });
      continue;
    }

    // Try format: posWT>MUT (e.g., "103H>Y")
    match = trimmed.match(/^(\d+)([A-Za-z])>([A-Za-z])$/);
    if (match) {
      variants.push({ position: parseInt(match[1], 10), mutant: match[3] });
      continue;
    }
  }

  return variants;
}
