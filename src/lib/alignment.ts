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

import { BLOSUM62 } from "./blosum62";

// BLOSUM62 is now imported from blosum62.ts (single source of truth).
// Previously duplicated here (~60 lines) and in hf.ts (~35 lines).

function getScore(a: string, b: string, seqType: SeqType): number {
  if (seqType === "protein") {
    return BLOSUM62[a]?.[b] ?? -4;
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
