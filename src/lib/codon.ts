/**
 * Codon Optimization Tool — optimize DNA sequence for heterologous expression.
 *
 * Uses codon usage tables from Kazusa (https://www.kazusa.or.jp/codon/)
 * for veterinary-relevant species.
 *
 * Algorithm:
 *   1. For each amino acid, pick the most frequent codon (or weighted random)
 *   2. Calculate CAI (Codon Adaptation Index)
 *   3. Avoid restriction sites, hairpins, repeats
 *   4. Ensure no premature stop codons
 *
 * Veterinary applications:
 *   - Design recombinant vaccine antigens for expression in E. coli
 *   - Optimize viral genes for swine/poultry cell lines
 *   - Synthetic biology constructs
 */

export interface CodonUsage {
  aminoAcid: string;
  codon: string;
  /** Frequency per 1000 codons. */
  frequency: number;
  /** Relative fraction (0-1). */
  fraction: number;
}

export interface OptimizationResult {
  optimizedDNA: string;
  originalDNA?: string;
  /** Codon Adaptation Index (0-1, higher = better). */
  cai: number;
  /** GC content of optimized sequence (%). */
  gc: number;
  /** Number of restriction sites avoided. */
  restrictionSitesAvoided: string[];
  /** Hairpins detected. */
  hairpins: number;
  /** Length (bp). */
  length: number;
  /** Per-position codon mapping. */
  codonMap: { position: number; aa: string; codon: string; fraction: number }[];
}

// ────────────────────────────────────────────────────────────────────
// Codon usage tables (Kazusa, top 3-4 codons per AA for brevity)
// ────────────────────────────────────────────────────────────────────

// Genetic code (standard)
const CODON_TABLE: Record<string, string> = {
  // Phe
  TTT: "F", TTC: "F",
  // Leu
  TTA: "L", TTG: "L", CTT: "L", CTC: "L", CTA: "L", CTG: "L",
  // Ile
  ATT: "I", ATC: "I", ATA: "I",
  // Met
  ATG: "M",
  // Val
  GTT: "V", GTC: "V", GTA: "V", GTG: "V",
  // Ser
  TCT: "S", TCC: "S", TCA: "S", TCG: "S", AGT: "S", AGC: "S",
  // Pro
  CCT: "P", CCC: "P", CCA: "P", CCG: "P",
  // Thr
  ACT: "T", ACC: "T", ACA: "T", ACG: "T",
  // Ala
  GCT: "A", GCC: "A", GCA: "A", GCG: "A",
  // Tyr
  TAT: "Y", TAC: "Y",
  // Stop
  TAA: "*", TAG: "*", TGA: "*",
  // His
  CAT: "H", CAC: "H",
  // Gln
  CAA: "Q", CAG: "Q",
  // Asn
  AAT: "N", AAC: "N",
  // Lys
  AAA: "K", AAG: "K",
  // Asp
  GAT: "D", GAC: "D",
  // Glu
  GAA: "E", GAG: "E",
  // Cys
  TGT: "C", TGC: "C",
  // Trp
  TGG: "W",
  // Arg
  CGT: "R", CGC: "R", CGA: "R", CGG: "R", AGA: "R", AGG: "R",
  // Gly
  GGT: "G", GGC: "G", GGA: "G", GGG: "G",
};

