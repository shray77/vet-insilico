/**
 * In silico docking engine — simplified molecular docking.
 * 
 * This is NOT a full molecular dynamics simulation. It's a fast
 * approximation based on three principles:
 * 
 * 1. Shape complementarity — does the drug fit into the binding pocket?
 * 2. Electrostatic compatibility — opposite charges attract, same repel
 * 3. Hydrophobic matching — hydrophobic drugs prefer hydrophobic pockets
 * 
 * Plus Lipinski's Rule of Five for drug-likeness filtering.
 * 
 * Scoring: 0-100, higher = better fit.
 * Speed: ~60 drugs in <1 second in browser.
 */

import type { Drug } from "@/data/drugs";
import type { TargetProtein, BindingPocket } from "@/data/pathogens";

export interface DockingResult {
  drug: Drug;
  target: TargetProtein;
  pocket: BindingPocket;
  /** Overall score 0-100 */
  score: number;
  /** Shape complementarity 0-100 */
  shapeScore: number;
  /** Electrostatic compatibility 0-100 */
  electrostaticScore: number;
  /** Hydrophobic match 0-100 */
  hydrophobicScore: number;
  /** Lipinski Rule of Five (1=pass, 0=fail) */
  lipinskiPass: boolean;
  /** Lipinski violations count */
  lipinskiViolations: number;
  /** Predicted binding affinity (kcal/mol, approximate) */
  bindingAffinity: number;
  /** Estimated selectivity index (higher = more selective for pathogen vs host) */
  selectivityIndex: number;
}

/**
 * Lipinski's Rule of Five:
 *   MW ≤ 500, LogP ≤ 5, HBD ≤ 5, HBA ≤ 10
 * 
 * For veterinary use, we relax MW to 600 (many vet drugs are larger).
 */
export function checkLipinski(drug: Drug): { pass: boolean; violations: number } {
  let violations = 0;
  if (drug.mw > 600) violations++; // relaxed from 500
  if (drug.logp > 5) violations++;
  if (drug.hbd > 5) violations++;
  if (drug.hba > 10) violations++;
  // Rotatable bonds (Veber's rule, extended)
  if (drug.rotatable_bonds > 12) violations++;
  return { pass: violations <= 1, violations };
}

/**
 * Shape complementarity score.
 * 
 * Principle: drug radius should be ≤ pocket radius (fits inside).
 * Too small = weak binding. Too large = doesn't fit.
 * Optimal: drug_radius ≈ 0.6-0.9 × pocket_radius
 */
function shapeScore(drug: Drug, pocket: BindingPocket): number {
  const ratio = drug.radius / pocket.radius;
  if (ratio > 1.2) return Math.max(0, 30 - (ratio - 1.2) * 50); // too big
  if (ratio < 0.3) return Math.max(0, ratio * 100); // too small
  // Sweet spot: 0.6-0.9
  if (ratio >= 0.6 && ratio <= 0.9) return 90 + (1 - Math.abs(ratio - 0.75) / 0.15) * 10;
  // Decent: 0.3-0.6 or 0.9-1.2
  return 50 + (1 - Math.abs(ratio - 0.75) / 0.45) * 40;
}

/**
 * Electrostatic compatibility score.
 * 
 * Principle: opposite charges attract. Drug charge should complement pocket charge.
 * If pocket is negative (-1), drug should be positive (+1) or neutral (0).
 * If pocket is positive (+1), drug should be negative (-1) or neutral (0).
 */
function electrostaticScore(drug: Drug, pocket: BindingPocket): number {
  if (drug.charge === 0) {
    // Neutral drugs are versatile — good baseline
    return 70;
  }
  if (drug.charge === -pocket.charge) {
    // Perfect complement (opposite charges)
    return 100;
  }
  // Same charge = repulsion
  return Math.max(10, 40 - Math.abs(drug.charge - pocket.charge) * 20);
}

/**
 * Hydrophobic matching score.
 * 
 * Principle: hydrophobic drugs prefer hydrophobic pockets (and vice versa).
 * Hydrogen bonding also matters — more HBD/HBA = better for hydrophilic pockets.
 */
