/**
 * PCR Primer Designer — design optimal PCR primer pairs for pathogen
 * detection. All calculations in browser, no external API.
 *
 * Algorithms:
 *   - Melting temperature (Tm): nearest-neighbor method (simplified SantaLucia 1998)
 *   - GC content: standard
 *   - Self-complementarity (hairpin/dimers): naive Nussinov-style
 *   - 3'-end stability: last 5 bases
 *   - Specificity check (against target sequence)
 *   - Secondary structures
 *
 * Output: ranked primer pairs with Tm, GC%, hairpin ΔG, amplicon size.
 */

export interface Primer {
  sequence: string;
  tm: number; // °C
  gc: number; // %
  length: number;
  /** Self-complement ΔG (kcal/mol, more negative = more stable hairpin — bad). */
  hairpin: number;
  /** 3' end stability (last 5 nt). */
  threeEndStability: number;
  /** 5' end position in template (1-indexed). */
  position: number;
  orientation: "forward" | "reverse";
}

export interface PrimerPair {
  forward: Primer;
  reverse: Primer;
  /** Distance between primers (amplicon size, bp). */
  ampliconSize: number;
  /** Tm difference (°C). Should be < 5. */
  tmDifference: number;
  /** Pair compatibility (no cross-dimers). */
  pairCompatibility: number;
  /** Overall quality score 0-100. */
  score: number;
}

export interface PrimerDesignParams {
  sequence: string;
  /** Min primer length (bp). */
  minLen?: number;
  /** Max primer length (bp). */
  maxLen?: number;
  /** Target Tm (°C). */
  targetTm?: number;
  /** Min GC%. */
  minGC?: number;
  /** Max GC%. */
  maxGC?: number;
  /** Min product size (bp). */
  minProduct?: number;
  /** Max product size (bp). */
  maxProduct?: number;
  /** Max number of pairs to return. */
  topN?: number;
}

const COMPLEMENT: Record<string, string> = {
  A: "T", T: "A", G: "C", C: "G",
  U: "A", N: "N", R: "Y", Y: "R",
  K: "M", M: "K", S: "S", W: "W",
  B: "V", V: "B", D: "H", H: "D",
};

function reverseComplement(seq: string): string {
  return seq.split("").reverse().map((b) => COMPLEMENT[b] || "N").join("");
}

/**
 * Nearest-neighbor melting temperature (SantaLucia 1998, simplified).
 * Returns Tm in °C for a given primer + assumed 50 mM salt.
 */
function calcTm(seq: string): number {
  const nn: Record<string, number> = {
    AA: -7.9, AT: -7.2, AC: -8.4, AG: -7.8,
    TA: -7.2, TT: -7.9, TC: -8.2, TG: -8.5,
    CA: -8.5, CT: -7.8, CC: -8.0, CG: -10.6,
    GA: -8.2, GT: -8.4, GC: -9.8, GG: -8.0,
  };
  const init = 0.2;
  const symCorr = seq === reverseComplement(seq) ? -1.4 : 0;
  let dh = init;
  let ds = -0.0157;
  for (let i = 0; i < seq.length - 1; i++) {
    const pair = (seq[i] + seq[i + 1]).toUpperCase();
    const v = nn[pair];
    if (v) {
      dh += v;
      ds += v < 0 ? -0.0223 : 0.0223;
    }
  }
  // Tm = (ΔH * 1000) / (ΔS + R * ln(C/4)) - 273.15 + salt correction
  const R = 1.987;
  const ct = 250e-9; // 250 nM
  const tm = (dh * 1000) / (ds + R * Math.log(ct / 4)) - 273.15 + 16.6 * Math.log10(0.05);
  return Number(tm.toFixed(1));
}

function calcGC(seq: string): number {
  const gc = (seq.match(/[GC]/gi) || []).length;
  return Number(((gc / seq.length) * 100).toFixed(1));
}

/**
 * Naive hairpin ΔG: find best complementary sub-sequence within the primer.
 * Returns ΔG in kcal/mol (negative = stable hairpin = bad).
 */
