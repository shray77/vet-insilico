import { describe, it, expect } from "vitest";
import { designPrimers, PRIMER_SAMPLE_TARGETS } from "./primer";

describe("designPrimers", () => {
  it("returns empty for short sequences (<100 bp)", () => {
    const result = designPrimers({ sequence: "ACGTACGTACGTACGTACGTACGTACGTACGT" });
    expect(result).toEqual([]);
  });

  it("returns primer pairs for ASFV sample target", () => {
    const result = designPrimers({
      sequence: PRIMER_SAMPLE_TARGETS[0].seq,
      topN: 5,
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("each pair has forward + reverse primers", () => {
    const result = designPrimers({
      sequence: PRIMER_SAMPLE_TARGETS[0].seq,
      topN: 10,
    });
    result.forEach((p) => {
      expect(p.forward.sequence.length).toBeGreaterThanOrEqual(15);
      expect(p.forward.sequence.length).toBeLessThanOrEqual(30);
      expect(p.reverse.sequence.length).toBeGreaterThanOrEqual(15);
      expect(p.reverse.sequence.length).toBeLessThanOrEqual(30);
      expect(p.forward.orientation).toBe("forward");
      expect(p.reverse.orientation).toBe("reverse");
    });
  });

  it("all primer sequences are valid DNA (ACGT only)", () => {
    const result = designPrimers({
      sequence: PRIMER_SAMPLE_TARGETS[0].seq,
      topN: 10,
    });
    result.forEach((p) => {
      expect(p.forward.sequence).toMatch(/^[ACGT]+$/);
      expect(p.reverse.sequence).toMatch(/^[ACGT]+$/);
    });
  });

  it("Tm values are in plausible range (30-90°C)", () => {
    const result = designPrimers({
      sequence: PRIMER_SAMPLE_TARGETS[0].seq,
      targetTm: 58,
      topN: 10,
    });
    result.forEach((p) => {
      expect(p.forward.tm).toBeGreaterThan(30);
      expect(p.forward.tm).toBeLessThan(90);
      expect(p.reverse.tm).toBeGreaterThan(30);
      expect(p.reverse.tm).toBeLessThan(90);
    });
  });

  it("GC content is within requested range", () => {
    const minGC = 40, maxGC = 60;
    const result = designPrimers({
      sequence: PRIMER_SAMPLE_TARGETS[0].seq,
      minGC, maxGC, topN: 10,
    });
    result.forEach((p) => {
      expect(p.forward.gc).toBeGreaterThanOrEqual(minGC);
      expect(p.forward.gc).toBeLessThanOrEqual(maxGC);
      expect(p.reverse.gc).toBeGreaterThanOrEqual(minGC);
      expect(p.reverse.gc).toBeLessThanOrEqual(maxGC);
    });
  });

  it("amplicon size is within requested product range", () => {
    const minProduct = 200, maxProduct = 500;
    const result = designPrimers({
      sequence: PRIMER_SAMPLE_TARGETS[0].seq,
      minProduct, maxProduct, topN: 10,
    });
    result.forEach((p) => {
      expect(p.ampliconSize).toBeGreaterThanOrEqual(minProduct);
      expect(p.ampliconSize).toBeLessThanOrEqual(maxProduct);
    });
  });

  it("ΔTm between forward and reverse is ≤ 5°C", () => {
    const result = designPrimers({
      sequence: PRIMER_SAMPLE_TARGETS[0].seq,
      topN: 10,
    });
    result.forEach((p) => {
      expect(p.tmDifference).toBeLessThanOrEqual(5);
    });
  });

  it("GC clamp is 1-3 G/C in last 5 nt", () => {
    const result = designPrimers({
      sequence: PRIMER_SAMPLE_TARGETS[0].seq,
      topN: 10,
    });
    result.forEach((p) => {
      expect(p.forward.gcClamp).toBeGreaterThanOrEqual(1);
      expect(p.forward.gcClamp).toBeLessThanOrEqual(3);
      expect(p.reverse.gcClamp).toBeGreaterThanOrEqual(1);
      expect(p.reverse.gcClamp).toBeLessThanOrEqual(3);
    });
  });

  it("scores are sorted descending", () => {
    const result = designPrimers({
      sequence: PRIMER_SAMPLE_TARGETS[0].seq,
      topN: 15,
    });
    for (let i = 1; i < result.length; i++) {
      expect(result[i].score).toBeLessThanOrEqual(result[i - 1].score);
    }
  });

  it("is deterministic (same input → same output)", () => {
    const r1 = designPrimers({ sequence: PRIMER_SAMPLE_TARGETS[0].seq, topN: 5 });
    const r2 = designPrimers({ sequence: PRIMER_SAMPLE_TARGETS[0].seq, topN: 5 });
    expect(r1).toEqual(r2);
  });

  it("works for all sample targets (Brucella, Rabies)", () => {
    PRIMER_SAMPLE_TARGETS.forEach((target) => {
      const result = designPrimers({
        sequence: target.seq,
        topN: 3,
      });
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
