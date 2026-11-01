import { describe, it, expect } from "vitest";
import { analyzeELISA, parseODInput } from "./elisa";

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

  it("AUC = 1.0 exactly for perfectly separated positives/negatives (SW-11: было 0.8889)", () => {
    const negatives = [0.1, 0.12, 0.11];
    const positives = [0.9, 0.95, 1.0];
    const result = analyzeELISA(negatives, positives);
    // Mann–Whitney U: все позитивы > всех негативов → AUC = 1
    expect(result.auc).toBeCloseTo(1.0, 4);
  });

  it("AUC handles ties correctly (SW-11: Манн–Уитни, связь = 0.5)", () => {
    // neg [0.1, 0.2], pos [0.2, 0.5]: 1 + 0.5 + 1 + 1 = 3.5/4 = 0.875
    const result = analyzeELISA([0.1, 0.2], [0.2, 0.5]);
    expect(result.auc).toBeCloseTo(0.875, 4);
  });

  it("AUC for strong overlap dataset (SW-11 check-roc: 0.7778)", () => {
    const result = analyzeELISA([0.1, 0.5, 0.55], [0.45, 0.6, 0.9]);
    expect(result.auc).toBeCloseTo(7 / 9, 4);
  });
});

describe("parseODInput", () => {
  it("normalizes decimal comma «0,105» → 0.105 (SW-13: было 0 и 105, cut-off 167.86)", () => {
    const { values, problems } = parseODInput("0,105\n0,098\n0,112");
    expect(values).toEqual([0.105, 0.098, 0.112]);
    expect(problems).toEqual([]);
  });

  it("accepts dot-separated values (whitespace / comma-separated)", () => {
    expect(parseODInput("0.105 0.098").values).toEqual([0.105, 0.098]);
    expect(parseODInput("0.105,0.098").values).toEqual([0.105, 0.098]);
    expect(parseODInput("0.105;0.098").values).toEqual([0.105, 0.098]);
  });

  it("reports out-of-range values as problems, not silent garbage", () => {
    const { values, problems } = parseODInput("0,105\n167\n999");
    expect(values).toEqual([0.105]);
    expect(problems.length).toBe(2);
    expect(problems[0]).toContain("диапазона");
  });

  it("reports non-numeric tokens honestly (SW-13 Ш4: счётчик считал мусор)", () => {
    const { values, problems } = parseODInput("<b>test</b> 🐈 中文");
    expect(values).toEqual([]);
    expect(problems.length).toBeGreaterThan(0);
  });

  it("rejects ambiguous multi-comma input instead of splitting into integers", () => {
    const { values, problems } = parseODInput("0,105,0,098");
    expect(values).toEqual([]);
    expect(problems.length).toBe(1);
  });
});

describe("analyzeELISA Frey cut-off", () => {
  it("cutoffFrey = mean + t(0.95, n−1)·SD·√(1+1/n)", () => {
    const negs = [0.1, 0.12, 0.11, 0.09, 0.13]; // n=5, df=4, t=2.132
    const m = 0.11;
    const s = Math.sqrt(negs.reduce((sq, v) => sq + (v - m) ** 2, 0) / 4);
    const result = analyzeELISA(negs, undefined, "frey");
    expect(result.cutoffFrey).toBeCloseTo(m + 2.132 * s * Math.sqrt(1.2), 3);
    expect(result.recommendedCutoff).toBe(result.cutoffFrey);
  });
});
