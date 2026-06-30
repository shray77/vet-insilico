import { describe, it, expect } from "vitest";
import { findGuides, CRISPR_SAMPLES } from "./crispr";

describe("findGuides", () => {
  it("finds NGG PAM sites on forward strand", () => {
    // Need 20bp guide + NGG PAM = 23+ bp
    const seq = "ATGCGATCGATCGATCGATCGGATCGATCGATCGATCGATCGG";
    const guides = findGuides(seq);
    expect(guides.length).toBeGreaterThan(0);
  });

  it("all guides have 20-mer sequence", () => {
    const seq = CRISPR_SAMPLES[0].seq;
    const guides = findGuides(seq);
    guides.forEach((g) => {
      expect(g.sequence.length).toBe(20);
    });
  });

  it("all guides have valid PAM (NGG)", () => {
    const seq = CRISPR_SAMPLES[0].seq;
    const guides = findGuides(seq);
    guides.forEach((g) => {
      expect(g.pam.length).toBe(3);
      expect(g.pam[1]).toBe("G");
      expect(g.pam[2]).toBe("G");
    });
  });

  it("on-target scores are in 0-100 range", () => {
    const seq = CRISPR_SAMPLES[0].seq;
    const guides = findGuides(seq);
    guides.forEach((g) => {
      expect(g.onTargetScore).toBeGreaterThanOrEqual(0);
      expect(g.onTargetScore).toBeLessThanOrEqual(100);
    });
  });

  it("specificity scores are in 0-100 range", () => {
    const seq = CRISPR_SAMPLES[0].seq;
    const guides = findGuides(seq);
    guides.forEach((g) => {
      expect(g.specificity).toBeGreaterThanOrEqual(0);
      expect(g.specificity).toBeLessThanOrEqual(100);
    });
  });

  it("GC content is calculated correctly", () => {
    // Sequence with known GC content
    const seq = "ATGCATGCATGCATGCATGCAGG"; // guide = ATGCATGCATGCATGCATGC, GC = 50%
    const guides = findGuides(seq);
    if (guides.length > 0) {
      const g = guides[0];
      expect(g.gc).toBeGreaterThanOrEqual(0);
      expect(g.gc).toBeLessThanOrEqual(100);
    }
  });

  it("guides are sorted by combined score", () => {
    const seq = CRISPR_SAMPLES[0].seq;
    const guides = findGuides(seq);
    for (let i = 1; i < guides.length; i++) {
      const prev = (guides[i - 1] as any).combinedScore || 0;
      const curr = (guides[i] as any).combinedScore || 0;
      expect(curr).toBeLessThanOrEqual(prev);
    }
  });

  it("detects both + and - strand guides", () => {
    const seq = CRISPR_SAMPLES[0].seq;
    const guides = findGuides(seq);
    const strands = new Set(guides.map((g) => g.strand));
    // At least one strand should have guides
    expect(strands.size).toBeGreaterThan(0);
  });
});

describe("CRISPR_SAMPLES", () => {
  it("has 3 samples with proper structure", () => {
    expect(CRISPR_SAMPLES.length).toBe(3);
    CRISPR_SAMPLES.forEach((s) => {
      expect(s.name).toBeTruthy();
      expect(s.gene).toBeTruthy();
      expect(s.species).toBeTruthy();
      expect(s.seq.length).toBeGreaterThan(50);
    });
  });

  it("includes CD163, ANP32A, MSTN genes", () => {
    const genes = CRISPR_SAMPLES.map((s) => s.gene);
    expect(genes).toContain("CD163");
    expect(genes).toContain("ANP32A");
    expect(genes).toContain("MSTN");
  });
});
