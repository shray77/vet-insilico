#!/usr/bin/env node
/**
 * ChEMBL reference fetch for VetInSilico (Task 152).
 *
 * Reads INN list from src/data/drugs.ts, queries the ChEMBL web API
 * (molecule by pref_name + mechanism records), and writes a static
 * RF-friendly snapshot: public/data/chembl-reference.json.
 *
 * Design:
 *  - version comes from /status.json at runtime (we do NOT hardcode "35":
 *    ChEMBL releases a couple of times a year; the app shows the real one)
 *  - one row per DRUGS entry that resolves to a ChEMBL molecule
 *  - ~0.3 rps politeness delay; whole run ~2-3 min for 202 INNs
 *  - graceful: missing molecules are skipped, mechanism is optional
 */

import { readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("../..", import.meta.url).pathname;
const DRUGS_TS = `${ROOT}src/data/drugs.ts`;
const OUT = `${ROOT}public/data/chembl-reference.json`;
const API = "https://www.ebi.ac.uk/chembl/api/data";
const DELAY_MS = Number(process.env.CHEMBL_DELAY_MS ?? 280);
const TIMEOUT_MS = 30_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function extractInns(src) {
  const out = [];
  const re = /inn:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(src))) out.push(m[1]);
  return out;
}

async function main() {
  const status = await getJson(`${API}/status.json`).catch(() => ({}));
  const version = status.chembl_db_version || "unknown";
  console.log(`ChEMBL version: ${version}`);

  const src = readFileSync(DRUGS_TS, "utf8");
  const inns = extractInns(src);
  console.log(`drugs.ts INNs: ${inns.length}`);

  const rows = [];
  let found = 0;
  let mechanisms = 0;

  for (const inn of inns) {
    let mol = null;
    try {
      const d = await getJson(
        `${API}/molecule.json?pref_name__iexact=${encodeURIComponent(inn)}&limit=1`,
      );
      mol = (d.molecules || [])[0] || null;
    } catch (e) {
      console.error(`  molecule ${inn}: ${e.message}`);
    }
    await sleep(DELAY_MS);

    if (!mol) continue;
    found++;

    // mechanism (optional; many vet drugs lack curated mechanisms)
    let mech = [];
    try {
      const d = await getJson(
        `${API}/mechanism.json?molecule_chembl_id=${mol.molecule_chembl_id}&limit=20`,
      );
      mech = (d.mechanisms || []).map((mm) => ({
        action_type: mm.action_type ?? null,
        target_chembl_id: mm.target_chembl_id ?? null,
        target_name: null, // filled below
        references: (mm.mechanism_refs || [])
          .map((r) => `${r.ref_type} ${r.ref_id}`)
          .slice(0, 3),
      }));
      if (mech.length) mechanisms += mech.length;
    } catch {
      /* mechanism is optional */
    }
    await sleep(DELAY_MS);

    // resolve unique target names
    const targets = {};
    for (const m of mech) {
      if (m.target_chembl_id && !targets[m.target_chembl_id]) {
        try {
          const t = await getJson(
            `${API}/target.json?target_chembl_id=${m.target_chembl_id}&limit=1`,
          );
          targets[m.target_chembl_id] = t.targets?.[0]?.pref_name ?? null;
        } catch {
          targets[m.target_chembl_id] = null;
        }
        await sleep(DELAY_MS);
      }
    }
    for (const m of mech) m.target_name = targets[m.target_chembl_id] ?? null;

    const p = mol.molecule_properties || {};
    rows.push({
      inn,
      chembl_id: mol.molecule_chembl_id,
      pref_name: mol.pref_name ?? null,
      molecule_type: mol.molecule_type ?? null,
      max_phase: mol.max_phase ?? null,
      first_approval: mol.first_approval ?? null,
      withdrawn_flag: !!mol.withdrawn_flag,
      therapeutic_flag: !!mol.therapeutic_flag,
      oral: !!mol.oral,
      parenteral: !!mol.parenteral,
      properties: p.full_mwt
        ? {
            full_mwt: Number(p.full_mwt),
            alogp: p.alogp != null ? Number(p.alogp) : null,
            hba: p.hba != null ? Number(p.hba) : null,
            hbd: p.hbd != null ? Number(p.hbd) : null,
            psa: p.psa != null ? Number(p.psa) : null,
            rtb: p.rtb != null ? Number(p.rtb) : null,
            aromatic_rings: p.aromatic_rings != null ? Number(p.aromatic_rings) : null,
            heavy_atoms: p.heavy_atoms != null ? Number(p.heavy_atoms) : null,
            num_ro5_violations: p.num_ro5_violations != null ? Number(p.num_ro5_violations) : null,
          }
        : null,
      mechanisms: mech,
    });
    if (found % 25 === 0) console.log(`  resolved ${found}/${inns.length}`);
  }

  const doc = {
    source: "ChEMBL web API (https://www.ebi.ac.uk/chembl/)",
    version,
    generated: new Date().toISOString(),
    note: "Статический срез для офлайн/РФ-доступности; обновляется недельным CI-раном. Свойства ChEMBL считает RDKit по каноническим структурам — сверяйте с локальными дескрипторами.",
    drugs: rows,
  };
  writeFileSync(OUT, JSON.stringify(doc, null, 2) + "\n");
  console.log(
    `Done: ${found}/${inns.length} molecules, ${mechanisms} mechanisms, version ${version} -> ${OUT}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