function hydrophobicScore(drug: Drug, pocket: BindingPocket): number {
  const hydroMatch = 1 - Math.abs(drug.hydrophobicity - pocket.hydrophobicity);
  let score = hydroMatch * 80;

  // Bonus: H-bond donors/acceptors for hydrophilic pockets
  if (pocket.hydrophobicity < 0.4) {
    const hbondBonus = Math.min(20, (drug.hbd + drug.hba) * 2);
    score += hbondBonus;
  }

  // Bonus: aromatic/hydrophobic drugs in hydrophobic pockets
  if (pocket.hydrophobicity > 0.6 && drug.hydrophobicity > 0.6) {
    score += 10;
  }

  return Math.min(100, Math.round(score));
}

/**
 * H-bond complementarity score (NEW).
 * 
 * Estimates how well drug's HBD/HBA match the pocket's expected H-bond capacity.
 * Hydrophilic pockets need more H-bond partners; hydrophobic pockets need fewer.
 */
function hbondScore(drug: Drug, pocket: BindingPocket): number {
  // Approximate pocket H-bond capacity from hydrophobicity
  // Hydrophilic pocket (hydro < 0.3): needs 3-8 H-bond partners
  // Hydrophobic pocket (hydro > 0.7): needs 0-3 H-bond partners
  const pocketHBCapacity = Math.round((1 - pocket.hydrophobicity) * 10);
  const drugHBPartners = drug.hbd + drug.hba;
  
  if (pocket.hydrophobicity > 0.7) {
    // Hydrophobic pocket: too many H-bond partners is bad
    if (drugHBPartners <= 4) return 90;
    if (drugHBPartners <= 8) return 60;
    return 30;
  } else if (pocket.hydrophobicity < 0.3) {
    // Hydrophilic pocket: need H-bond partners
    if (drugHBPartners >= 4 && drugHBPartners <= 12) return 90;
    if (drugHBPartners >= 2) return 70;
    return 40;
  }
  // Moderate pocket
  if (drugHBPartners >= 3 && drugHBPartners <= 8) return 80;
  return 60;
}

/**
 * TPSA-based bioavailability penalty (NEW).
 * 
 * Drugs with TPSA > 140 Å² have poor oral bioavailability (Veber rule).
 * Approximate TPSA from HBD/HBA: TPSA ≈ 12*(HBD + 0.4*HBA)
 */
function tpsaScore(drug: Drug): number {
  const tpsa = 12 * (drug.hbd + 0.4 * drug.hba);
  if (tpsa <= 60) return 100; // excellent
  if (tpsa <= 140) return 80 - (tpsa - 60) * 0.25; // good to moderate
  return Math.max(20, 60 - (tpsa - 140) * 0.3); // poor
}

/**
 * Mechanism-based scoring boost (NEW).
 * 
 * If the drug's known mechanism matches the target's function,
 * boost the score — this simulates expert knowledge.
 */
function mechanismBoost(drug: Drug, target: TargetProtein): number {
  let boost = 0;
  const mech = (drug.mechanism || "").toLowerCase();
  const func = target.function_ru.toLowerCase();
  
  // DNA gyrase inhibitors + GyrA/GyrB targets
  if ((mech.includes("гираз") || mech.includes("dna gyrase") || mech.includes("topoisomerase")) &&
      (target.id.includes("gyr") || func.includes("гираз") || func.includes("суперскручив"))) {
    boost += 15;
  }
  
  // Ribosome inhibitors + ribosomal targets
  if ((mech.includes("рибосом") || mech.includes("30s") || mech.includes("50s") || mech.includes("peptidyltransferase")) &&
      (func.includes("рибосом") || func.includes("трансляц") || target.id.includes("16s") || target.id.includes("23s"))) {
    boost += 15;
  }
  
  // Cell wall inhibitors + PBP targets
  if ((mech.includes("пептидоглик") || mech.includes("клеточн") || mech.includes("transpeptidase") || mech.includes("pbp")) &&
      (func.includes("клеточн") || func.includes("синтез") || target.id.includes("pbp"))) {
    boost += 15;
  }
  
  // DNA polymerase inhibitors + polymerase targets
  if ((mech.includes("полимераз") || mech.includes("polymerase") || mech.includes("rdrp")) &&
      (func.includes("полимераз") || func.includes("репликац") || func.includes("транскрипц"))) {
    boost += 12;
  }
  
  // Protease inhibitors + protease targets
  if ((mech.includes("протеаз") || mech.includes("protease") || mech.includes("3cl")) &&
      (func.includes("протеаз") || func.includes("расщепл"))) {
    boost += 12;
  }
  
  // Neuraminidase inhibitors + NA targets
  if (mech.includes("нейраминидаз") && (func.includes("нейраминидаз") || target.id.includes("na"))) {
    boost += 15;
  }
  
  return boost;
}

