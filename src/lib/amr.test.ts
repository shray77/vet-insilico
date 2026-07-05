import { describe, it, expect } from "vitest";
import { predictAMR, getAffectedDrugs, AMR_SAMPLES } from "./amr";
import { DRUGS } from "@/data/drugs";

describe("predictAMR", () => {
  it("returns zero hits for wild-type sequence", () => {
    const wt = AMR_SAMPLES[0]; // E. coli gyrA susceptible
    const result = predictAMR(wt.seq);
    expect(result.hits.length).toBe(0);
    expect(result.overallScore).toBe(0);
  });

  it("detects S83L mutation in GyrA QRDR", () => {
    const resistant = AMR_SAMPLES[1]; // S83L + D87N
    const result = predictAMR(resistant.seq);
    expect(result.hits.length).toBeGreaterThan(0);
    // Should find fluoroquinolone resistance
    const fqHit = result.hits.find((h) => h.drugClass === "Фторхинолоны");
    expect(fqHit).toBeDefined();
    expect(fqHit!.mutant).toBe("L"); // S83L
  });

  it("detects S531L mutation in RpoB", () => {
    const rifR = AMR_SAMPLES[2]; // rpoB S531L
    const result = predictAMR(rifR.seq);
    expect(result.hits.length).toBeGreaterThan(0);
    const rifHit = result.hits.find((h) => h.drugClass === "Рифамицины");
    expect(rifHit).toBeDefined();
  });

  it("classifies resistance levels correctly", () => {
    const resistant = AMR_SAMPLES[1];
    const result = predictAMR(resistant.seq);
    expect(result.classScores.length).toBeGreaterThan(0);
    result.classScores.forEach((c) => {
      expect(["susceptible", "intermediate", "resistant"]).toContain(c.level);
    });
  });

  it("provides recommendation text", () => {
    AMR_SAMPLES.forEach((s) => {
      const result = predictAMR(s.seq);
      expect(result.recommendation).toBeTruthy();
      expect(result.recommendation.length).toBeGreaterThan(10);
    });
  });
});

describe("getAffectedDrugs", () => {
  it("returns drugs matching detected resistance classes", () => {
    const resistant = AMR_SAMPLES[1]; // fluoroquinolone resistant
    const result = predictAMR(resistant.seq);
    const affected = getAffectedDrugs(result, DRUGS);
    // Should include some fluoroquinolones from our DB
    expect(affected.length).toBeGreaterThan(0);
    const fqDrugs = affected.filter((d) => d.pharm_group.includes("Фторхинолон"));
    expect(fqDrugs.length).toBeGreaterThan(0);
  });
});

describe("AMR_SAMPLES", () => {
  it("has 4 samples with proper structure", () => {
    expect(AMR_SAMPLES.length).toBe(4);
    AMR_SAMPLES.forEach((s) => {
      expect(s.name).toBeTruthy();
      expect(s.description).toBeTruthy();
      expect(s.seq.length).toBeGreaterThan(50);
    });
  });
});
