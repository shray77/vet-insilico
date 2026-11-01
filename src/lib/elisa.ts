/**
 * ELISA Cut-off Calculator — statistical analysis of ELISA OD values.
 *
 * Features:
 *   - Mean, SD, CV% for negative controls
 *   - Cut-off calculation (mean + 2SD or 3SD)
 *   - Positive/negative classification
 *   - ROC curve (if positives provided)
 *   - Sensitivity, specificity at given cut-off
 *
 * All in browser, no external dependencies.
 */

export interface ELISAResult {
  negatives: number[];
  positives?: number[];
  /** Mean of negatives. */
  meanNeg: number;
  /** SD of negatives. */
  sdNeg: number;
  /** CV% of negatives. */
  cvPercent: number;
  /** Cut-off (mean + 2SD). */
  cutoff2SD: number;
  /** Cut-off (mean + 3SD). */
  cutoff3SD: number;
  /** Cut-off: upper prediction bound mean + t·SD·√(1+1/n) (Frey 1998). */
  cutoffFrey: number;
  /** Recommended cut-off. */
  recommendedCutoff: number;
  /** Samples classified as positive at recommended cut-off. */
  classifiedPositive: number;
  classifiedNegative: number;
  /** If positives provided: sensitivity/specificity. */
  sensitivity?: number;
  specificity?: number;
  /** ROC curve points. */
  rocPoints?: { fpr: number; tpr: number; cutoff: number }[];
  /** AUC (Area Under ROC Curve). */
  auc?: number;
}

