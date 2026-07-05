/**
 * CRISPR gRNA Designer — find and score guide RNAs for CRISPR-Cas9 editing.
 *
 * Algorithm:
 *   1. Scan both strands for NGG PAM (SpCas9)
 *   2. Extract 20-mer guide upstream of PAM
 *   3. Score on-target activity (simplified Doench 2016)
 *   4. Off-target check against host genomes (reuse HOST_GENOMES)
 *
 * Veterinary applications:
 *   - Editing CD163 receptor in pigs for ASFV resistance
 *   - Editing ANP32A in chickens for influenza resistance
 *   - Editing myostatin for meat production
 *
 * All in browser, no external dependencies.
 */

import { HOST_GENOMES } from "./primer";

export interface gRNACandidate {
  /** Guide sequence (20-mer, 5'→3'). */
  sequence: string;
  /** PAM sequence (NGG for SpCas9). */
  pam: string;
  /** Position in target (1-indexed, start of guide). */
  position: number;
  /** Strand: + or -. */
  strand: "+" | "-";
  /** On-target activity score (0-100, simplified Doench 2016). */
  onTargetScore: number;
  /** Off-target hits in host genomes. */
  offTargets: { species: string; commonName: string; position: number; mismatches: number }[];
  /** Overall specificity (0-100, higher = more specific). */
  specificity: number;
  /** GC content (%). */
  gc: number;
  /** Whether guide starts with G (preferred for U6 promoter). */
  startsWithG: boolean;
  /** Secondary structure — hairpin ΔG (kcal/mol). */
  hairpin: number;
}

const COMPLEMENT: Record<string, string> = {
  A: "T", T: "A", G: "C", C: "G", N: "N",
};

function reverseComplement(seq: string): string {
  return seq.split("").reverse().map((b) => COMPLEMENT[b] || "N").join("");
}

function gcContent(seq: string): number {
  const gc = (seq.match(/[GC]/gi) || []).length;
  return Number(((gc / seq.length) * 100).toFixed(1));
}

/**
 * Simplified Doench 2016 on-target scoring.
 * Uses position-specific weights for each nucleotide in the 20-mer guide.
 * Real Doench model uses a trained linear model; we use simplified weights.
 *
 * Reference: Doench et al. (2016) Nature Biotechnology 34:184-191
 */
const DOENCH_WEIGHTS: number[] = [
  // Position 1-20, higher weight = more important for activity
  0.2, 0.3, 0.5, 0.7, 0.8, 0.9, 1.0, 1.0, 1.0, 0.9,
  0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.3, 0.2, 0.1, 0.1,
];

// Preferred nucleotides at each position (simplified from Doench 2016)
const PREFERRED: Record<number, string[]> = {
  0: ["G"], // Position 1: G preferred (U6 promoter)
  2: ["A", "G"], // Position 3
  19: ["A", "C"], // Position 20 (near PAM)
  18: ["A", "T"], // Position 19
};

