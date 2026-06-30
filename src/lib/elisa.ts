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

export function analyzeELISA(negatives: number[], positives?: number[], method: "2SD" | "3SD" = "2SD"): ELISAResult {
  const meanNeg = mean(negatives);
  const sdNeg = stdDev(negatives);
  const cvPercent = meanNeg > 0 ? (sdNeg / meanNeg) * 100 : 0;

  const cutoff2SD = meanNeg + 2 * sdNeg;
  const cutoff3SD = meanNeg + 3 * sdNeg;
  const recommendedCutoff = method === "2SD" ? cutoff2SD : cutoff3SD;

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

    // AUC via trapezoidal rule
    rocPoints.sort((a, b) => a.fpr - b.fpr);
    auc = 0;
    for (let i = 1; i < rocPoints.length; i++) {
      const dx = rocPoints[i].fpr - rocPoints[i - 1].fpr;
      const dy = (rocPoints[i].tpr + rocPoints[i - 1].tpr) / 2;
      auc += dx * dy;
    }
    auc = Number(auc.toFixed(4));
  }

  return {
    negatives,
    positives,
    meanNeg: Number(meanNeg.toFixed(4)),
    sdNeg: Number(sdNeg.toFixed(4)),
    cvPercent: Number(cvPercent.toFixed(2)),
    cutoff2SD: Number(cutoff2SD.toFixed(4)),
    cutoff3SD: Number(cutoff3SD.toFixed(4)),
    recommendedCutoff: Number(recommendedCutoff.toFixed(4)),
    classifiedPositive,
    classifiedNegative,
    sensitivity: sensitivity !== undefined ? Number(sensitivity.toFixed(2)) : undefined,
    specificity: specificity !== undefined ? Number(specificity.toFixed(2)) : undefined,
    rocPoints,
    auc,
  };
}