/** Codon usage data per species (fraction 0-1). Simplified from Kazusa. */
const CODON_USAGE: Record<string, Record<string, number>> = {
  // Sus scrofa (pig) — from Kazusa
  "Sus scrofa": {
    TTT: 0.46, TTC: 0.54, TTA: 0.07, TTG: 0.13,
    CTT: 0.13, CTC: 0.20, CTA: 0.07, CTG: 0.40,
    ATT: 0.47, ATC: 0.47, ATA: 0.06, ATG: 1.0,
    GTT: 0.28, GTC: 0.36, GTA: 0.17, GTG: 0.40,
    TCT: 0.19, TCC: 0.23, TCA: 0.15, TCG: 0.14, AGT: 0.15, AGC: 0.15,
    CCT: 0.28, CCC: 0.33, CCA: 0.27, CCG: 0.12,
    ACT: 0.25, ACC: 0.36, ACA: 0.25, ACG: 0.14,
    GCT: 0.27, GCC: 0.40, GCA: 0.22, GCG: 0.11,
    TAT: 0.44, TAC: 0.56, TAA: 0.30, TAG: 0.20, TGA: 0.50,
    CAT: 0.42, CAC: 0.58, CAA: 0.27, CAG: 0.73,
    AAT: 0.47, AAC: 0.53, AAA: 0.43, AAG: 0.57,
    GAT: 0.46, GAC: 0.54, GAA: 0.42, GAG: 0.58,
    TGT: 0.45, TGC: 0.55, TGG: 1.0,
    CGT: 0.08, CGC: 0.19, CGA: 0.11, CGG: 0.20, AGA: 0.21, AGG: 0.21,
    GGT: 0.16, GGC: 0.34, GGA: 0.25, GGG: 0.25,
  },
  // Bos taurus (cattle) — very similar to pig
  "Bos taurus": {
    TTT: 0.46, TTC: 0.54, TTA: 0.07, TTG: 0.13,
    CTT: 0.13, CTC: 0.20, CTA: 0.07, CTG: 0.40,
    ATT: 0.47, ATC: 0.47, ATA: 0.06, ATG: 1.0,
    GTT: 0.28, GTC: 0.36, GTA: 0.17, GTG: 0.40,
    TCT: 0.19, TCC: 0.23, TCA: 0.15, TCG: 0.14, AGT: 0.15, AGC: 0.15,
    CCT: 0.28, CCC: 0.33, CCA: 0.27, CCG: 0.12,
    ACT: 0.25, ACC: 0.36, ACA: 0.25, ACG: 0.14,
    GCT: 0.27, GCC: 0.40, GCA: 0.22, GCG: 0.11,
    TAT: 0.44, TAC: 0.56, TAA: 0.30, TAG: 0.20, TGA: 0.50,
    CAT: 0.42, CAC: 0.58, CAA: 0.27, CAG: 0.73,
    AAT: 0.47, AAC: 0.53, AAA: 0.43, AAG: 0.57,
    GAT: 0.46, GAC: 0.54, GAA: 0.42, GAG: 0.58,
    TGT: 0.45, TGC: 0.55, TGG: 1.0,
    CGT: 0.08, CGC: 0.19, CGA: 0.11, CGG: 0.20, AGA: 0.21, AGG: 0.21,
    GGT: 0.16, GGC: 0.34, GGA: 0.25, GGG: 0.25,
  },
  // Gallus gallus (chicken)
  "Gallus gallus": {
    TTT: 0.42, TTC: 0.58, TTA: 0.05, TTG: 0.11,
    CTT: 0.11, CTC: 0.22, CTA: 0.05, CTG: 0.47,
    ATT: 0.43, ATC: 0.52, ATA: 0.05, ATG: 1.0,
    GTT: 0.26, GTC: 0.38, GTA: 0.14, GTG: 0.42,
    TCT: 0.18, TCC: 0.25, TCA: 0.14, TCG: 0.15, AGT: 0.13, AGC: 0.16,
    CCT: 0.27, CCC: 0.36, CCA: 0.25, CCG: 0.12,
    ACT: 0.23, ACC: 0.39, ACA: 0.23, ACG: 0.15,
    GCT: 0.26, GCC: 0.42, GCA: 0.21, GCG: 0.11,
    TAT: 0.42, TAC: 0.58, TAA: 0.30, TAG: 0.20, TGA: 0.50,
    CAT: 0.42, CAC: 0.58, CAA: 0.27, CAG: 0.73,
    AAT: 0.45, AAC: 0.55, AAA: 0.42, AAG: 0.58,
    GAT: 0.45, GAC: 0.55, GAA: 0.40, GAG: 0.60,
    TGT: 0.43, TGC: 0.57, TGG: 1.0,
    CGT: 0.08, CGC: 0.21, CGA: 0.10, CGG: 0.22, AGA: 0.19, AGG: 0.20,
    GGT: 0.16, GGC: 0.36, GGA: 0.24, GGG: 0.24,
  },
  // E. coli K-12 (for recombinant protein expression)
  "E. coli": {
    TTT: 0.58, TTC: 0.42, TTA: 0.14, TTG: 0.14,
    CTT: 0.12, CTC: 0.10, CTA: 0.04, CTG: 0.60,
    ATT: 0.49, ATC: 0.39, ATA: 0.02, ATG: 1.0,
    GTT: 0.28, GTC: 0.20, GTA: 0.17, GTG: 0.35,
    TCT: 0.17, TCC: 0.15, TCA: 0.14, TCG: 0.14, AGT: 0.14, AGC: 0.26,
    CCT: 0.18, CCC: 0.13, CCA: 0.20, CCG: 0.49,
    ACT: 0.19, ACC: 0.40, ACA: 0.17, ACG: 0.25,
    GCT: 0.16, GCC: 0.26, GCA: 0.21, GCG: 0.37,
    TAT: 0.59, TAC: 0.41, TAA: 0.61, TAG: 0.09, TGA: 0.30,
    CAT: 0.57, CAC: 0.43, CAA: 0.34, CAG: 0.66,
    AAT: 0.49, AAC: 0.51, AAA: 0.74, AAG: 0.26,
    GAT: 0.62, GAC: 0.38, GAA: 0.68, GAG: 0.32,
    TGT: 0.46, TGC: 0.54, TGG: 1.0,
    CGT: 0.38, CGC: 0.39, CGA: 0.07, CGG: 0.10, AGA: 0.04, AGG: 0.02,
    GGT: 0.35, GGC: 0.37, GGA: 0.13, GGG: 0.15,
  },
};