function mean(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/** Plausible absorbance (OD) range for ELISA readings (SW-13: out-of-range input must be a loud error, not silent garbage). */
const OD_MIN = 0;
const OD_MAX = 4;

export interface ParsedODInput {
  /** Valid parsed OD values. */
  values: number[];
  /** Honest problems for invalid / out-of-range tokens (shown to the user). */
  problems: string[];
}

/**
 * Parse textarea input with OD values (SW-13 fix).
 *
 * - Values are separated by whitespace / newlines / semicolons.
 * - A decimal comma («0,105» — русская локаль) is normalized to a point
 *   BEFORE Number() — otherwise «0,105» silently splits into 0 and 105
 *   and the cut-off explodes (167.86 instead of 0.12).
 * - «0.105,0.098» (dot values, comma as list separator) keeps working.
 * - Values outside the plausible OD range [0, 4] and non-numeric tokens are
 *   reported as problems instead of silently poisoning the statistics.
 */
export function parseODInput(text: string): ParsedODInput {
  const values: number[] = [];
  const problems: string[] = [];
  const tokens = text.split(/[\s;]+/).filter(Boolean);
  for (const raw of tokens) {
    let tokens2: string[];
    if (raw.includes(",")) {
      if (raw.includes(".")) {
        // dots present → commas are list separators («0.105,0.098»)
        tokens2 = raw.split(",").filter(Boolean);
      } else if ((raw.match(/,/g) || []).length === 1 && /^-?\d+,\d+$/.test(raw)) {
        // single decimal comma, no dot → «0,105» → 0.105
        tokens2 = [raw.replace(",", ".")];
      } else {
        problems.push(`«${raw}» — не распознано (запятая: десятичная «0,105» допустима, значения разделяйте пробелом/переводом строки)`);
        continue;
      }
    } else {
      tokens2 = [raw];
    }
    for (const token of tokens2) {
      const v = Number(token);
      if (!isFinite(v)) {
        problems.push(`«${raw}» — не число`);
      } else if (v < OD_MIN || v > OD_MAX) {
        problems.push(`«${raw}» — вне правдоподобного диапазона OD ${OD_MIN}–${OD_MAX}`);
      } else {
        values.push(v);
      }
    }
  }
  return { values, problems };
}

/** One-sided 95% Student's t critical values (prediction bound, Frey 1998). */
const T95_ONE_SIDED: Record<number, number> = {
  1: 6.314, 2: 2.920, 3: 2.353, 4: 2.132, 5: 2.015, 6: 1.943, 7: 1.895,
  8: 1.860, 9: 1.833, 10: 1.812, 11: 1.796, 12: 1.782, 13: 1.771,
  14: 1.761, 15: 1.753, 20: 1.725, 25: 1.708, 30: 1.697, 40: 1.684,
  60: 1.671, 120: 1.658,
};

function t95(df: number): number {
  if (df >= 120) return 1.645;
  const keys = Object.keys(T95_ONE_SIDED).map(Number).sort((a, b) => a - b);
  let prev = keys[0];
  for (const k of keys) {
    if (k >= df) {
      if (k === df) return T95_ONE_SIDED[k];
      const f = (df - prev) / (k - prev);
      return T95_ONE_SIDED[prev] + f * (T95_ONE_SIDED[k] - T95_ONE_SIDED[prev]);
    }
    prev = k;
  }
  return 1.645;
}

export function analyzeELISA(negatives: number[], positives?: number[], method: "2SD" | "3SD" | "frey" = "2SD"): ELISAResult {
  const meanNeg = mean(negatives);
  const sdNeg = stdDev(negatives);
  const cvPercent = meanNeg > 0 ? (sdNeg / meanNeg) * 100 : 0;

  const cutoff2SD = meanNeg + 2 * sdNeg;
  const cutoff3SD = meanNeg + 3 * sdNeg;
  // Frey et al. 1998 (J Immunol Methods 221:35-41): upper prediction bound
  // mean + t·SD·√(1+1/n) — statistically meaningful unlike plain mean+2SD/3SD.
  const n = negatives.length;
  const cutoffFrey = n >= 2 ? meanNeg + t95(n - 1) * sdNeg * Math.sqrt(1 + 1 / n) : cutoff2SD;
  const recommendedCutoff = method === "2SD" ? cutoff2SD : method === "3SD" ? cutoff3SD : cutoffFrey;

  // Classify all samples
  const allSamples = [...negatives, ...(positives || [])];
  const classifiedPositive = allSamples.filter(v => v >= recommendedCutoff).length;
  const classifiedNegative = allSamples.length - classifiedPositive;

  let sensitivity: number | undefined;
  let specificity: number | undefined;
  let rocPoints: { fpr: number; tpr: number; cutoff: number }[] | undefined;
  let auc: number | undefined;

  if (positives && positives.length > 0) {
    // Sensitivity: true positive rate at recommended cut-off
    const truePositives = positives.filter(v => v >= recommendedCutoff).length;
    sensitivity = (truePositives / positives.length) * 100;

    // Specificity: true negative rate at recommended cut-off
    const trueNegatives = negatives.filter(v => v < recommendedCutoff).length;
    specificity = (trueNegatives / negatives.length) * 100;

    // ROC curve: sweep through all possible cut-offs
    const allValues = [...negatives, ...positives].sort((a, b) => a - b);
    rocPoints = [];
    for (const cutoff of allValues) {
      const tp = positives.filter(v => v >= cutoff).length;
      const fp = negatives.filter(v => v >= cutoff).length;
      const fn = positives.filter(v => v < cutoff).length;
      const tn = negatives.filter(v => v < cutoff).length;
      const tpr = tp / (tp + fn); // sensitivity
      const fpr = fp / (fp + tn); // 1 - specificity
      rocPoints.push({ fpr, tpr, cutoff });
    }

    // Sort by (fpr, tpr) ascending so that ties in fpr form a proper staircase
    // (previously points with equal fpr kept descending-tpr insertion order,
    // breaking both the drawn path and any trapezoid integration).
    rocPoints.sort((a, b) => a.fpr - b.fpr || a.tpr - b.tpr);

    // AUC via Mann–Whitney U: AUC = P(pos > neg) + ½·P(pos = neg).
    // Equivalent to the empirical ROC curve and robust to ties; fixes the
    // systematic −0.11…−0.19 underestimation of the trapezoid implementation
    // (SW-11 §5C: perfect separation gave 0.8889 instead of 1.0000).
    let u = 0;
    for (const p of positives) {
      for (const neg of negatives) {
        u += p > neg ? 1 : p === neg ? 0.5 : 0;
      }
    }
    auc = Number((u / (positives.length * negatives.length)).toFixed(4));
  }

  return {
    negatives,
    positives,
    meanNeg: Number(meanNeg.toFixed(4)),
    sdNeg: Number(sdNeg.toFixed(4)),
    cvPercent: Number(cvPercent.toFixed(2)),
    cutoff2SD: Number(cutoff2SD.toFixed(4)),
    cutoff3SD: Number(cutoff3SD.toFixed(4)),
    cutoffFrey: Number(cutoffFrey.toFixed(4)),
    recommendedCutoff: Number(recommendedCutoff.toFixed(4)),
    classifiedPositive,
    classifiedNegative,
    sensitivity: sensitivity !== undefined ? Number(sensitivity.toFixed(2)) : undefined,
    specificity: specificity !== undefined ? Number(specificity.toFixed(2)) : undefined,
    rocPoints,
    auc,
  };
}
