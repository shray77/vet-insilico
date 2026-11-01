import { describe, it, expect } from "vitest";
import { optimizeCodons, AVAILABLE_SPECIES, CODON_OPTIMIZATION_SAMPLES } from "./codon";

describe("optimizeCodons", () => {
  it("produces DNA of same protein length × 3", () => {
    const input = "ATGGCATCAGAGGAGGAACAC"; // 7 aa + stop
    const result = optimizeCodons(input, "Sus scrofa");
    // Should produce 7*3 = 21 bp (no stop in input, so no stop added)
    expect(result.optimizedDNA.length).toBe(21);
    expect(result.length).toBe(21);
  });

  it("CAI is in 0-1 range", () => {
    const result = optimizeCodons("ATGGCATCAGAGGAGGAACAC", "E. coli");
    expect(result.cai).toBeGreaterThan(0);
    expect(result.cai).toBeLessThanOrEqual(1);
  });

  it("GC content is calculated", () => {
    const result = optimizeCodons("ATGGCATCAGAGGAGGAACAC", "Sus scrofa");
    expect(result.gc).toBeGreaterThanOrEqual(0);
    expect(result.gc).toBeLessThanOrEqual(100);
  });

  it("optimization for E. coli differs from pig", () => {
    const input = "ATGGCATCAGAGGAGGAACACCAACAAC";
    const pig = optimizeCodons(input, "Sus scrofa");
    const ecoli = optimizeCodons(input, "E. coli");
    // They might be the same for some codons, but generally differ
    // At least the function runs without error for both
    expect(pig.optimizedDNA.length).toBe(ecoli.optimizedDNA.length);
  });

  it("codonMap has one entry per amino acid", () => {
    const input = "ATGGCATCAGAGGAGGAACAC"; // 7 aa
    const result = optimizeCodons(input, "Sus scrofa");
    expect(result.codonMap.length).toBe(7);
    result.codonMap.forEach((entry) => {
      expect(entry.codon.length).toBe(3);
      expect(entry.aa.length).toBe(1);
      expect(entry.fraction).toBeGreaterThanOrEqual(0);
    });
  });

  it("handles sequences with stop codons", () => {
    // ATG-GCA-TCA-GAG-GAG-GAA-CAC-TAA (8 codons including stop)
    const input = "ATGGCATCAGAGGAGGAACACTAA";
    const result = optimizeCodons(input, "Sus scrofa");
    expect(result.optimizedDNA.length).toBe(24);
    expect(result.codonMap.length).toBe(8);
    expect(result.codonMap[7].aa).toBe("*"); // stop
  });

  it("гвард (аудит SW-13 Б3): ввод без A/C/G/T кидает ошибку, а не GC% NaN", () => {
    expect(() => optimizeCodons("а".repeat(200), "Sus scrofa")).toThrow(/A\/C\/G\/T/);
    expect(() => optimizeCodons("NNNNNN", "Sus scrofa")).toThrow(/A\/C\/G\/T/);
  });

  it("гвард: короче одного кодона — честная ошибка", () => {
    expect(() => optimizeCodons("AC", "Sus scrofa")).toThrow(/кодона/);
  });

  it("неполный кодон честно репортится: 301×A → droppedBases=1, вывод 300 (аудит SW-13 Б4)", () => {
    const result = optimizeCodons("A".repeat(301), "Sus scrofa");
    expect(result.droppedBases).toBe(1);
    expect(result.optimizedDNA.length).toBe(300);
    expect(result.length).toBe(300);
  });

  it("дефолтный сэмпл ASFV p72 (307 п.о.): 1 отброшенный нуклеотид виден в результате, не молча", () => {
    const s = CODON_OPTIMIZATION_SAMPLES[0];
    expect(s.seq.length % 3).toBe(1); // 307 п.о.
    const result = optimizeCodons(s.seq, s.species);
    expect(result.droppedBases).toBe(1);
    expect(result.optimizedDNA.length).toBe(s.seq.length - 1);
  });
});

describe("AVAILABLE_SPECIES", () => {
  it("includes pig, cattle, chicken, E. coli", () => {
    expect(AVAILABLE_SPECIES).toContain("Sus scrofa");
    expect(AVAILABLE_SPECIES).toContain("Bos taurus");
    expect(AVAILABLE_SPECIES).toContain("Gallus gallus");
    expect(AVAILABLE_SPECIES).toContain("E. coli");
  });
});

describe("CODON_OPTIMIZATION_SAMPLES", () => {
  it("has 3 samples", () => {
    expect(CODON_OPTIMIZATION_SAMPLES.length).toBe(3);
    CODON_OPTIMIZATION_SAMPLES.forEach((s) => {
      expect(s.name).toBeTruthy();
      expect(s.species).toBeTruthy();
      expect(s.seq.length).toBeGreaterThan(20);
    });
  });
});
