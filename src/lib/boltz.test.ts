import { describe, it, expect } from "vitest";
import {
  boltzIndex,
  formatIc50,
  pairKey,
  referenceDelta,
  strengthOf,
  type BoltzData,
  type BoltzPair,
} from "./boltz";

const okPair = (over: Partial<BoltzPair>): BoltzPair => ({
  drug_id: "drug-109-amantadine",
  inn: "Amantadine",
  target_id: "hpai-m2",
  target_name: "Ионный канал M2",
  pdb_id: "2RLF",
  chains: ["A"],
  kind: "validated",
  reference: { ic50_um: 16, note: "note" },
  status: "ok",
  affinity_pred_value: 1.2, // log10 µM -> IC50 ≈ 15.8 µM
  affinity_probability_binary: 0.9,
  ic50_um_est: 15.85,
  delta_g_kcal_mol: 6.56,
  ...over,
});

const fakeData = (pairs: BoltzPair[]): BoltzData => ({
  model: "boltz-2",
  generated: "2026-10-24T03:30:00Z",
  params: {},
  units: {},
  pairs,
});

describe("boltzIndex", () => {
  it("indexes only ok pairs with numeric predictions", () => {
    const idx = boltzIndex(
      fakeData([
        okPair({}),
        okPair({ status: "error", error: "oom", affinity_pred_value: undefined }),
        okPair({ drug_id: "x", target_id: "y", affinity_pred_value: undefined }),
      ]),
    );
    expect(idx.size).toBe(1);
    expect(idx.has(pairKey("drug-109-amantadine", "hpai-m2"))).toBe(true);
  });

  it("returns empty map for null data (file missing)", () => {
    expect(boltzIndex(null).size).toBe(0);
  });
});

describe("formatIc50", () => {
  it("formats nM / µM / mM ranges", () => {
    expect(formatIc50(0.002)).toBe("2 нМ");
    expect(formatIc50(0.4898)).toBe("490 нМ");
    expect(formatIc50(15.87)).toBe("15.9 мкМ");
    expect(formatIc50(47.2)).toBe("47 мкМ");
    expect(formatIc50(5200)).toBe("5 мМ");
  });
});

describe("strengthOf", () => {
  it("buckets by IC50 thresholds", () => {
    expect(strengthOf(0.005)).toBe("strong");
    expect(strengthOf(0.5)).toBe("good");
    expect(strengthOf(20)).toBe("moderate");
    expect(strengthOf(300)).toBe("weak");
  });
});

describe("referenceDelta", () => {
  it("computes log10 difference vs experiment", () => {
    // pred log10(15.85 µM)=1.2 vs ref log10(16 µM)=1.204 -> ~0
    const d = referenceDelta(okPair({}));
    expect(d).toBeCloseTo(-0.0, 1);
  });

  it("null when no reference", () => {
    expect(referenceDelta(okPair({ reference: null }))).toBeNull();
  });
});
