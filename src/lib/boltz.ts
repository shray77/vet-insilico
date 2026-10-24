/**
 * Boltz-2 affinity channel — client-side loader and formatting.
 *
 * Data source: public/data/boltz-affinities.json — static file regenerated
 * by the nightly GitHub Actions run (scripts/boltz_pilot/run_pilot.py,
 * workflow boltz-affinity.yml). CPU inference, boltz==2.2.1.
 *
 * Units (per Boltz-2 docs):
 *   affinity_pred_value = log10(IC50 [µM]) — lower = stronger binder
 *   delta_g_kcal_mol    = (6 − y) × 1.364  — more negative = stronger
 *
 * The file is optional and may be empty (`pairs: []`) before the first
 * nightly run — all consumers must degrade gracefully.
 */

export interface BoltzConfidence {
  confidence_score: number | null;
  iptm: number | null;
  ligand_iptm: number | null;
  complex_plddt: number | null;
}

export interface BoltzPair {
  drug_id: string;
  inn: string;
  target_id: string;
  target_name: string;
  pdb_id: string;
  chains: string[];
  kind: "validated" | "hypothesis";
  reference: { ic50_um: number; note: string } | null;
  hypothesis?: string;
  status: "ok" | "error";
  /** log10(IC50 [µM]) — only for status === "ok" */
  affinity_pred_value?: number;
  affinity_probability_binary?: number;
  ic50_um_est?: number;
  delta_g_kcal_mol?: number;
  confidence?: BoltzConfidence;
  runtime_s?: number;
  error?: string;
}

export interface BoltzData {
  model: string;
  generated: string | null;
  params: Record<string, unknown>;
  units: Record<string, string>;
  pairs: BoltzPair[];
}

/** Fetch the static JSON; null on any problem (missing file, bad shape).
 *  Respects the production basePath (/vet-insilico). */
export async function loadBoltzData(): Promise<BoltzData | null> {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  try {
    const res = await fetch(`${base}/data/boltz-affinities.json`, { cache: "no-store" });
    if (!res.ok) return null;
    const d = (await res.json()) as BoltzData;
    if (typeof d.model !== "string" || !Array.isArray(d.pairs)) return null;
    return d;
  } catch {
    return null;
  }
}

/** Map key for pair lookup in result tables. */
export function pairKey(drugId: string, targetId: string): string {
  return `${drugId}|${targetId}`;
}

/** Build (drug_id | target_id) -> pair index for OK pairs only. */
export function boltzIndex(data: BoltzData | null): Map<string, BoltzPair> {
  const m = new Map<string, BoltzPair>();
  if (!data) return m;
  for (const p of data.pairs) {
    if (p.status === "ok" && typeof p.affinity_pred_value === "number") {
      m.set(pairKey(p.drug_id, p.target_id), p);
    }
  }
  return m;
}

/**
 * Human-readable IC50: sub-µM values in nM, big ones in µM/mM.
 * Input is the estimated IC50 in µM. Trailing ".0" is dropped.
 */
export function formatIc50(ic50Um: number): string {
  if (ic50Um < 1) {
    const nm = ic50Um * 1000;
    return `${nm < 10 ? Number(nm.toFixed(1)) : Math.round(nm)} нМ`;
  }
  if (ic50Um < 100) {
    return `${ic50Um < 20 ? Number(ic50Um.toFixed(1)) : Math.round(ic50Um)} мкМ`;
  }
  return `${Math.round(ic50Um / 1000)} мМ`;
}

/** Strength buckets for coloring (log IC50 µM thresholds). */
export type BoltzStrength = "strong" | "good" | "moderate" | "weak";

export function strengthOf(ic50Um: number): BoltzStrength {
  if (ic50Um < 0.01) return "strong"; // < 10 nM
  if (ic50Um < 1) return "good"; // < 1 µM
  if (ic50Um < 50) return "moderate"; // < 50 µM
  return "weak";
}

/** Data-viz palette (categorical, DS-exempt per vet-ds rules v2.0). */
export const STRENGTH_COLOR: Record<BoltzStrength, string> = {
  strong: "#16a34a",
  good: "#0d9488",
  moderate: "#ca8a04",
  weak: "#dc2626",
};

export const STRENGTH_LABEL_RU: Record<BoltzStrength, string> = {
  strong: "сильное",
  good: "хорошее",
  moderate: "умеренное",
  weak: "слабое",
};

/** Difference vs experimental reference, in log10 units. */
export function referenceDelta(pair: BoltzPair): number | null {
  if (!pair.reference || typeof pair.affinity_pred_value !== "number") return null;
  const pred = pair.affinity_pred_value; // log10 µM
  const ref = Math.log10(pair.reference.ic50_um);
  return Number((pred - ref).toFixed(2));
}