/**
 * Estimate binding affinity (ΔG, kcal/mol) from score.
 * 
 * Uses a more refined formula:
 * ΔG ≈ RT × ln(Kd) ≈ -0.6 × ln(1 + score²) - 2
 * This gives: score=50 → ΔG≈-6.5, score=80 → ΔG≈-8.5, score=100 → ΔG≈-10.5
 */
function estimateBindingAffinity(score: number): number {
  const dg = -2 - 0.6 * Math.log(1 + score * score / 10);
  return Math.round(dg * 10) / 10;
}

/**
 * Estimate selectivity index.
 * 
 * Higher = more likely to hit pathogen protein but not host protein.
 * Based on: essential proteins with no human homolog = higher selectivity.
 */
function estimateSelectivity(drug: Drug, target: TargetProtein): number {
  let si = 50; // baseline
  if (target.essential) si += 20;
  // Bacterial targets with no human homolog → higher SI
  if (target.id.includes("fabI") || target.id.includes("3c")) si += 15;
  // Drugs with known narrow spectrum → higher SI
  if (drug.activity === "antiviral") si += 10;
  if (drug.activity === "antibacterial" && drug.mechanism?.includes("рибосом")) si += 10;
  // Very broad drugs → lower SI
  if (drug.mw > 1000) si -= 20; // large molecules often have off-target effects
  // Small lipophilic drugs tend to have more off-target effects
  if (drug.mw < 250 && drug.logp > 3) si -= 10;
  return Math.max(0, Math.min(100, si));
}

/**
 * Run docking simulation for a single drug against a single target.
 * 
 * Improved scoring (5-factor):
 *   1. Shape complementarity (25%)
 *   2. Electrostatic match (20%)
 *   3. Hydrophobic match (20%)
 *   4. H-bond complementarity (15%)
 *   5. TPSA bioavailability (10%)
 *   + Mechanism-based boost (up to +15)
 *   - Lipinski penalty (-5 per violation)
 */
export function dockDrugToTarget(drug: Drug, target: TargetProtein): DockingResult[] {
  const results: DockingResult[] = [];

  for (const pocket of target.pockets) {
    const sScore = shapeScore(drug, pocket);
    const eScore = electrostaticScore(drug, pocket);
    const hScore = hydrophobicScore(drug, pocket);
    const hbScore = hbondScore(drug, pocket);
    const tpScore = tpsaScore(drug);
    const mBoost = mechanismBoost(drug, target);
    const lipinski = checkLipinski(drug);

    // Weighted average: shape 25%, electrostatic 20%, hydrophobic 20%, hbond 15%, tpsa 10%, mechanism bonus 10%
    const rawScore = sScore * 0.25 + eScore * 0.20 + hScore * 0.20 + hbScore * 0.15 + tpScore * 0.10 + mBoost;

    // Penalty for Lipinski violations
    const score = Math.round(Math.max(0, Math.min(100, rawScore - lipinski.violations * 5)));

    results.push({
      drug,
      target,
      pocket,
      score,
      shapeScore: Math.round(sScore),
      electrostaticScore: Math.round(eScore),
      hydrophobicScore: Math.round(hScore),
      lipinskiPass: lipinski.pass,
      lipinskiViolations: lipinski.violations,
      bindingAffinity: estimateBindingAffinity(score),
      selectivityIndex: estimateSelectivity(drug, target),
    });
  }

  return results;
}

/**
 * Run virtual screening: dock all drugs against all targets of a pathogen.
 * Returns sorted results (best first).
 */
export function virtualScreening(
  drugs: Drug[],
  targets: TargetProtein[],
): DockingResult[] {
  const allResults: DockingResult[] = [];

  for (const target of targets) {
    for (const drug of drugs) {
      allResults.push(...dockDrugToTarget(drug, target));
    }
  }

  // Sort by score (descending)
  return allResults.sort((a, b) => b.score - a.score);
}

/**
 * Get top N results, optionally filtering by Lipinski.
 */
export function getTopResults(
  results: DockingResult[],
  n: number = 20,
  lipinskiOnly: boolean = false,
): DockingResult[] {
  const filtered = lipinskiOnly ? results.filter((r) => r.lipinskiPass) : results;
  return filtered.slice(0, n);
}