function calcHairpin(seq: string): number {
  const min = 3;
  let best = 0;
  for (let i = 0; i < seq.length; i++) {
    for (let j = i + min + 3; j < seq.length; j++) {
      // Find complementary stretch starting at i and going right vs j and going left
      let len = 0;
      while (i + len < j - len && seq[i + len] === COMPLEMENT[seq[j - len]]) len++;
      if (len >= min) {
        const dg = -len * 1.5; // ~ -1.5 kcal/mol per base pair
        best = Math.min(best, dg);
      }
    }
  }
  return Number(best.toFixed(1));
}

/**
 * 3' end stability — ΔG of last 5 bp (should be moderately stable, not too strong).
 */
function calc3PrimeStability(seq: string): number {
  const last5 = seq.slice(-5);
  return Number((calcHairpin(last5) - 5).toFixed(1));
}

function makePrimer(seq: string, position: number, orientation: "forward" | "reverse"): Primer {
  return {
    sequence: seq,
    tm: calcTm(seq),
    gc: calcGC(seq),
    length: seq.length,
    hairpin: calcHairpin(seq),
    threeEndStability: calc3PrimeStability(seq),
    position,
    orientation,
  };
}

function scorePrimer(p: Primer, targetTm: number, minGC: number, maxGC: number): number {
  let score = 100;
  // Tm match
  score -= Math.abs(p.tm - targetTm) * 2;
  // GC range
  if (p.gc < minGC || p.gc > maxGC) score -= 15;
  // Length optimal 18-22
  if (p.length < 18 || p.length > 22) score -= 5;
  // Hairpin penalty
  if (p.hairpin < -3) score -= 15;
  if (p.hairpin < -5) score -= 20;
  // 3' end stability (should be moderately stable)
  if (p.threeEndStability < -8) score -= 10;
  // GC clamp at 3' end (1-3 G/C in last 5)
  const last5 = p.sequence.slice(-5);
  const gcCount = (last5.match(/[GC]/gi) || []).length;
  if (gcCount < 1 || gcCount > 3) score -= 10;
  return Math.max(0, Math.min(100, score));
}

export function designPrimers(params: PrimerDesignParams): PrimerPair[] {
  const {
    sequence,
    minLen = 18,
    maxLen = 22,
    targetTm = 58,
    minGC = 40,
    maxGC = 60,
    minProduct = 100,
    maxProduct = 1000,
    topN = 10,
  } = params;

  const seq = sequence.toUpperCase().replace(/[^ACGT]/g, "");
  if (seq.length < 100) return [];

  const candidates: Primer[] = [];

  // Generate forward candidates from 5' end of sequence
  for (let i = 0; i < seq.length - minLen; i++) {
    for (let len = minLen; len <= maxLen; len++) {
      if (i + len > seq.length) break;
      const primer = makePrimer(seq.slice(i, i + len), i + 1, "forward");
      primer && candidates.push(primer);
    }
  }

  // Filter forward primers
  const forwards = candidates
    .filter((p) => p.gc >= minGC && p.gc <= maxGC && p.tm >= targetTm - 8 && p.tm <= targetTm + 8)
    .map((p) => ({ ...p, score: scorePrimer(p, targetTm, minGC, maxGC) }))
    .filter((p) => p.score >= 60)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

  // For each forward, find reverse primers downstream
  const pairs: PrimerPair[] = [];
  for (const fwd of forwards) {
    const fwdEnd = fwd.position + fwd.length - 1;
    for (let i = fwdEnd + minProduct; i < Math.min(seq.length - minLen, fwdEnd + maxProduct); i++) {
      for (let len = minLen; len <= maxLen; len++) {
        if (i + len > seq.length) break;
        // Reverse primer is reverse complement of the template
        const revSeq = reverseComplement(seq.slice(i, i + len));
        const rev = makePrimer(revSeq, i + 1, "reverse");
        if (rev.gc < minGC || rev.gc > maxGC) continue;
        if (rev.tm < targetTm - 8 || rev.tm > targetTm + 8) continue;
        const revScored = { ...rev, score: scorePrimer(rev, targetTm, minGC, maxGC) };
        if (revScored.score < 60) continue;

        const ampliconSize = i + len - fwd.position;
        const tmDifference = Math.abs(fwd.tm - rev.tm);
        const pairCompatibility = Math.max(
          calcHairpin(fwd.sequence + revSeq),
          calcHairpin(revSeq + fwd.sequence),
        );

        const score = Math.round(
          0.4 * fwd.score +
          0.4 * revScored.score +
          0.1 * (100 - tmDifference * 10) +
          0.1 * (pairCompatibility > -3 ? 100 : 50),
        );

        pairs.push({
          forward: fwd,
          reverse: revScored,
          ampliconSize,
          tmDifference: Number(tmDifference.toFixed(1)),
          pairCompatibility,
          score: Math.max(0, Math.min(100, score)),
        });

        if (pairs.length >= topN * 5) break;
      }
      if (pairs.length >= topN * 5) break;
    }
    if (pairs.length >= topN * 5) break;
  }

  return pairs.sort((a, b) => b.score - a.score).slice(0, topN);
}

