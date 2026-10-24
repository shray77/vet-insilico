/**
 * ChEMBL reference channel — client-side loader and matching.
 *
 * Data source: public/data/chembl-reference.json — static snapshot of the
 * ChEMBL web API (molecule properties, approval phase, mechanisms) for the
 * app's drug list. Refreshed weekly by CI (scripts/chembl/fetch_chembl.mjs).
 *
 * The file is optional — all consumers must degrade gracefully.
 * Matching key: INN (exact, case-insensitive).
 */

export interface ChemblMechanism {
  action_type: string | null;
  target_chembl_id: string | null;
  target_name: string | null;
}

export interface ChemblProperties {
  full_mwt: number;
  alogp: number | null;
  hba: number | null;
  hbd: number | null;
  psa: number | null;
  rtb: number | null;
  aromatic_rings: number | null;
  heavy_atoms: number | null;
  num_ro5_violations: number | null;
}

export interface ChemblDrug {
  inn: string;
  chembl_id: string;
  pref_name: string | null;
  molecule_type: string | null;
  max_phase: number | string | null;
  first_approval: string | number | null;
  withdrawn_flag: boolean;
  therapeutic_flag: boolean;
  oral: boolean;
  parenteral: boolean;
  properties: ChemblProperties | null;
  mechanisms: ChemblMechanism[];
}

export interface ChemblData {
  source: string;
  version: string;
  generated: string;
  note: string;
  drugs: ChemblDrug[];
}

/** Fetch the static JSON; null on any problem (missing file, bad shape). */
export async function loadChemblData(): Promise<ChemblData | null> {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  try {
    const res = await fetch(`${base}/data/chembl-reference.json`, { cache: "no-store" });
    if (!res.ok) return null;
    const d = (await res.json()) as ChemblData;
    if (!Array.isArray(d.drugs)) return null;
    return d;
  } catch {
    return null;
  }
}

/** INN (case-insensitive) -> record index. Lookup via findChembl(). */
export function chemblIndex(data: ChemblData | null): Map<string, ChemblDrug> {
  const m = new Map<string, ChemblDrug>();
  if (!data) return m;
  for (const d of data.drugs) m.set(d.inn.toLowerCase(), d);
  return m;
}

/** Case-insensitive lookup in the index. */
export function findChembl(idx: Map<string, ChemblDrug>, inn: string): ChemblDrug | undefined {
  return idx.get(inn.trim().toLowerCase());
}

/** Numeric max_phase (API may return "4.0" strings; null stays null). */
export function phaseOf(d: ChemblDrug): number | null {
  if (d.max_phase == null || d.max_phase === "") return null;
  const n = Number(d.max_phase);
  return Number.isFinite(n) ? n : null;
}

/** Human-readable phase label. */
export function phaseLabelRu(d: ChemblDrug): string {
  const p = phaseOf(d);
  if (p === null) return "нет данных фазы";
  if (p >= 4) return "одобрен (фаза IV)";
  if (p === 3) return "фаза III";
  if (p === 2) return "фаза II";
  if (p === 1) return "фаза I";
  if (p === 0.5) return "доклиника";
  return `фаза ${p}`;
}

/** Approval year (first_approval may be "1996" or 1996). */
export function approvalYear(d: ChemblDrug): number | null {
  const n = Number(d.first_approval);
  return Number.isFinite(n) && n > 1800 ? n : null;
}

/** Difference between our heuristic descriptor and ChEMBL's, for the audit row. */
export function descriptorDelta(
  ours: number | null | undefined,
  theirs: number | null | undefined,
): number | null {
  if (ours == null || theirs == null) return null;
  return Number((ours - theirs).toFixed(2));
}

/** Signed formatted delta like "+1.2" / "−0.35" / "0". */
export function formatDelta(delta: number | null): string {
  if (delta === null) return "—";
  if (Math.abs(delta) < 0.005) return "0";
  return (delta > 0 ? "+" : "−") + Math.abs(delta);
}

/** Русификация типов действий ChEMBL для чипов. */
const ACTION_RU: Record<string, string> = {
  inhibitor: "ингибитор",
  antagonist: "антагонист",
  agonist: "агонист",
  "partial agonist": "частичный агонист",
  "inverse agonist": "обратный агонист",
  modulator: "модулятор",
  activator: "активатор",
  inducer: "индуктор",
  blocker: "блокатор",
  "channel blocker": "блокатор каналов",
  opener: "открыватель",
  "transporter inhibitor": "ингибитор переносчика",
  "negative allosteric modulator": "негативный аллостерический модулятор",
  "positive allosteric modulator": "позитивный аллостерический модулятор",
  substrate: "субстрат",
  binder: "лиганд",
  destabilizer: "дестабилизатор",
  chelator: "хелатор",
  "cross-linking agent": "сшивающий агент",
  "reducing agent": "восстановитель",
  oxidizer: "окислитель",
};

/** Mechanism lines like "ингибитор · Cyclooxygenase", deduped. */
export function mechanismLines(d: ChemblDrug): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of d.mechanisms) {
    const actionRaw = (m.action_type || "").toLowerCase();
    const action = ACTION_RU[actionRaw] ?? actionRaw;
    const target = m.target_name || m.target_chembl_id || "";
    const key = `${actionRaw}|${target}`;
    if (!actionRaw && !target) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push([action, target].filter(Boolean).join(" · "));
  }
  return out;
}

/** Link to the molecule report card on the ChEMBL web interface. */
export function chemblUrl(d: ChemblDrug): string {
  return `https://www.ebi.ac.uk/chembl/compound_report_card/${d.chembl_id}/`;
}
