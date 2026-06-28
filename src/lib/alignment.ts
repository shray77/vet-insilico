/**
 * Sequence Alignment — Needleman-Wunsch (global) and Smith-Waterman (local).
 *
 * Both algorithms use dynamic programming. Scoring via BLOSUM62 matrix
 * (for protein) or simple match/mismatch (for DNA).
 *
 * Outputs aligned sequences with gaps, alignment score, identity %,
 * similarity %, and per-position annotation.
 *
 * All in browser, no external dependencies.
 */

export type SeqType = "protein" | "dna";

export interface AlignmentResult {
  alignedA: string;
  alignedB: string;
  matchLine: string; // | for match, : for similar, . for mismatch-like, space for gap
  score: number;
  identity: number; // % identical residues
  similarity: number; // % similar (BLOSUM > 0)
  gaps: number; // total gap positions
  length: number;
  algorithm: "needleman-wunsch" | "smith-waterman";
}

// BLOSUM62 substitution matrix (selected, symmetric — only storing upper triangle)
// Source: NCBI BLOSUM62, public domain
const BLOSUM62_DATA: Record<string, Record<string, number>> = (() => {
  const rows: Record<string, string> = {
    A: "ARNDCQEGHILKMFPSTWYV",
    R: "RNDCQEGHILKMFPSTWYV",
    N: "NDCQEGHILKMFPSTWYV",
    D: "DCQEGHILKMFPSTWYV",
    C: "CQEGHILKMFPSTWYV",
    Q: "QEGHILKMFPSTWYV",
    E: "EGHILKMFPSTWYV",
    G: "GHILKMFPSTWYV",
    H: "HILKMFPSTWYV",
    I: "ILKMFPSTWYV",
    L: "LKMFPSTWYV",
    K: "KMFPSTWYV",
    M: "MFPSTWYV",
    F: "FPSTWYV",
    P: "PSTWYV",
    S: "STWYV",
    T: "TWYV",
    W: "WYV",
    Y: "YV",
    V: "V",
  };
  // BLOSUM62 scores (Henikoff 1992)
  const scores: string[] = [
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
  const matrix: Record<string, Record<string, number>> = {};
  for (let i = 0; i < 20; i++) {
    const a = "ARNDCQEGHILKMFPSTWYV"[i];
    matrix[a] = {};
    const rowScores = scores[i].split(",").map(Number);
    for (let j = 0; j < rowScores.length; j++) {
      const b = rows[a][j];
      matrix[a][b] = rowScores[j];
      matrix[b] = matrix[b] || {};
      matrix[b][a] = rowScores[j];
    }
  }
  return matrix;
})();

function getScore(a: string, b: string, seqType: SeqType): number {
  if (seqType === "protein") {
    return BLOSUM62_DATA[a]?.[b] ?? -4;
  }
  // DNA: +2 match, -1 mismatch
  return a === b ? 2 : -1;
}

/**
 * Needleman-Wunsch global alignment.
 */
export function needlemanWunsch(
  seqA: string,
  seqB: string,
  seqType: SeqType = "protein",
  gapPenalty = -8,
): AlignmentResult {
  const A = seqA.toUpperCase();
  const B = seqB.toUpperCase();
  const m = A.length;
  const n = B.length;

  // DP matrix
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i * gapPenalty;
  for (let j = 0; j <= n; j++) dp[0][j] = j * gapPenalty;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const match = dp[i - 1][j - 1] + getScore(A[i - 1], B[j - 1], seqType);
      const del = dp[i - 1][j] + gapPenalty;
      const ins = dp[i][j - 1] + gapPenalty;
      dp[i][j] = Math.max(match, del, ins);
    }
  }

  // Traceback
  let alignedA = "";
  let alignedB = "";
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + getScore(A[i - 1], B[j - 1], seqType)) {
      alignedA = A[i - 1] + alignedA;
      alignedB = B[j - 1] + alignedB;
      i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + gapPenalty) {
      alignedA = A[i - 1] + alignedA;
      alignedB = "-" + alignedB;
      i--;
    } else {
      alignedA = "-" + alignedA;
      alignedB = B[j - 1] + alignedB;
      j--;
    }
  }

  return buildResult(alignedA, alignedB, dp[m][n], seqType, "needleman-wunsch");
}

/**
 * Smith-Waterman local alignment.
 */
