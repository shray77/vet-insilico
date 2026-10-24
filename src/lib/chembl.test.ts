import { describe, it, expect } from "vitest";
import {
  chemblIndex,
  descriptorDelta,
  findChembl,
  formatDelta,
  mechanismLines,
  phaseLabelRu,
  phaseOf,
  approvalYear,
  type ChemblData,
  type ChemblDrug,
} from "./chembl";

const drug = (over: Partial<ChemblDrug>): ChemblDrug => ({
  inn: "Aspirin",
  chembl_id: "CHEMBL25",
  pref_name: "ASPIRIN",
  molecule_type: "Small molecule",
  max_phase: "4.0",
  first_approval: "1950",
  withdrawn_flag: false,
  therapeutic_flag: true,
  oral: true,
  parenteral: false,
  properties: {
    full_mwt: 180.16,
    alogp: 1.31,
    hba: 4,
    hbd: 1,
    psa: 63.6,
    rtb: 3,
    aromatic_rings: 1,
    heavy_atoms: 13,
    num_ro5_violations: 0,
  },
  mechanisms: [
    { action_type: "INHIBITOR", target_chembl_id: "CHEMBL230", target_name: "Cyclooxygenase" },
    { action_type: "INHIBITOR", target_chembl_id: "CHEMBL230", target_name: "Cyclooxygenase" },
    { action_type: null, target_chembl_id: null, target_name: null },
  ],
  ...over,
});

const data = (drugs: ChemblDrug[]): ChemblData => ({
  source: "ChEMBL web API",
  version: "ChEMBL_37",
  generated: "2026-10-24T20:00:00Z",
  note: "",
  drugs,
});

describe("chemblIndex / findChembl", () => {
  it("matches INN case-insensitively via findChembl", () => {
    const idx = chemblIndex(data([drug({})]));
    expect(findChembl(idx, "aspirin")?.chembl_id).toBe("CHEMBL25");
    expect(findChembl(idx, "  ASPIRIN ")?.chembl_id).toBe("CHEMBL25");
    expect(findChembl(idx, "nope")).toBeUndefined();
  });

  it("empty map for null data", () => {
    expect(chemblIndex(null).size).toBe(0);
    expect(findChembl(chemblIndex(null), "aspirin")).toBeUndefined();
  });
});

describe("phase helpers", () => {
  it("parses string phases", () => {
    expect(phaseOf(drug({}))).toBe(4);
    expect(phaseOf(drug({ max_phase: null }))).toBeNull();
    expect(phaseLabelRu(drug({}))).toBe("одобрен (фаза IV)");
    expect(phaseLabelRu(drug({ max_phase: "2.0" }))).toBe("фаза II");
  });

  it("parses approval year", () => {
    expect(approvalYear(drug({}))).toBe(1950);
    expect(approvalYear(drug({ first_approval: null }))).toBeNull();
  });
});

describe("descriptorDelta / formatDelta", () => {
  it("computes ours-minus-theirs", () => {
    expect(descriptorDelta(360.5, 359.4)).toBe(1.1);
    expect(descriptorDelta(undefined, 359.4)).toBeNull();
    expect(descriptorDelta(3, null)).toBeNull();
  });

  it("formats signed deltas with minus sign", () => {
    expect(formatDelta(1.2)).toBe("+1.2");
    expect(formatDelta(-0.35)).toBe("−0.35");
    expect(formatDelta(0.001)).toBe("0");
    expect(formatDelta(null)).toBe("—");
  });
});

describe("mechanismLines", () => {
  it("dedupes, skips empty rows, translates actions", () => {
    const lines = mechanismLines(drug({}));
    expect(lines).toEqual(["ингибитор · Cyclooxygenase"]);
  });
});