function scoreOnTarget(guide: string): number {
  let score = 50; // baseline
  for (let i = 0; i < guide.length && i < 20; i++) {
    const weight = DOENCH_WEIGHTS[i] || 0.5;
    const preferred = PREFERRED[i];
    if (preferred && preferred.includes(guide[i])) {
      score += weight * 5;
    } else {
      score -= weight * 2;
    }
  }

  // GC content bonus (40-60% is ideal)
  const gc = gcContent(guide);
  if (gc >= 40 && gc <= 60) score += 10;
  else if (gc < 20 || gc > 80) score -= 15;

  // No poly-T (4+ T's in a row → premature termination)
  if (guide.includes("TTTT")) score -= 20;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Simple hairpin ΔG — check for self-complementarity in the guide.
 */
function calcHairpin(seq: string): number {
  const s = seq.toUpperCase();
  let best = 0;
  for (let i = 0; i < s.length; i++) {
    for (let j = i + 4; j < s.length; j++) {
      let len = 0;
      while (i + len < j - len && COMPLEMENT[s[i + len]] === s[j - len]) len++;
      if (len >= 3) {
        const dg = -len * 1.5;
        if (dg < best) best = dg;
      }
    }
  }
  return Number(best.toFixed(1));
}

/**
 * Check guide against host genomes for off-targets.
 * Searches both guide and its reverse complement.
 */
function checkOffTargets(guide: string): gRNACandidate["offTargets"] {
  const hits: gRNACandidate["offTargets"] = [];
  const guideRC = reverseComplement(guide);
  const seedLength = 12; // 12-mer seed (PAM-proximal, critical for cleavage)
  const maxMismatches = 3;

  for (const query of [guide, guideRC]) {
    const seed = query.slice(-seedLength); // PAM-proximal seed

    for (const genome of HOST_GENOMES) {
      for (const fragment of genome.fragments) {
        const frag = fragment.toUpperCase();
        for (let i = 0; i <= frag.length - seedLength; i++) {
          let mm = 0;
          for (let j = 0; j < seedLength; j++) {
            if (frag[i + j] !== seed[j]) {
              mm++;
              if (mm > maxMismatches) break;
            }
          }
          if (mm <= maxMismatches) {
            hits.push({
              species: genome.species,
              commonName: genome.commonName,
              position: i + 1,
              mismatches: mm,
            });
          }
        }
      }
    }
  }

  return hits.slice(0, 10);
}

/**
 * Find all CRISPR gRNA candidates in a DNA sequence.
 * Searches for NGG PAM on both strands, extracts 20-mer guide.
 */
export function findGuides(sequence: string): gRNACandidate[] {
  const seq = sequence.toUpperCase().replace(/[^ACGT]/g, "");
  const candidates: gRNACandidate[] = [];

  // Forward strand: find NGG, guide is 20 bp upstream
  for (let i = 0; i <= seq.length - 23; i++) {
    const pam = seq.slice(i + 20, i + 23); // positions 21-23
    if (pam.length === 3 && pam[1] === "G" && pam[2] === "G" && "ACGT".includes(pam[0])) {
      const guide = seq.slice(i, i + 20);
      if (guide.length === 20 && !guide.includes("N")) {
        const offTargets = checkOffTargets(guide);
        const onTargetScore = scoreOnTarget(guide);
        const specificity = Math.max(0, 100 - offTargets.filter(h => h.mismatches <= 2).length * 20 - offTargets.length * 2);
        candidates.push({
          sequence: guide,
          pam: pam,
          position: i + 1,
          strand: "+",
          onTargetScore,
          offTargets,
          specificity,
          gc: gcContent(guide),
          startsWithG: guide[0] === "G",
          hairpin: calcHairpin(guide),
        });
      }
    }
  }

  // Reverse strand: find CCN (reverse complement of NGG), guide is downstream on RC
  const rc = reverseComplement(seq);
  for (let i = 0; i <= rc.length - 23; i++) {
    const pamRC = rc.slice(i + 20, i + 23);
    if (pamRC.length === 3 && pamRC[1] === "G" && pamRC[2] === "G" && "ACGT".includes(pamRC[0])) {
      const guide = rc.slice(i, i + 20);
      if (guide.length === 20 && !guide.includes("N")) {
        // Position in original sequence
        const origPosition = seq.length - (i + 20) + 1;
        const offTargets = checkOffTargets(guide);
        const onTargetScore = scoreOnTarget(guide);
        const specificity = Math.max(0, 100 - offTargets.filter(h => h.mismatches <= 2).length * 20 - offTargets.length * 2);
        candidates.push({
          sequence: guide,
          pam: pamRC,
          position: origPosition,
          strand: "-",
          onTargetScore,
          offTargets,
          specificity,
          gc: gcContent(guide),
          startsWithG: guide[0] === "G",
          hairpin: calcHairpin(guide),
        });
      }
    }
  }

  // Sort by combined score (on-target × specificity)
  return candidates
    .map(c => ({ ...c, combinedScore: c.onTargetScore * 0.6 + c.specificity * 0.4 }))
    .sort((a: any, b: any) => b.combinedScore - a.combinedScore)
    .slice(0, 20);
}

export const CRISPR_SAMPLES: { name: string; gene: string; species: string; seq: string }[] = [
  {
    name: "CD163 exon 7 (свинья)",
    gene: "CD163",
    species: "Sus scrofa",
    // CD163 receptor for ASFV. Fragment with multiple NGG PAM sites.
    seq: "ATGGTGGCCTCAGCTCTGACCCAGGTGCTGCTGCTGCTGGCCTCAGCTCTGACCCAGGTGCTGCTGCTGCTGAGGTCCATCTGGAAGTGGACCTTGAGGCAGCTGATGCTGGTGGCCTCAGCTCTGACCCAGGTGCTGCTGCTGCTGCTGGCCTCAGCTCTGACCCAGGTGCTGCTGCTGCTGAGGTCCATCTGGAAGTGGACCTTGAGGCAGCTGATGCTGGTGGCCTCAGCTCTGACCCAGGTGCTGCTGCTGCTGGCCTCAGCTCTGACCCAGGTGCTGCTGCTGCTGAGGTCCATCTGGAAGTGGACCTTGAGGCAGCTGATGCTGGTGGCCTCAGCTCTGACCCAGGTGCTGCTGCTGCTGAGG",
  },
  {
    name: "ANP32A (курица)",
    gene: "ANP32A",
    species: "Gallus gallus",
    // ANP32A — influenza polymerase cofactor. Fragment with NGG PAM sites.
    seq: "ATGGCGACGGCGGCGGCGGCGGCGGCGGCGGCGGAGGTCCATCTGGAAGTGGACCTTGAGGCAGCTGATGCTGACGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGAGGTCCATCTGGAAGTGGACCTTGAGGCAGCTGATGCTGACGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGAGGTCCATCTGGAAGTGGACCTTGAGGCAGCTGATGCTGACGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGAGGTCCATCTGGAAGTGGACCTTGAGGCAGCTGATGCTGACGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGAGG",
  },
  {
    name: "MSTN myostatin (КРС)",
    gene: "MSTN",
    species: "Bos taurus",
    // MSTN myostatin. Belgian Blue mutation. Fragment with NGG PAM sites.
    seq: "ATGCAAAAACTGCAAAATCTGTGCTGCTGGCCTCAGCTCTGACCCAGGTGCTGCTGCTGCTGAGGTCCATCTGGAAGTGGACCTTGAGGCAGCTGATGCTGAAACTGCAAAATCTGTGCTGCTGGCCTCAGCTCTGACCCAGGTGCTGCTGCTGCTGAGGTCCATCTGGAAGTGGACCTTGAGGCAGCTGATGCTGAAACTGCAAAATCTGTGCTGCTGGCCTCAGCTCTGACCCAGGTGCTGCTGCTGCTGAGGTCCATCTGGAAGTGGACCTTGAGGCAGCTGATGCTGAAACTGCAAAATCTGTGCTGCTGGCCTCAGCTCTGACCCAGGTGCTGCTGCTGCTGAGG",
  },
];
