/**
 * BLOSUM62 substitution matrix — single source of truth.
 *
 * Source: NCBI BLOSUM62 (Henikoff & Henikoff, 1992), public domain.
 * Used by: alignment.ts (Needleman-Wunsch / Smith-Waterman scoring),
 * hf.ts (peptide similarity for epitope prediction), phylo.ts (via alignment).
 *
 * Previously duplicated in alignment.ts (~60 lines) and hf.ts (~35 lines).
 * If one was updated, the other drifted. Now both import from here.
 */

const AA_ORDER = "ARNDCQEGHILKMFPSTWYV";

// Raw scores (upper triangle, row by row)
const RAW_SCORES: string[] = [
  "4,-1,-2,-2,0,-1,-1,0,-2,-1,-1,-1,-1,-2,-1,1,0,-3,-1,0", // A
  "-1,5,0,-2,-3,1,0,-2,0,-3,-2,2,-1,-3,-2,-1,-1,-3,-2,-3", // R
  "-2,0,6,1,-3,0,0,0,1,-3,-3,0,-2,-3,-2,1,0,-4,-2,-3", // N
  "-2,-2,1,6,-3,0,2,-1,-1,-3,-4,-1,-3,-3,-1,0,-1,-4,-3,-3", // D
  "0,-3,-3,-3,9,-3,-4,-3,-3,-1,-1,-3,-1,-2,-3,-1,-1,-2,-2,-1", // C
  "-1,1,0,0,-3,5,2,-2,0,-3,-2,1,0,-3,-1,0,-1,-2,-1,-2", // Q
  "-1,0,0,2,-4,2,5,-2,0,-3,-3,1,-2,-3,-1,0,-1,-3,-2,-2", // E
  "0,-2,0,-1,-3,-2,-2,6,-2,-4,-4,-2,-3,-3,-2,0,-2,-2,-3,-3", // G
  "-2,0,1,-1,-3,0,0,-2,8,-3,-3,-1,-2,-1,-2,-1,-2,-2,2,-3", // H
  "-1,-3,-3,-3,-1,-3,-3,-4,-3,4,2,-3,1,0,-3,-2,-1,-3,-1,3", // I
  "-1,-2,-3,-4,-1,-2,-3,-4,-3,2,4,-2,2,0,-3,-2,-1,-2,-1,1", // L
  "-1,2,0,-1,-3,1,1,-2,-1,-3,-2,5,-1,-3,-1,0,-1,-3,-2,-2", // K
  "-1,-1,-2,-3,-1,0,-2,-3,-2,1,2,-1,5,0,-2,-1,-1,-1,-1,1", // M
  "-2,-3,-3,-3,-2,-3,-3,-3,-1,0,0,-3,0,6,-4,-2,-2,1,3,-1", // F
  "-1,-2,-2,-1,-3,-1,-1,-2,-2,-3,-3,-1,-2,-4,7,-1,-1,-4,-3,-2", // P
  "1,-1,1,0,-1,0,0,0,-1,-2,-2,0,-1,-2,-1,4,1,-3,-2,-2", // S
  "0,-1,0,-1,-1,-1,-1,-2,-2,-1,-1,-1,-1,-2,-1,1,5,-2,-2,0", // T
  "-3,-3,-4,-4,-2,-2,-3,-2,-2,-3,-2,-3,-1,1,-4,-3,-2,11,2,-3", // W
  "-1,-2,-2,-3,-2,-1,-2,-3,2,-1,-1,-2,-1,3,-3,-2,-2,2,7,-1", // Y
  "0,-3,-3,-3,-1,-2,-2,-3,-3,3,1,-2,1,-1,-2,-2,0,-3,-1,4", // V
];

/** Full symmetric BLOSUM62 matrix: matrix[aa1][aa2] = score. */
export const BLOSUM62: Record<string, Record<string, number>> = (() => {
  const matrix: Record<string, Record<string, number>> = {};
  for (let i = 0; i < 20; i++) {
    const a = AA_ORDER[i];
    matrix[a] = {};
    const rowScores = RAW_SCORES[i].split(",").map(Number);
    for (let j = 0; j < rowScores.length; j++) {
      const b = AA_ORDER[j];
      matrix[a][b] = rowScores[j];
      matrix[b] = matrix[b] || {};
      matrix[b][a] = rowScores[j];
    }
  }
  return matrix;
})();

/**
 * Get BLOSUM62 substitution score for two amino acids.
 * Returns -4 for unknown amino acids (e.g., X, *, -).
 */
export function blosum62Score(a: string, b: string): number {
  return BLOSUM62[a]?.[b] ?? -4;
}

/**
 * Compute BLOSUM62 similarity score between a peptide and a reference peptide.
 * Returns a normalized score 0-1 (1 = identical).
 */
export function peptideSimilarity(peptide: string, reference: string): number {
  if (peptide.length !== reference.length || peptide.length === 0) return 0;
  let score = 0;
  let maxPossible = 0;
  for (let i = 0; i < peptide.length; i++) {
    const a = peptide[i].toUpperCase();
    const b = reference[i].toUpperCase();
    score += blosum62Score(a, b);
    maxPossible += blosum62Score(a, a);
  }
  return maxPossible > 0 ? Math.max(0, score / maxPossible) : 0;
}
