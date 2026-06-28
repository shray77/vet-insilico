/**
 * Vaccine epitope predictor — identify B-cell and T-cell (MHC-I) epitopes
 * from pathogen protein sequences.
 *
 * Simplified algorithms, all in browser:
 *
 * B-cell epitopes (linear):
 *   - Hopp-Woods hydrophilicity (1981) — sliding window
 *   - Chou-Fasman beta-turn propensity
 *   - Flexibility (Karplus-Schulz)
 *   - Surface accessibility (Emini)
 *   - Composite BepiPred-like score
 *
 * T-cell MHC-I epitopes (9-mers):
 *   - Position-specific scoring matrix (PSSM) approximation
 *   - Anchor positions: P2 and P9 are critical for HLA-A*02:01
 *   - Uses simplified BIMAS-derived weights
 *
 * Output: ranked epitope candidates with predicted properties.
 *
 * NOT for clinical use — vaccine design requires extensive experimental
 * validation. Use for hypothesis generation and educational purposes.
 */

export interface BCellEpitope {
  start: number;
  end: number;
  sequence: string;
  score: number; // 0-100
  hydrophilicity: number;
  flexibility: number;
  surfaceAccessibility: number;
  betaTurn: number;
}

export interface TCellEpitope {
  start: number;
  end: number;
  sequence: string; // 9-mer
  score: number; // 0-100
  ic50_estimate: number; // nM, lower is better
  anchorMatch: number; // 0-2, how many anchors are good
  mhc_allele: string;
}

export interface EpitopeResult {
  bCellEpitopes: BCellEpitope[];
  tCellEpitopes: TCellEpitope[];
  sequence: string;
  length: number;
  /** Conservation score (placeholder, 0-1). */
  conservation: number;
  /** Predicted antigenicity (0-1). */
  antigenicity: number;
}

// Amino acid properties
const AA = "ACDEFGHIKLMNPQRSTVWY".split("");

// Hopp-Woods hydrophilicity scale (higher = more hydrophilic)
const HOPP_WOODS: Record<string, number> = {
  A: -0.5, R: 3.0, N: 0.2, D: 3.0, C: -1.0,
  Q: 0.2, E: 3.0, G: 0.0, H: -0.5, I: -1.8,
  L: -1.8, K: 3.0, M: -1.3, F: -2.5, P: 0.0,
  S: 0.3, T: -0.4, W: -3.4, Y: -2.3, V: -1.5,
};

// Chou-Fasman beta-turn propensity
const CHOU_FASMAN: Record<string, number> = {
  A: 0.066, R: 0.095, N: 0.463, D: 0.466, C: 0.295,
  Q: 0.981, E: 0.743, G: 0.756, H: 0.524, I: 0.034,
  L: 0.061, K: 0.055, M: 0.052, F: 0.069, P: 0.612,
  S: 0.143, T: 0.096, W: 0.010, Y: 0.114, V: 0.005,
};

// Karplus-Schulz flexibility (rigid-flexible, higher = more flexible)
const KARPLUS: Record<string, number> = {
  A: 0.984, R: 1.008, N: 1.048, D: 1.068, C: 0.906,
  Q: 1.037, E: 1.094, G: 1.031, H: 0.950, I: 0.927,
  L: 0.935, K: 1.102, M: 0.952, F: 0.915, P: 1.049,
  S: 1.046, T: 0.997, W: 0.904, Y: 0.929, V: 0.931,
};

// Emini surface accessibility (with surface propensities)
const EMINI: Record<string, number> = {
  A: 0.301, R: 0.486, N: 0.504, D: 0.524, C: 0.269,
  Q: 0.353, E: 0.475, G: 0.349, H: 0.322, I: 0.238,
  L: 0.236, K: 0.518, M: 0.221, F: 0.214, P: 0.525,
  S: 0.409, T: 0.373, W: 0.213, Y: 0.295, V: 0.244,
};

// MHC-I HLA-A*02:01 anchor preferences (P2 and P9)
// Simplified binding scores per residue at anchor positions
const HLA_A2_P2: Record<string, number> = {
  L: 1.0, M: 0.9, I: 0.7, V: 0.6, A: 0.3,
};
const HLA_A2_P9: Record<string, number> = {
  V: 1.0, L: 0.9, I: 0.8, A: 0.5,
};

