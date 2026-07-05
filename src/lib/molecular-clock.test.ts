import { describe, it, expect } from "vitest";
import { calculateDivergenceTime, CLOCK_RATES, MOLECULAR_CLOCK_SAMPLES } from "./molecular-clock";

describe("calculateDivergenceTime", () => {
  it("calculates time using T = d / (2r)", () => {
    const result = calculateDivergenceTime(0.01, 1e-3);
    expect(result.divergenceTimeYears).toBe(5); // 0.01 / (2 × 0.001) = 5
  });

  it("higher distance → older divergence", () => {
    const young = calculateDivergenceTime(0.001, 1e-3);
    const old = calculateDivergenceTime(0.01, 1e-3);
    expect(old.divergenceTimeYears).toBeGreaterThan(young.divergenceTimeYears);
  });

  it("slower clock → older divergence", () => {
    const fast = calculateDivergenceTime(0.01, 1e-2);
    const slow = calculateDivergenceTime(0.01, 1e-5);
    expect(slow.divergenceTimeYears).toBeGreaterThan(fast.divergenceTimeYears);
  });

  it("confidence intervals are symmetric around point estimate", () => {
    const result = calculateDivergenceTime(0.01, 1e-3, 0.001);
    const upper = result.upperBoundYears - result.divergenceTimeYears;
    const lower = result.divergenceTimeYears - result.lowerBoundYears;
    expect(upper).toBeCloseTo(lower, 1);
  });

  it("human-readable format is provided", () => {
    const result = calculateDivergenceTime(0.01, 1e-3);
    expect(result.humanReadable).toBeTruthy();
    expect(result.humanReadable.length).toBeGreaterThan(3);
  });

  it("method string is T = d / (2r)", () => {
    const result = calculateDivergenceTime(0.01, 1e-3);
    expect(result.method).toBe("T = d / (2r)");
  });
});

describe("CLOCK_RATES", () => {
  it("has 12 clock rates", () => {
    expect(CLOCK_RATES.length).toBe(12);
  });

  it("all rates are positive", () => {
    CLOCK_RATES.forEach((r) => {
      expect(r.rate).toBeGreaterThan(0);
    });
  });

  it("includes ASFV, Influenza, Rabies, FMDV", () => {
    const genes = CLOCK_RATES.map((r) => r.gene);
    expect(genes.some((g) => g.includes("ASFV"))).toBe(true);
    expect(genes.some((g) => g.includes("Influenza"))).toBe(true);
    expect(genes.some((g) => g.includes("Rabies"))).toBe(true);
    expect(genes.some((g) => g.includes("FMDV"))).toBe(true);
  });

  it("all rates have source attribution", () => {
    CLOCK_RATES.forEach((r) => {
      expect(r.source).toBeTruthy();
    });
  });
});

describe("MOLECULAR_CLOCK_SAMPLES", () => {
  it("has valid samples", () => {
    MOLECULAR_CLOCK_SAMPLES.forEach((s) => {
      expect(s.name).toBeTruthy();
      expect(s.gene).toBeTruthy();
      expect(s.pairs.length).toBeGreaterThan(0);
      s.pairs.forEach((p) => {
        expect(p.distance).toBeGreaterThan(0);
        expect(p.strain1).toBeTruthy();
        expect(p.strain2).toBeTruthy();
      });
    });
  });
});