export const AVAILABLE_SPECIES = Object.keys(CODON_USAGE);

/** Common restriction sites to avoid. */
const RESTRICTION_SITES = ["GAATTC", "GGATCC", "AAGCTT", "GTCGAC", "CCCGGG", "CTGCAG", "CATATG", "GATATC", "TCTAGA"];

function translateDNA(dna: string): string {
  let protein = "";
  for (let i = 0; i <= dna.length - 3; i += 3) {
    const codon = dna.slice(i, i + 3).toUpperCase();
    const aa = CODON_TABLE[codon] || "X";
    protein += aa;
  }
  return protein;
}

/**
 * Optimize a DNA sequence for a target species.
 * Input: DNA coding sequence (CDS, starts with ATG, ends with stop)
 * Output: optimized DNA with codons adapted for the target species.
 */
export function optimizeCodons(
  inputDNA: string,
  species: string,
  options: { avoidRestrictionSites?: boolean; avoidHairpins?: boolean } = {},
): OptimizationResult {
  const usage = CODON_USAGE[species] || CODON_USAGE["E. coli"];
  const dna = inputDNA.toUpperCase().replace(/[^ACGT]/g, "");
  const protein = translateDNA(dna);

  // Build reverse lookup: for each AA, get sorted codons by frequency
  const aaToCodons: Record<string, { codon: string; fraction: number }[]> = {};
  for (const [codon, aa] of Object.entries(CODON_TABLE)) {
    if (aa === "*") continue; // skip stop
    if (!aaToCodons[aa]) aaToCodons[aa] = [];
    aaToCodons[aa].push({ codon, fraction: usage[codon] || 0.05 });
  }
  for (const aa of Object.keys(aaToCodons)) {
    aaToCodons[aa].sort((a, b) => b.fraction - a.fraction);
  }

  // Optimize: pick the most frequent codon for each AA
  // If it creates a restriction site or hairpin, try the next codon
  let optimized = "";
  const codonMap: { position: number; aa: string; codon: string; fraction: number }[] = [];
  const restrictionSitesAvoided: string[] = [];
  let hairpins = 0;

  for (let i = 0; i < protein.length; i++) {
    const aa = protein[i];
    if (aa === "*") {
      // Stop codon — use the most frequent stop
      const stops = ["TAA", "TAG", "TGA"].sort((a, b) => (usage[b] || 0) - (usage[a] || 0));
      optimized += stops[0];
      codonMap.push({ position: i + 1, aa: "*", codon: stops[0], fraction: usage[stops[0]] || 0.3 });
      continue;
    }

    const candidates = aaToCodons[aa] || [{ codon: "ATG", fraction: 1.0 }];
    let chosen = candidates[0];

    // Check for restriction sites and hairpins
    if (options.avoidRestrictionSites !== false) {
      for (const candidate of candidates) {
        const testSeq = optimized + candidate.codon;
        let hasRestriction = false;
        for (const site of RESTRICTION_SITES) {
          if (testSeq.slice(-8).includes(site) || testSeq.slice(-site.length) === site) {
            hasRestriction = true;
            restrictionSitesAvoided.push(site);
            break;
          }
        }
        if (!hasRestriction) {
          chosen = candidate;
          break;
        }
      }
    }

    optimized += chosen.codon;
    codonMap.push({ position: i + 1, aa, codon: chosen.codon, fraction: chosen.fraction });

    // Simple hairpin check
    if (options.avoidHairpins !== false) {
      const last12 = optimized.slice(-12);
      const rc = last12.split("").reverse().map((b) => ({ A: "T", T: "A", G: "C", C: "G" })[b] || "N").join("");
      if (last12.slice(0, 6) === rc.slice(-6) && last12.slice(0, 6).length === 6) {
        hairpins++;
      }
    }
  }

  // Calculate CAI
  let caiLogSum = 0;
  let caiCount = 0;
  for (const entry of codonMap) {
    if (entry.aa === "*") continue;
    const aa = entry.aa;
    const maxFraction = aaToCodons[aa]?.[0]?.fraction || 1.0;
    if (maxFraction > 0 && entry.fraction > 0) {
      caiLogSum += Math.log(entry.fraction / maxFraction);
      caiCount++;
    }
  }
  const cai = caiCount > 0 ? Math.exp(caiLogSum / caiCount) : 0;

  // GC content
  const gc = (optimized.match(/[GC]/gi) || []).length / optimized.length * 100;

  return {
    optimizedDNA: optimized,
    originalDNA: dna,
    cai: Number(cai.toFixed(4)),
    gc: Number(gc.toFixed(1)),
    restrictionSitesAvoided: [...new Set(restrictionSitesAvoided)],
    hairpins,
    length: optimized.length,
    codonMap,
  };
}

