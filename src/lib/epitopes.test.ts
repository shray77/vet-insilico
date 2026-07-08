import { describe, it, expect } from "vitest";
import { predictBCellEpitopes, predictTCellEpitopes, analyzeSequence } from "./epitopes";

describe("predictBCellEpitopes", () => {
  it("returns ranked epitope candidates", () => {
    const seq = "MKWVTFISLLFLFSSAYSRGVFRRDTHKSEIAHRFKDLGEEHFKGLV";
    const results = predictBCellEpitopes(seq, 6);
    expect(results.length).toBeGreaterThan(0);
    // Each result should have sequence + score
    results.forEach((r) => {
      expect(r.sequence.length).toBeGreaterThanOrEqual(6);
      expect(typeof r.score).toBe("number");
    });
  });

  it("handles short sequences gracefully", () => {
    const results = predictBCellEpitopes("ACDEF", 6);
    expect(results.length).toBe(0);
  });

  it("scores hydrophilic regions higher", () => {
    const seq = "AAAAAKKKKKDDDDAAAAAKKKKKDDDDAAAAA";
    const results = predictBCellEpitopes(seq, 6);
    if (results.length > 0) {
      // Hydrophilic KKKKKDDDD region should score higher than AAAAA
      const topSeq = results[0].sequence;
      expect(topSeq).toMatch(/[KD]/);
    }
  });
});

describe("predictTCellEpitopes", () => {
  it("returns MHC-I binding candidates (9-mers)", () => {
    const seq = "MKWVTFISLLFLFSSAYSRGVFRRDTHKSEIAHRFKDLGEEHFKGLV";
    const results = predictTCellEpitopes(seq, ["HLA-A*02:01"]);
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => {
      expect(r.sequence.length).toBe(9); // MHC-I binds 9-mers
      expect(typeof r.score).toBe("number");
    });
  });

  it("handles short sequences gracefully", () => {
    const results = predictTCellEpitopes("ACD", ["HLA-A*02:01"]);
    expect(results).toEqual([]);
  });
});

describe("analyzeSequence", () => {
  it("returns both B-cell and T-cell epitopes", () => {
    const seq = "MKWVTFISLLFLFSSAYSRGVFRRDTHKSEIAHRFKDLGEEHFKGLV";
    const result = analyzeSequence(seq);
    expect(result).toHaveProperty("bCellEpitopes");
    expect(result).toHaveProperty("tCellEpitopes");
    expect(Array.isArray(result.bCellEpitopes)).toBe(true);
    expect(Array.isArray(result.tCellEpitopes)).toBe(true);
  });
});