function mean(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function slidingWindow(seq: string, size: number): string[] {
  const result: string[] = [];
  for (let i = 0; i <= seq.length - size; i++) {
    result.push(seq.slice(i, i + size));
  }
  return result;
}

function slidingScore(seq: string, scale: Record<string, number>, window: number): number[] {
  const scores: number[] = [];
  for (let i = 0; i <= seq.length - window; i++) {
    const sub = seq.slice(i, i + window);
    scores.push(mean(sub.split("").map((aa) => scale[aa] ?? 0)));
  }
  return scores;
}

/**
 * Predict linear B-cell epitopes using composite score of:
 * hydrophilicity + flexibility + surface accessibility + beta-turn.
 */
export function predictBCellEpitopes(seq: string, minLen = 6, maxLen = 20): BCellEpitope[] {
  const upper = seq.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, "");
  if (upper.length < minLen) return [];

  const window = 7;
  const hydro = slidingScore(upper, HOPP_WOODS, window);
  const flex = slidingScore(upper, KARPLUS, window);
  const surf = slidingScore(upper, EMINI, window);
  const turn = slidingScore(upper, CHOU_FASMAN, window);

  // Normalize each to 0..1
  const normalize = (arr: number[]) => {
    if (!arr.length) return [];
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    const range = max - min || 1;
    return arr.map((v) => (v - min) / range);
  };
  const hydroN = normalize(hydro);
  const flexN = normalize(flex);
  const surfN = normalize(surf);
  const turnN = normalize(turn);

  // Composite BepiPred-like score
  const composite = hydroN.map((h, i) =>
    0.30 * h + 0.20 * flexN[i] + 0.30 * surfN[i] + 0.20 * turnN[i],
  );

  // Threshold = 0.5; find continuous runs above threshold
  const threshold = 0.5;
  const epitopes: BCellEpitope[] = [];
  let start = -1;
  for (let i = 0; i <= composite.length; i++) {
    if (i < composite.length && composite[i] >= threshold) {
      if (start === -1) start = i;
    } else if (start !== -1) {
      const end = i - 1 + window - 1;
      const length = end - start + 1;
      if (length >= minLen && length <= maxLen) {
        const sub = upper.slice(start, end + 1);
        const score = Math.round(
          mean(composite.slice(start, i)) * 100,
        );
        epitopes.push({
          start: start + 1,
          end: end + 1,
          sequence: sub,
          score: clamp(score, 0, 100),
          hydrophilicity: Number(mean(hydro.slice(start, i)).toFixed(2)),
          flexibility: Number(mean(flex.slice(start, i)).toFixed(2)),
          surfaceAccessibility: Number(mean(surf.slice(start, i)).toFixed(2)),
          betaTurn: Number(mean(turn.slice(start, i)).toFixed(2)),
        });
      }
      start = -1;
    }
  }
  // Cap and rank
  return epitopes.sort((a, b) => b.score - a.score).slice(0, 15);
}

/**
 * Predict MHC-I (HLA-A*02:01) binding epitopes (9-mers).
 * Anchor positions P2 and P9 are most critical.
 */
export function predictTCellEpitopes(
  seq: string,
  allele = "HLA-A*02:01",
  topN = 20,
): TCellEpitope[] {
  const upper = seq.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, "");
  const epitopes: TCellEpitope[] = [];

  for (let i = 0; i <= upper.length - 9; i++) {
    const peptide = upper.slice(i, i + 9);
    const p2 = peptide[1];
    const p9 = peptide[8];

    const p2score = HLA_A2_P2[p2] ?? 0;
    const p9score = HLA_A2_P9[p9] ?? 0;
    const anchorMatch = (p2score > 0.5 ? 1 : 0) + (p9score > 0.5 ? 1 : 0);

    // Auxiliary positions contribute smaller weights
    let auxScore = 0;
    for (let j = 0; j < 9; j++) {
      if (j === 1 || j === 8) continue;
      const aa = peptide[j];
      // Hydrophobic residues preferred at P1, P3, P6
      if ([0, 2, 5].includes(j) && "AILMVFYW".includes(aa)) auxScore += 0.1;
      // Polar residues ok at P4, P5, P7
      if ([3, 4, 6].includes(j) && "STNQDEKR".includes(aa)) auxScore += 0.05;
    }

    const totalScore = p2score * 0.4 + p9score * 0.4 + auxScore;
    // ic50 estimate (lower better, <500 nM = good, <50 nM = high affinity)
    const ic50 = Math.max(5, Math.round(5000 * (1 - totalScore) + 50));

    epitopes.push({
      start: i + 1,
      end: i + 9,
      sequence: peptide,
      score: clamp(Math.round(totalScore * 100), 0, 100),
      ic50_estimate: ic50,
      anchorMatch,
      mhc_allele: allele,
    });
  }
  return epitopes.sort((a, b) => a.ic50_estimate - b.ic50_estimate).slice(0, topN);
}

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