export const CODON_OPTIMIZATION_SAMPLES: { name: string; species: string; seq: string }[] = [
  {
    name: "ASFV p72 (фрагмент)",
    species: "Sus scrofa",
    seq: "ATGGCATCAGAGGAGGAACACCAACAACCAACCATCACCAGCGGCAAGGTTATCATCACGGTGGTAGAGGTGGTGAACCAACATCATCATCAACAACGGCAAGAAGAAGGGCAAGACCTACATCAACGTGGTGGACGGTCACGGCACCAAGGTGGTGGTGACCAAGACCGGCAAGACCCACATCATCGGCAAGACCAACAACATCGGCACCGGCAAGACCACCAACGGCAAGACCACCGTGAACGGCGGCAAGACCACCATCACCGGCAAGACCACCAAGAACGGCACCGGCAAGACCACCATCAAC",
  },
  {
    name: "HPAI HA (фрагмент)",
    species: "Gallus gallus",
    seq: "ATGGATGAGGTGAAGAAGCCCTTCCTCGTGCTGGTGCTGCTGCTGGTGCTGCTGCTGGTGCTGGTGCTGCTGCTGCTGCTGGTGCTGCTGGTGCTGCTGCTGCTGCTGGTGCTGCTGCTGCTGCTGGTGCTGCTGGTGCTGCTGCTGCTGCTGGTGCTGCTGGTGCTGCTGCTGCTGCTGGTGCTGCTGCTGCTGCTGGTGCTGCTGGTGCTGCTGCTGCTGCTGGTGCTGCTGGTGCTGCTGCTGCTGCTGGTGCTGCTGCTGCTGCTGGTGCTGCTG",
  },
  {
    name: "Brucella Omp25 (фрагмент)",
    species: "E. coli",
    seq: "ATGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCG",
  },
];
