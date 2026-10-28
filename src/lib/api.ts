/**
 * API client for VetInSilico Backend (HF Spaces).
 *
 * Backend: https://shrayyyy-vet-insilico-backend.hf.space
 * Provides real bioinformatics: RDKit docking + smina/Vina docking.
 *
 * Falls back to in-browser algorithms if backend is unavailable (cold start, etc).
 */

// Backend URL — can be overridden via NEXT_PUBLIC_BACKEND_URL env var
// (useful when the default HF Space is down or cold-starting).
// Also check localStorage for runtime override (set via HfTokenModal).
// Base резолвится на КАЖДЫЙ вызов (по образцу cloudUrl() в cloud.ts) —
// смена override в рантайме подхватывается без перезагрузки страницы.
const DEFAULT_BACKEND = "https://shrayyyy-vet-insilico-backend.hf.space";
function getBackendUrl(): string {
  // Check localStorage for runtime override first
  if (typeof window !== "undefined") {
    const override = localStorage.getItem("vet:backend_url");
    if (override) return override;
  }
  return process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND;
}
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
  const res = await fetchWithTimeout(`${getBackendUrl()}/api/docking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ smiles, drug_name: drugName, target_name: targetName }),
  });
  if (!res.ok) throw new Error(`Backend ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── Vina Docking (smina/Vina) ──────────────────────────────────────

export interface VinaDockingResult {
  engine: string;
  vina_available: boolean;
  drug: { name: string; smiles: string; canonical_smiles: string; inchi_key: string };
  target: string;
  pdb_id: string;
  descriptors: Record<string, number>;
  vina_results: {
    best_affinity_kcal_mol: number;
    num_poses: number;
    poses: { rank: number; affinity_kcal_mol: number; rmsd_lb: number; rmsd_ub: number }[];
    box_center: number[];
    box_size: number[];
    exhaustiveness: number;
    elapsed_seconds: number;
  };
  drug_likeness: number;
  lipinski: { pass: boolean; violations: number };
  alerts: string[];
}

export async function apiVinaDocking(
  pdbId: string,
  smiles: string,
  drugName?: string,
  targetName?: string,
  opts: { boxSize?: number[]; exhaustiveness?: number; numPoses?: number } = {},
): Promise<VinaDockingResult> {
  const res = await fetchWithTimeout(`${getBackendUrl()}/api/vina-docking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pdb_id: pdbId,
      smiles,
      drug_name: drugName,
      target_name: targetName,
      box_size: opts.boxSize ?? [25, 25, 25],
      exhaustiveness: opts.exhaustiveness ?? 8,
      num_poses: opts.numPoses ?? 5,
    }),
  }, 120000); // 2 min timeout — docking can be slow
  if (!res.ok) throw new Error(`Backend ${res.status}: ${await res.text()}`);
  return res.json();
}
