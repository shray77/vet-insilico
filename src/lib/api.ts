/**
 * API client for VetInSilico Backend (HF Spaces).
 *
 * Backend: https://shrayyyy-vet-insilico-backend.hf.space
 * Provides real bioinformatics: RDKit, Primer3-py, BioPython.
 *
 * Falls back to in-browser algorithms if backend is unavailable (cold start, etc).
 */

const API_BASE = "https://shrayyyy-vet-insilico-backend.hf.space";
const TIMEOUT_MS = 30000; // 30s — HF Spaces cold start can take 30-60s

async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeout = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// ─── Docking (RDKit) ────────────────────────────────────────────────

export interface DockingAPIResult {
  drug: { name: string; smiles: string; canonical_smiles: string; inchi_key: string };
  target: string;
  descriptors: {
    mw: number; logp: number; tpsa: number; hbd: number; hba: number;
    rotatable_bonds: number; aromatic_rings: number; heavy_atoms: number;
    num_rings: number; fraction_csp3: number; formal_charge: number;
  };
  drug_likeness: number;
  lipinski: { pass: boolean; violations: number };
  veber_pass: boolean;
  binding_affinity_kcal_mol: number;
  score: number;
  alerts: string[];
}

export async function apiDocking(smiles: string, drugName?: string, targetName?: string): Promise<DockingAPIResult> {
  const res = await fetchWithTimeout(`${API_BASE}/api/docking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ smiles, drug_name: drugName, target_name: targetName }),
  });
  if (!res.ok) throw new Error(`Backend ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── ADMET (RDKit) ──────────────────────────────────────────────────

export interface ADMETAPIResult {
  drug_name: string;
  smiles: string;
  descriptors: Record<string, number>;
  admet: {
    oral_bioavailability: number;
    bbb_permeability: { score: number; level: string };
    caco2: number;
    ppb: number;
    herg_risk: number;
    ames_risk: number;
    hepatotoxicity_risk: number;
    cyp3a4_substrate: number;
    cyp3a4_inhibitor: number;
    bioaccumulation: number;
  };
  drug_likeness: number;
  alerts: string[];
}

export async function apiADMET(smiles: string, drugName?: string): Promise<ADMETAPIResult> {
  const res = await fetchWithTimeout(`${API_BASE}/api/admet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ smiles, drug_name: drugName }),
  });
  if (!res.ok) throw new Error(`Backend ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── Alignment (BioPython) ──────────────────────────────────────────

export interface AlignmentAPIResult {
  aligned_a: string;
  aligned_b: string;
  match_line: string;
  score: number;
  identity: number;
  similarity: number;
  gaps: number;
  length: number;
  algorithm: string;
  seq_type: string;
}

export async function apiAlignment(
  seqA: string, seqB: string,
  seqType: "protein" | "dna" = "protein",
  algorithm: "needleman-wunsch" | "smith-waterman" = "needleman-wunsch",
): Promise<AlignmentAPIResult> {
  const res = await fetchWithTimeout(`${API_BASE}/api/alignment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seq_a: seqA, seq_b: seqB, seq_type: seqType, algorithm }),
  });
  if (!res.ok) throw new Error(`Backend ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── Primer (Primer3-py) ────────────────────────────────────────────

export interface PrimerAPIPair {
  rank: number;
  forward: {
    sequence: string; tm: number; gc: number; length: number;
    position: number; hairpin_th: number; self_dimer_th: number; penalty: number;
  };
  reverse: {
    sequence: string; tm: number; gc: number; length: number;
    position: number; hairpin_th: number; self_dimer_th: number; penalty: number;
  };
  amplicon_size: number;
  tm_difference: number;
  pair_complementarity: number;
  score: number;
}

export interface PrimerAPIResult {
  sequence_length: number;
  num_pairs: number;
  pairs: PrimerAPIPair[];
  engine: string;
  explanation: { left: string; right: string; pair: string };
}

export async function apiPrimer(
  sequence: string,
  opts: { targetTm?: number; minLen?: number; maxLen?: number; minProduct?: number; maxProduct?: number; numPairs?: number } = {},
): Promise<PrimerAPIResult> {
  const res = await fetchWithTimeout(`${API_BASE}/api/primer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sequence,
      target_tm: opts.targetTm ?? 58,
      min_len: opts.minLen ?? 18,
      max_len: opts.maxLen ?? 22,
      min_product: opts.minProduct ?? 150,
      max_product: opts.maxProduct ?? 600,
      num_pairs: opts.numPairs ?? 10,
    }),
  }, 60000); // Primer3 can take longer
  if (!res.ok) throw new Error(`Backend ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── Health check ───────────────────────────────────────────────────

export async function apiHealth(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/health`, {}, 10000);
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Backend URL (for display) ──────────────────────────────────────

export const BACKEND_URL = API_BASE;
