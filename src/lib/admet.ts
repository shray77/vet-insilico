/**
 * ADMET predictor — Absorption, Distribution, Metabolism, Excretion, Toxicity.
 *
 * Simplified rule-based estimation from molecular descriptors (MW, LogP, HBD, HBA,
 * rotatable bonds, charge). All in browser, no API.
 *
 * Sources of heuristic rules:
 *   - Lipinski CA (2004) — Rule of Five
 *   - Veber DF (2002) — rotatable bonds / PSA
 *   - Egan WJ, Lauri G (2002) — BBB permeability
 *   - Hughes JD (2008) — Caco-2 / oral bioavailability
 *   - Wang J et al. — logS estimation
 *   - hERG blocker rules (Dsouza 2011)
 *
 * Output is a qualitative panel (LOW/MODERATE/HIGH) + numeric estimate where applicable.
 * NOT for clinical use — for hypothesis generation only.
 */

import type { Drug } from "@/data/drugs";

export type AdmetLevel = "low" | "moderate" | "high";

export interface AdmetResult {
  /** Oral bioavailability (0-100, qualitative). */
  oralBioavailability: number;
  oralBioavailabilityLevel: AdmetLevel;
  /** Blood-brain barrier penetration. */
  bbbPermeability: number; // -2 (no) to +2 (high)
  bbbPermeabilityLevel: AdmetLevel;
  /** Caco-2 apparent permeability (×10⁻⁶ cm/s). */
  caco2: number;
  caco2Level: AdmetLevel;
  /** Plasma protein binding (0-100%). */
  ppb: number;
  ppbLevel: AdmetLevel;
  /** Volume of distribution (L/kg). */
  vd: number;
  vdLevel: AdmetLevel;
  /** Hepatic extraction ratio (0-1). */
  hepaticExtraction: number;
  /** Renal clearance fraction (0-1). */
  renalClearance: number;
  /** Aqueous solubility logS (mol/L). */
  logS: number;
  solubilityLevel: AdmetLevel;
  /** hERG channel blockage risk (cardiotoxicity). */
  hergRisk: number;
  hergRiskLevel: AdmetLevel;
  /** AMES mutagenicity risk (0-1). */
  amesRisk: number;
  amesRiskLevel: AdmetLevel;
  /** Hepatotoxicity risk (0-1). */
  hepatotoxicityRisk: number;
  hepatotoxicityRiskLevel: AdmetLevel;
  /** Skin sensitization risk (0-1). */
  skinSensitization: number;
  skinSensitizationLevel: AdmetLevel;
  /** CYP3A4 substrate likelihood (0-1). */
  cyp3a4Substrate: number;
  /** CYP3A4 inhibitor likelihood (0-1). */
  cyp3a4Inhibitor: number;
  /** Environmental persistence (bioaccumulation, 0-1). */
  bioaccumulation: number;
  bioaccumulationLevel: AdmetLevel;
  /** Overall drug-likeness score 0-100. */
  drugLikeness: number;
  /** List of alerts (structural / property flags). */
  alerts: string[];
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

function level(value: number, thresholds: [number, number]): AdmetLevel {
  // returns 'low' if below thresholds[0], 'high' if above thresholds[1], else 'moderate'
  if (value < thresholds[0]) return "low";
  if (value > thresholds[1]) return "high";
  return "moderate";
}

export function predictADMET(drug: Drug): AdmetResult {
  const alerts: string[] = [];

  // ──────── ORAL BIOAVAILABILITY ────────
  // Rule of Five + Veber: penalize violations
  let oral = 80;
  if (drug.mw > 500) oral -= (drug.mw - 500) / 10;
  if (drug.logp > 5) oral -= (drug.logp - 5) * 6;
  if (drug.logp < 0) oral -= (0 - drug.logp) * 4;
  if (drug.hbd > 5) oral -= (drug.hbd - 5) * 4;
  if (drug.hba > 10) oral -= (drug.hba - 10) * 2;
  if (drug.rotatable_bonds > 10) oral -= (drug.rotatable_bonds - 10) * 3;
  if (Math.abs(drug.charge) === 2) oral -= 15;
  if (Math.abs(drug.charge) >= 3) oral -= 30;
  if (drug.mw > 1000) oral -= 20; // biologics — poor oral
  oral = clamp(Math.round(oral), 5, 95);

  if (drug.mw > 500) alerts.push("MW > 500 Да — сниженная всасываемость");
  if (drug.logp > 5) alerts.push("LogP > 5 — плохая растворимость");
  if (drug.hbd > 5) alerts.push("HBD > 5 — низкая проницаемость");
  if (drug.rotatable_bonds > 10) alerts.push("> 10 вращаемых связей — низкая биодоступность (правило Вебера)");

  // ──────── BBB PERMEABILITY ────────
  // Egan & Lauri: optimal LogP 1-3, MW < 400, no charges
  let bbb = 0;
  if (drug.mw < 400) bbb += 1; else bbb -= (drug.mw - 400) / 200;
  if (drug.logp >= 1 && drug.logp <= 3) bbb += 1;
  else if (drug.logp > 3 && drug.logp <= 5) bbb += 0.3;
  else if (drug.logp < 1) bbb -= 0.5;
  else bbb -= 1;
  if (drug.charge !== 0) bbb -= 1.5;
  if (drug.hbd > 3) bbb -= 0.5;
  bbb = clamp(bbb, -2, 2);

  // ──────── CACO-2 PERMEABILITY ────────
  // Simplified: Papp ≈ 8 - 0.04*PSA + 0.5*LogP
  // PSA approximation from HBD+HBA: PSA ≈ 12*(HBD + 0.4*HBA)
  const psa = 12 * (drug.hbd + 0.4 * drug.hba);
  let caco2 = 8 - 0.04 * psa + 0.5 * drug.logp;
  if (drug.mw > 500) caco2 -= 1;
  if (drug.charge !== 0) caco2 -= 2;
  caco2 = clamp(caco2, 0.1, 30);

  // ──────── PLASMA PROTEIN BINDING ────────
  // Mostly driven by LogP (acidic drugs bind albumin)
  let ppb = 30 + drug.logp * 12;
  if (drug.charge < 0) ppb += 10;
  if (drug.charge > 0) ppb -= 5;
  if (drug.mw > 500) ppb += 5;
  ppb = clamp(Math.round(ppb), 5, 99);

  // ──────── VOLUME OF DISTRIBUTION ────────
  // Acidic drugs (negative charge): low Vd ~0.2 L/kg
  // Basic drugs (positive charge): high Vd ~3-5 L/kg
  // Neutral: moderate ~1 L/kg
  let vd = 1.0;
  if (drug.charge < 0) vd = 0.2 + drug.logp * 0.02;
  else if (drug.charge > 0) vd = 2.0 + drug.logp * 0.5;
  else vd = 0.5 + drug.logp * 0.2;
  vd = clamp(vd, 0.1, 15);

  // ──────── HEPATIC vs RENAL CLEARANCE ────────
  // High LogP → hepatic; high polar surface / HBD+HBA → renal
  let hepatic = 0.3 + drug.logp * 0.1;
  let renal = 0.7 - drug.logp * 0.1;
  if (drug.charge !== 0) { renal += 0.15; hepatic -= 0.1; }
  hepatic = clamp(hepatic, 0.05, 0.9);
  renal = clamp(renal, 0.05, 0.9);

  // ──────── LOG S (solubility) ────────
  // General solubility equation: logS ≈ 0.5 - 0.01(MW-20) - LogP
  let logS = 0.5 - 0.01 * (drug.mw - 20) - drug.logp;
  if (drug.charge !== 0) logS += 2; // salts dissolve well

  // ──────── hERG RISK ────────
  // Basic amines + high LogP + aromatic = hERG blockers (Dsouza 2011)
  let herg = 0;
  if (drug.charge > 0) herg += 0.3;
  if (drug.logp > 3) herg += 0.25;
  if (drug.logp > 5) herg += 0.15;
  if (drug.mw > 400) herg += 0.1;
  if (drug.hba > 4) herg += 0.1;
  herg = clamp(herg, 0, 0.95);
  if (herg > 0.5) alerts.push("Высокий риск блокады hERG (удлинение QT)");

  // ──────── AMES MUTAGENICITY ────────
  // Aromatic amines, nitro groups, alkylating agents — simplified heuristic
  let ames = 0.1;
  if (drug.pharm_group.toLowerCase().includes("нитро")) ames += 0.4;
  if (drug.pharm_group.toLowerCase().includes("алкил")) ames += 0.3;
  if (drug.logp > 4) ames += 0.1;
  if (drug.charge > 0 && drug.mw < 300) ames += 0.15;
  ames = clamp(ames, 0, 0.9);

  // ──────── HEPATOTOXICITY ────────
  let hepatotox = 0.15;
  if (drug.logp > 3) hepatotox += 0.2;
  if (drug.pharm_group.toLowerCase().includes("сульфан")) hepatotox += 0.25;
  if (drug.pharm_group.toLowerCase().includes("макролид")) hepatotox += 0.1;
  if (drug.mw > 500) hepatotox += 0.1;
  hepatotox = clamp(hepatotox, 0, 0.9);
  if (hepatotox > 0.5) alerts.push("Потенциальная гепатотоксичность");

  // ──────── SKIN SENSITIZATION ────────
  let skin = 0.1;
  if (drug.logp > 3) skin += 0.15;
  if (drug.charge > 0) skin += 0.1;
  if (drug.pharm_group.toLowerCase().includes("фенол")) skin += 0.25;
  skin = clamp(skin, 0, 0.9);

  // ──────── CYP3A4 ────────
  let cypSubstrate = 0.2;
  let cypInhibitor = 0.1;
  if (drug.logp > 2 && drug.mw > 300) cypSubstrate += 0.4;
  if (drug.charge > 0) cypSubstrate += 0.15;
  if (drug.logp > 4) cypInhibitor += 0.3;
  if (drug.pharm_group.toLowerCase().includes("макролид")) cypInhibitor += 0.3;
  if (drug.pharm_group.toLowerCase().includes("имидазол")) cypInhibitor += 0.4;
  cypSubstrate = clamp(cypSubstrate, 0, 0.95);
  cypInhibitor = clamp(cypInhibitor, 0, 0.95);
  if (cypInhibitor > 0.5) alerts.push("Возможный ингибитор CYP3A4 (лекарственные взаимодействия)");

  // ──────── BIOACCULATION ────────
  // BCF correlates strongly with LogP
  let bioaccum = 0.05 + drug.logp * 0.15;
  if (drug.logp > 5) bioaccum += 0.2;
  bioaccum = clamp(bioaccum, 0, 0.95);
  if (bioaccum > 0.6) alerts.push("Высокая биоаккумуляция (экологический риск)");

  // ──────── DRUG-LIKENESS ────────
  let dl = 100;
  if (drug.mw > 500) dl -= (drug.mw - 500) / 20;
  if (drug.logp > 5) dl -= (drug.logp - 5) * 8;
  if (drug.logp < -1) dl -= (-1 - drug.logp) * 8;
  if (drug.hbd > 5) dl -= (drug.hbd - 5) * 5;
  if (drug.hba > 10) dl -= (drug.hba - 10) * 3;
  if (drug.rotatable_bonds > 10) dl -= (drug.rotatable_bonds - 10) * 3;
  if (Math.abs(drug.charge) >= 2) dl -= 10;
  dl -= herg * 20 + hepatotox * 15 + ames * 15;
  dl = clamp(Math.round(dl), 0, 100);

  return {
    oralBioavailability: oral,
    oralBioavailabilityLevel: level(oral, [30, 70]),
    bbbPermeability: Number(bbb.toFixed(2)),
    bbbPermeabilityLevel: bbb > 0.5 ? "high" : bbb < -0.5 ? "low" : "moderate",
    caco2: Number(caco2.toFixed(2)),
    caco2Level: level(caco2, [5, 15]),
    ppb,
    ppbLevel: level(ppb, [50, 85]),
    vd: Number(vd.toFixed(2)),
    vdLevel: level(vd, [0.5, 3]),
    hepaticExtraction: Number(hepatic.toFixed(2)),
    renalClearance: Number(renal.toFixed(2)),
    logS: Number(logS.toFixed(2)),
    solubilityLevel: level(-logS, [2, 5]),
    hergRisk: Number(herg.toFixed(2)),
    hergRiskLevel: level(herg, [0.25, 0.6]),
    amesRisk: Number(ames.toFixed(2)),
    amesRiskLevel: level(ames, [0.2, 0.5]),
    hepatotoxicityRisk: Number(hepatotox.toFixed(2)),
    hepatotoxicityRiskLevel: level(hepatotox, [0.25, 0.55]),
    skinSensitization: Number(skin.toFixed(2)),
    skinSensitizationLevel: level(skin, [0.2, 0.5]),
    cyp3a4Substrate: Number(cypSubstrate.toFixed(2)),
    cyp3a4Inhibitor: Number(cypInhibitor.toFixed(2)),
    bioaccumulation: Number(bioaccum.toFixed(2)),
    bioaccumulationLevel: level(bioaccum, [0.3, 0.65]),
    drugLikeness: dl,
    alerts,
  };
}

export const ADMET_LABELS_RU: Record<string, string> = {
  oralBioavailability: "Пероральная биодоступность",
  bbbPermeability: "Проникновение через ГЭБ",
  caco2: "Проницаемость Caco-2 (×10⁻⁶ см/с)",
  ppb: "Связывание с белками плазмы",
  vd: "Объём распределения (л/кг)",
  logS: "Растворимость logS (моль/л)",
  hergRisk: "Риск блокады hERG (QT)",
  amesRisk: "Мутагенность (Ames)",
  hepatotoxicityRisk: "Гепатотоксичность",
  skinSensitization: "Сенсибилизация кожи",
  cyp3a4Substrate: "Субстрат CYP3A4",
  cyp3a4Inhibitor: "Ингибитор CYP3A4",
  bioaccumulation: "Биоаккумуляция",
  drugLikeness: "Drug-likeness",
};

export const LEVEL_COLOR: Record<AdmetLevel, string> = {
  low: "#16a34a",
  moderate: "#ca8a04",
  high: "#dc2626",
};