/**
 * Predict overall antigenicity based on AA composition
 * (Kolaskar-Tongaonkar method, simplified).
 */
function predictAntigenicity(seq: string): number {
  if (!seq.length) return 0;
  const upper = seq.toUpperCase();
  // Antigenic residues: R, K, D, E, S, N, Q (hydrophilic) higher
  const antigenic = new Set(["R", "K", "D", "E", "S", "N", "Q", "P", "Y"]);
  let count = 0;
  for (const aa of upper) if (antigenic.has(aa)) count++;
  return count / seq.length;
}

export function analyzeSequence(seq: string): EpitopeResult {
  const upper = seq.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, "");
  return {
    bCellEpitopes: predictBCellEpitopes(upper),
    tCellEpitopes: predictTCellEpitopes(upper),
    sequence: upper,
    length: upper.length,
    conservation: 0.7, // placeholder
    antigenicity: Number(predictAntigenicity(upper).toFixed(2)),
  };
}

// Sample pathogen protein sequences for demo
export const SAMPLE_SEQUENCES: { name: string; pathogen: string; seq: string }[] = [
  {
    name: "ASFV p72 (capsid, фрагмент)",
    pathogen: "Африканская чума свиней",
    seq: "MKNHKQYDHLHKHQLHNHLQNHIYHMHQQHQLHNNQLHNHIYQLHHQLHNHIYHMHQQHQLHNNQLHNNIYHMHQQHQLHNHIYHMHQQHQLHNNQLHNNIYHMHQQHQLHNRITELRQFLGENLDRNLIDQIIDLKNEDVKQLIKDLEHLLHNLSELQEKIHVLVGTFEAECQKLLDNLNKLFKDDIQKHNKLFEKLNKHLEKIHKNYEELVSQKLSEELSNLYEKLNELYNNIDQELNELLSQLYNDLKELLSQHLYEKLNELYNN",
  },
  {
    name: "FMDV VP1 (фрагмент)",
    pathogen: "Ящур",
    seq: "GTTTSGSAGATTTGGCACTCGGGGTNGCAGTCCGTTTACACGGGGACATGGGCGTGCGCCCAACGCGGCGGTAACTACGCGTACCGGGAGGTGGGCAACTCGTGGTACCACGGCGCGGGTACGGGTAACGTGCACGGCGTGCGGGGGAACTCGTGGAACTACTACGGGAACTCGTGGAACTACTAC",
  },
  {
    name: "Brucella Omp25 (фрагмент)",
    pathogen: "Бруцеллёз",
    seq: "MKKLLFAAIGALTAGCGNFAQLPDVDKQVSDADVTKLRGFGDDSVKAGGDRTVADKDAGLVTKKNDLAGQIGDLDENWQKDGLINTASDAGNLTNLEDAGNLTNDDAGKLTNNDAGQLTNSDDAGNLTVNDAGQLTNVDGDKLTNNDAGQLTNSDDAGNLTVNDGDKLTINGDAGNLTVDDAGKLTVDDAGKLTINGDKLTNNDAGQLTNSDDAGNLTVNDGDKLTNNDAGQLTNSDDAGNLTNNDAG",
  },
  {
    name: "HPAI HA (фрагмент)",
    pathogen: "Грипп птиц",
    seq: "MDKVKPLILATMVVSTLVAAVACGAAWTIADQICIGYHANNSTEQAQDINGLYNRLTQNSESEKVNSIVEKMNTQFTAVGKEFNHLERRIENLNKVLDDFLDSKTAYYEEQHGLSNNSSQHEQNKAINQMLAELQKFQDNKTKSILEKLKDSQNGIITNENTQTSQISIIVTNEKDLKLEESDEVKQQLQKAAQVTNATSSGRTLEDVFSNGKLRVMVPIYGKIMNILKDGRNILTLGLDSAGAY",
  },
];