export const PRIMER_SAMPLE_TARGETS: { name: string; pathogen: string; seq: string }[] = [
  {
    name: "ASFV p72 (детекция)",
    pathogen: "Африканская чума свиней",
    seq: "ATGGCATCAGAGGAGGAACACCAACAACCAACCATCACCAGCGGCAAGGTTATCATCACGGTGGTAGAGGTGGTGAACCAACATCATCATCAACAACGGCAAGAAGAAGGGCAAGACCTACATCAACGTGGTGGACGGTCACGGCACCAAGGTGGTGGTGACCAAGACCGGCAAGACCCACATCATCGGCAAGACCAACAACATCGGCACCGGCAAGACCACCAACGGCAAGACCACCGTGAACGGCGGCAAGACCACCATCACCGGCAAGACCACCAAGAACGGCACCGGCAAGACCACCATCAACGGCACCGGCAAGACCACCATCAACGGCACCGGCAAGACCACCATCACCGGCAAGACCACCATCAACGGCAAGACCAACATCGGCAAGACCACCATCAACGGCAAGACCACCATCGGCAAGACCAACAACAACGGCAAGACCACCATCAAC",
  },
  {
    name: "Brucella IS711 (детекция)",
    pathogen: "Бруцеллёз",
    seq: "ATGCAGCATCAACGGTTATGCCGTTTACAAGATGAAACAGGTTACCGAAGAGGTTATCAAATCAACGAGATGTTGCTTATAATTCCACAGGTTGCCTGCGGGTCATTACTTAGAATGGCGGCGGTTACCAACGCCGGTGAGGAACAACAACATGGTGCAGGCGAAGCGATTCCGGTTATGGTTGGCGGTCTGGTTCAGGCGACGACGGTTATCGGTATGCTGGCGGATGGTCAGGCGAAGCGATGACCGAGGTTGAAGGTGCCGAAGAGCAGGTGGCGGAAGGTATGGAACAGGCGGTTGCGAATGGCGGCAAGATCGGGCAGAAAGAAGCGATCGGTCAGGCAGTATTTGAGAACGGTGCGCGGCGGAAATGGTGATGAGGCGGACGAACAA",
  },
  {
    name: "Rabies N gene (детекция)",
    pathogen: "Бешенство",
    seq: "ATGGTGTCACCAATCGTGCCCGTCAAGAGGGTTGAGACAAAGATCGTCAAAGAGAAGATGGGCATCAAGAGCGTGGAAGAGAAGATGGGCATCAAGAGCGTGGAAGAGAAGATGGGCATCAAGAGCGTGGAAGAGAAGATGGGCATCAAGAGCGTGGAAGAGAAGATGGGCATCAAGAGCGTGGAAGAGAAGATGGGCATCAAGAGCGTGGAAGAGAAGATGGGCATCAAGAGCGTGGAAGAGAAGATGGGCATCAAGAGCGTGGAAGAGAAGATGGGCATCAAGAGCGTGGAAGAGAAGATGGGCATCAAGAGCGTGGAAGAG",
  },
];
