import { describe, it, expect } from "vitest";
import { needlemanWunsch, smithWaterman, ALIGNMENT_SAMPLES } from "./alignment";

describe("needlemanWunsch (global alignment)", () => {
  it("identical sequences → 100% identity, no gaps", () => {
    const r = needlemanWunsch("MKTAYIAK", "MKTAYIAK", "protein");
    expect(r.identity).toBe(100);
    expect(r.gaps).toBe(0);
    expect(r.length).toBe(8);
  });

  it("single mismatch → identity < 100", () => {
    const r = needlemanWunsch("MKTAYIAK", "MKTAFIAK", "protein");
    expect(r.identity).toBeLessThan(100);
    expect(r.identity).toBeGreaterThan(80);
  });

  it("completely different sequences → low identity", () => {
    const r = needlemanWunsch("AAAA", "WWWW", "protein");
    expect(r.identity).toBe(0);
  });

  it("DNA scoring uses match/mismatch", () => {
    const r = needlemanWunsch("ACGTACGT", "ACGTACGT", "dna");
    expect(r.identity).toBe(100);
    expect(r.score).toBeGreaterThan(0);
  });

  it("introduces gaps for insertions", () => {
    const r = needlemanWunsch("ACGT", "ACAGT", "dna");
    expect(r.gaps).toBeGreaterThan(0);
    expect(r.length).toBe(5);
  });

  it("aligned sequences have equal length", () => {
    const r = needlemanWunsch("MKTAYIAKQRQ", "MKTAFIAKQRQ", "protein");
    expect(r.alignedA.length).toBe(r.alignedB.length);
    expect(r.alignedA.length).toBe(r.matchLine.length);
  });
});

describe("smithWaterman (local alignment)", () => {
  it("finds common subsequence in different sequences", () => {
    const r = smithWaterman("AAAAAMKTAYIAKAAAAA", "TTTMKTAYIAKTTTTT", "protein");
    expect(r.length).toBeGreaterThan(3); // at least some match
    expect(r.score).toBeGreaterThan(0);
  });

  it("returns shorter alignment than global for divergent sequences", () => {
    const seqA = "MKTAYIAKQRQISFVK";
    const seqB = "SHFSRQLEERLGLIEV";
    const global = needlemanWunsch(seqA, seqB, "protein");
    const local = smithWaterman(seqA, seqB, "protein");
    expect(local.length).toBeLessThanOrEqual(global.length);
  });

  it("handles empty local match", () => {
    const r = smithWaterman("AAA", "WWW", "protein");
    expect(r.score).toBe(0);
    expect(r.length).toBe(0);
  });
});

describe("ALIGNMENT_SAMPLES", () => {
  it("all samples have valid sequences", () => {
    ALIGNMENT_SAMPLES.forEach((s) => {
      expect(s.seqs.a.length).toBeGreaterThan(10);
      expect(s.seqs.b.length).toBeGreaterThan(10);
      expect(["protein", "dna"]).toContain(s.seqs.type);
    });
  });
});
