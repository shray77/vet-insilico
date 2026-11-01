import { describe, it, expect } from "vitest";
import { predictADMET, type AdmetResult } from "./admet";
import { DRUGS, type Drug } from "@/data/drugs";

// Test drug — drug-like molecule that passes Lipinski
const goodDrug: Drug = {
  name: "Test Drug A",
  inn: "testdrugA",
  pharm_group: "Test",
  mw: 300,
  logp: 2.0,
  hbd: 1,
  hba: 4,
  charge: 0,
  ru_registered: true,
  smiles: "CC(=O)OC1=CC=CC=C1C(=O)O",
} as Drug;

// Test drug — large lipophilic molecule that fails Lipinski
const badDrug: Drug = {
  name: "Test Drug B",
  inn: "testdrugB",
  pharm_group: "Test",
  mw: 700,
  logp: 6.0,
  hbd: 4,
  hba: 2,
  charge: 0,
  ru_registered: false,
  smiles: "",
} as Drug;

describe("predictADMET", () => {
  it("returns all ADMET parameters", () => {
    const result = predictADMET(goodDrug);
    expect(result).toHaveProperty("oralBioavailability");
    expect(result).toHaveProperty("bbbPermeability");
    expect(result).toHaveProperty("caco2");
    expect(result).toHaveProperty("ppb");
    expect(result).toHaveProperty("vd");
    expect(result).toHaveProperty("logS");
    expect(result).toHaveProperty("hergRisk");
    expect(result).toHaveProperty("amesRisk");
    expect(result).toHaveProperty("drugLikeness");
    expect(result).toHaveProperty("alerts");
  });

  it("predicts higher bioavailability for drug-like molecule", () => {
    const good = predictADMET(goodDrug);
    const bad = predictADMET(badDrug);
    expect(good.oralBioavailability).toBeGreaterThan(bad.oralBioavailability);
  });

  it("predicts higher drug-likeness for small molecule", () => {
    const good = predictADMET(goodDrug);
    const bad = predictADMET(badDrug);
    expect(good.drugLikeness).toBeGreaterThan(bad.drugLikeness);
  });

  it("generates alerts for problematic molecule", () => {
    const bad = predictADMET(badDrug);
    expect(bad.alerts.length).toBeGreaterThan(0);
    // Should mention MW or LogP violation
    const alertText = bad.alerts.join(" ").toLowerCase();
    expect(
      alertText.includes("молекулярн") ||
      alertText.includes("mw") ||
      alertText.includes("logp") ||
      alertText.includes("липофил")
    ).toBe(true);
  });

  it("returns levels as low/moderate/high", () => {
    const result = predictADMET(goodDrug);
    const validLevels = ["low", "moderate", "high"];
    expect(validLevels).toContain(result.oralBioavailabilityLevel);
    expect(validLevels).toContain(result.bbbPermeabilityLevel);
    expect(validLevels).toContain(result.hergRiskLevel);
  });

  it("logS follows ESOL (Delaney 2004): 0.16 − 0.63·cLogP − 0.0062·MW + 0.066·RB − 0.74·AP", () => {
    // Ибупрофен из базы: MW 206.3, cLogP 3.1, RB 3, AP 0.4 (6 аром./15 тяжёлых, RDKit)
    const ibu = DRUGS.find((d) => d.inn.toLowerCase().includes("ibuprof"))!;
    const expected = 0.16 - 0.63 * ibu.logp - 0.0062 * ibu.mw + 0.066 * ibu.rotatable_bonds - 0.74 * 0.4;
    const result = predictADMET(ibu);
    expect(result.logS).toBeCloseTo(Number(expected.toFixed(2)), 2);
    // SW-11: старый «GSE с MW вместо Tm» занижал растворимость 3–10×
    expect(result.logS).toBeGreaterThan(-4);
  });

  it("logS for drug without SMILES/map entry uses AP=0 and reports an honest alert", () => {
    const result = predictADMET(badDrug);
    expect(result.alerts.some((a) => a.includes("AP"))).toBe(true);
  });
});
