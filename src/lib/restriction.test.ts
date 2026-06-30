import { describe, it, expect } from "vitest";
import { findCutSites, computeFragments, findCuttingEnzymes, RESTRICTION_ENZYMES, RESTRICTION_SAMPLES } from "./restriction";

describe("findCutSites", () => {
  it("finds EcoRI sites (GAATTC) in sequence", () => {
    const seq = "ATGGAATTCCGTGAATTCAA";
    const ecoRI = RESTRICTION_ENZYMES.find((e) => e.name === "EcoRI")!;
    const sites = findCutSites(seq, [ecoRI]);
    expect(sites.length).toBe(2);
    expect(sites[0].position).toBe(4);
    expect(sites[1].position).toBe(13);
  });

  it("returns empty array when no sites found", () => {
    const seq = "ATGCATGCATGC";
    const ecoRI = RESTRICTION_ENZYMES.find((e) => e.name === "EcoRI")!;
    const sites = findCutSites(seq, [ecoRI]);
    expect(sites.length).toBe(0);
  });

  it("handles IUPAC codes (N = any)", () => {
    // HinfI recognizes GANTC; use GACTC (N=A) to avoid N in sequence
    const seq = "GACTCAGACTC";
    const hinfI = RESTRICTION_ENZYMES.find((e) => e.name === "HinfI")!;
    const sites = findCutSites(seq, [hinfI]);
    expect(sites.length).toBe(2);
  });
});

describe("computeFragments", () => {
  it("computes fragment sizes correctly", () => {
    const seq = "GAATTCGAATTCGAATTC"; // 3 EcoRI sites
    const ecoRI = RESTRICTION_ENZYMES.find((e) => e.name === "EcoRI")!;
    const result = computeFragments(seq, [ecoRI]);
    expect(result.cutSites.length).toBe(3);
    expect(result.perEnzyme.length).toBe(1);
    expect(result.perEnzyme[0].fragments).toBe(4); // n+1 fragments
  });

  it("returns correct sequence length", () => {
    const seq = "ATGCATGCATGCATGC";
    const result = computeFragments(seq, RESTRICTION_ENZYMES);
    expect(result.length).toBe(seq.length);
  });
});

describe("findCuttingEnzymes", () => {
  it("returns only enzymes that actually cut", () => {
    const seq = "GAATTCAAGCTTGGATCC"; // EcoRI, HindIII, BamHI
    const cutting = findCuttingEnzymes(seq);
    const names = cutting.map((c) => c.enzyme.name);
    expect(names).toContain("EcoRI");
    expect(names).toContain("HindIII");
    expect(names).toContain("BamHI");
    expect(cutting.length).toBeGreaterThan(0);
  });

  it("returns empty array when no enzyme cuts", () => {
    const seq = "AAAAAAAAAAAA";
    const cutting = findCuttingEnzymes(seq);
    expect(cutting.length).toBe(0);
  });
});

describe("RESTRICTION_SAMPLES", () => {
  it("all samples have sequences ≥ 50 bp", () => {
    RESTRICTION_SAMPLES.forEach((s) => {
      expect(s.seq.length).toBeGreaterThan(50);
    });
  });
});