export function smithWaterman(
  seqA: string,
  seqB: string,
  seqType: SeqType = "protein",
  gapPenalty = -8,
): AlignmentResult {
  const A = seqA.toUpperCase();
  const B = seqB.toUpperCase();
  const m = A.length;
  const n = B.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  let maxScore = 0;
  let maxI = 0, maxJ = 0;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const match = dp[i - 1][j - 1] + getScore(A[i - 1], B[j - 1], seqType);
      const del = dp[i - 1][j] + gapPenalty;
      const ins = dp[i][j - 1] + gapPenalty;
      dp[i][j] = Math.max(0, match, del, ins);
      if (dp[i][j] > maxScore) {
        maxScore = dp[i][j];
        maxI = i;
        maxJ = j;
      }
    }
  }

  // Traceback from max until hits 0
  let alignedA = "";
  let alignedB = "";
  let i = maxI, j = maxJ;
  while (i > 0 && j > 0 && dp[i][j] > 0) {
    if (dp[i][j] === dp[i - 1][j - 1] + getScore(A[i - 1], B[j - 1], seqType)) {
      alignedA = A[i - 1] + alignedA;
      alignedB = B[j - 1] + alignedB;
      i--; j--;
    } else if (dp[i][j] === dp[i - 1][j] + gapPenalty) {
      alignedA = A[i - 1] + alignedA;
      alignedB = "-" + alignedB;
      i--;
    } else {
      alignedA = "-" + alignedA;
      alignedB = B[j - 1] + alignedB;
      j--;
    }
  }

  return buildResult(alignedA, alignedB, maxScore, seqType, "smith-waterman");
}

function buildResult(
  alignedA: string,
  alignedB: string,
  score: number,
  seqType: SeqType,
  algo: "needleman-wunsch" | "smith-waterman",
): AlignmentResult {
  let matchLine = "";
  let identical = 0;
  let similar = 0;
  let gaps = 0;
  for (let k = 0; k < alignedA.length; k++) {
    const a = alignedA[k];
    const b = alignedB[k];
    if (a === "-" || b === "-") {
      matchLine += " ";
      gaps++;
    } else if (a === b) {
      matchLine += "|";
      identical++;
      similar++;
    } else if (seqType === "protein" && getScore(a, b, "protein") > 0) {
      matchLine += ":";
      similar++;
    } else {
      matchLine += ".";
    }
  }
  const length = alignedA.length;
  const identity = length > 0 ? (identical / length) * 100 : 0;
  const similarity = length > 0 ? (similar / length) * 100 : 0;
  return {
    alignedA,
    alignedB,
    matchLine,
    score,
    identity: Number(identity.toFixed(1)),
    similarity: Number(similarity.toFixed(1)),
    gaps,
    length,
    algorithm: algo,
  };
}

export const ALIGNMENT_SAMPLES: { name: string; pathogen: string; seqs: { a: string; b: string; type: SeqType } }[] = [
  {
    name: "ASFV p72 (2 штамма)",
    pathogen: "Африканская чума свиней",
    seqs: {
      a: "MKNHKQYDHLHKHQLHNHLQNHIYHMHQQHQLHNNQLHNHIYQLHHQLHNHIY",
      b: "MKNHKQYDHLHKHQLHNHLQNHIFHMHQQHQLHNNQLHNHIYQLHHQLHNHIY",
      type: "protein",
    },
  },
  {
    name: "Brucella Omp25 (фрагменты)",
    pathogen: "Бруцеллёз",
    seqs: {
      a: "MKKLLFAAIGALTAGCGNFAQLPDVDKQVSDADVTKLRGFGDDSVKAGGDRTVADKDAGLVTK",
      b: "MKKLLFAAIGALTAGCGNFAQLPDVDKQVSDADVTKLRGFGDDSVKAGGDRTVADKDAGLVSK",
      type: "protein",
    },
  },
  {
    name: "Rabies N gene (DNA, 2 варианта)",
    pathogen: "Бешенство",
    seqs: {
      a: "ATGGTGTCACCAATCGTGCCCGTCAAGAGGGTTGAGACAAAGATCGTCAAAGAG",
      b: "ATGGTGTCACCAATCGTGCCCGTCAAGAGGGTTGAGACAAAGATCGTCAAATAG",
      type: "dna",
    },
  },
  {
    name: "HPAI HA (фрагменты)",
    pathogen: "Грипп птиц",
    seqs: {
      a: "MDKVKPLILATMVVSTLVAAVACGAAWTIADQICIGYHANNSTEQAQDINGLYNRLTQN",
      b: "MDKVKPLILATMVVSTLVAAVACGAAWTIADQICIGYHANNSTEQAQDINGLYNRLTQS",
      type: "protein",
    },
  },
];
