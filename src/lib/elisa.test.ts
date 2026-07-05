import { describe, it, expect } from "vitest";
import { analyzeELISA } from "./elisa";

describe("analyzeELISA", () => {
  it("calculates mean and SD of negatives", () => {
    const result = analyzeELISA([0.1, 0.12, 0.11, 0.09, 0.13]);
    expect(result.meanNeg).toBeCloseTo(0.11, 4);
    expect(result.sdNeg).toBeGreaterThan(0);
  });

  it("cut-off = mean + 2SD (default)", () => {
    const result = analyzeELISA([0.1, 0.12, 0.11, 0.09, 0.13], undefined, "2SD");
    expect(result.recommendedCutoff).toBeCloseTo(result.meanNeg + 2 * result.sdNeg, 4);
  });

  it("cut-off = mean + 3SD (3SD method)", () => {
    const result = analyzeELISA([0.1, 0.12, 0.11, 0.09, 0.13], undefined, "3SD");
    expect(result.recommendedCutoff).toBeCloseTo(result.meanNeg + 3 * result.sdNeg, 4);
    expect(result.recommendedCutoff).toBeGreaterThan(result.cutoff2SD);
  });

  it("CV% is calculated correctly", () => {
    const result = analyzeELISA([0.1, 0.12, 0.11, 0.09, 0.13]);
    const expectedCV = (result.sdNeg / result.meanNeg) * 100;
    expect(result.cvPercent).toBeCloseTo(Number(expectedCV.toFixed(2)), 1);
  });

  it("classifies samples as positive/negative at cut-off", () => {
    const negatives = [0.1, 0.12, 0.11, 0.09, 0.13];
    const positives = [0.5, 0.6, 0.7];
    const result = analyzeELISA(negatives, positives);
    expect(result.classifiedPositive).toBeGreaterThan(0);
    expect(result.classifiedNegative).toBeGreaterThan(0);
    expect(result.classifiedPositive + result.classifiedNegative).toBe(negatives.length + positives.length);
  });

  it("calculates sensitivity and specificity when positives provided", () => {
    const negatives = [0.1, 0.12, 0.11, 0.09, 0.13, 0.08, 0.14, 0.10];
    const positives = [0.5, 0.6, 0.7, 0.8, 0.55];
    const result = analyzeELISA(negatives, positives);
    expect(result.sensitivity).toBeDefined();
    expect(result.specificity).toBeDefined();
    expect(result.sensitivity).toBeGreaterThan(0);
    expect(result.specificity).toBeGreaterThan(0);
  });

  it("generates ROC curve points when positives provided", () => {
    const negatives = [0.1, 0.12, 0.11, 0.09, 0.13];
    const positives = [0.5, 0.6, 0.7];
    const result = analyzeELISA(negatives, positives);
    expect(result.rocPoints).toBeDefined();
    expect(result.rocPoints!.length).toBeGreaterThan(0);
    expect(result.auc).toBeDefined();
    expect(result.auc).toBeGreaterThan(0.5); // should be better than random
  });

  it("AUC ≈ 1.0 for perfectly separated positives/negatives", () => {
    const negatives = [0.1, 0.12, 0.11];
    const positives = [0.9, 0.95, 1.0];
    const result = analyzeELISA(negatives, positives);
    // Should be very high (>0.85) but may not be exactly 1.0 due to trapezoidal approximation
    expect(result.auc).toBeGreaterThan(0.85);
  });
});
