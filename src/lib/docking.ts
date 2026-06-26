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
 * Estimate binding affinity (ΔG, kcal/mol) from score.
 * 
 * Roughly: ΔG ≈ -0.1 × score (so score=100 → ΔG=-10 kcal/mol)
 * This is a VERY rough approximation.
 */
function estimateBindingAffinity(score: number): number {
  return Math.round(-0.1 * score * 10) / 10;
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
  return Math.max(0, Math.min(100, si));
}

/**
 * Run docking simulation for a single drug against a single target.
 */
export function dockDrugToTarget(drug: Drug, target: TargetProtein): DockingResult[] {
  const results: DockingResult[] = [];

  for (const pocket of target.pockets) {
    const sScore = shapeScore(drug, pocket);
    const eScore = electrostaticScore(drug, pocket);
    const hScore = hydrophobicScore(drug, pocket);
    const lipinski = checkLipinski(drug);

    // Weighted average: shape 35%, electrostatic 30%, hydrophobic 35%
    const rawScore = sScore * 0.35 + eScore * 0.30 + hScore * 0.35;

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
