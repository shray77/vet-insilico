import { describe, it, expect } from "vitest";
import { simulatePK, computePD, DRUG_PK_PROFILES } from "./pkpd";

describe("simulatePK", () => {
  it("produces concentration-time array", () => {
    const profile = DRUG_PK_PROFILES[0];
    const result = simulatePK({
      ...profile.params,
      dose: 5,
      nDoses: 3,
    });
    expect(result.times.length).toBeGreaterThan(0);
    expect(result.concentrations.length).toBe(result.times.length);
  });

  it("Cmax is positive for any valid dose", () => {
    const profile = DRUG_PK_PROFILES[0];
    const result = simulatePK({
      ...profile.params,
      dose: 10,
      interval: 24,
      nDoses: 1,
    });
    expect(result.cmax).toBeGreaterThan(0);
  });

  it("higher dose → higher Cmax", () => {
    const profile = DRUG_PK_PROFILES[0];
    const low = simulatePK({ ...profile.params, dose: 5, interval: 24, nDoses: 1 });
    const high = simulatePK({ ...profile.params, dose: 20, interval: 24, nDoses: 1 });
    expect(high.cmax).toBeGreaterThan(low.cmax);
  });

  it("half-life = ln(2)/ke", () => {
    const profile = DRUG_PK_PROFILES[0];
    const result = simulatePK({ ...profile.params, dose: 5, interval: 24, nDoses: 1 });
    const expectedHalfLife = Math.log(2) / profile.params.ke;
    expect(result.halfLife).toBeCloseTo(Number(expectedHalfLife.toFixed(2)), 1);
  });

  it("clearance = ke × Vd", () => {
    const profile = DRUG_PK_PROFILES[0];
    const result = simulatePK({ ...profile.params, dose: 5, interval: 24, nDoses: 1 });
    const expectedCL = profile.params.ke * profile.params.Vd;
    expect(result.clearance).toBeCloseTo(Number(expectedCL.toFixed(3)), 2);
  });

  it("AUC is positive", () => {
    const profile = DRUG_PK_PROFILES[0];
    const result = simulatePK({ ...profile.params, dose: 10, interval: 24, nDoses: 3 });
    expect(result.auc).toBeGreaterThan(0);
  });
});

describe("computePD", () => {
  it("generates Emax curve with 51 points", () => {
    const pk = simulatePK({ ...DRUG_PK_PROFILES[0].params, dose: 5, interval: 24, nDoses: 1 });
    const pd = computePD(pk, {
      emax: 100, ec50: 1, hill: 1.5, mic: 0.5,
      targetType: "auc_mic", targetValue: 125,
    });
    expect(pd.curve.length).toBe(51);
    expect(pd.curve[0].effect).toBe(0);
    expect(pd.curve[50].effect).toBeGreaterThan(95);
  });

  it("AUC/MIC index is calculated correctly", () => {
    const pk = simulatePK({ ...DRUG_PK_PROFILES[0].params, dose: 10, interval: 24, nDoses: 3 });
    const pd = computePD(pk, {
      emax: 100, ec50: 1, hill: 1.5, mic: 1,
      targetType: "auc_mic", targetValue: 125,
    });
    expect(pd.pdIndex).toBeCloseTo(pk.auc / 1, 1);
  });

  it("T>MIC calculates percentage of time above MIC", () => {
    const pk = simulatePK({ ...DRUG_PK_PROFILES[0].params, dose: 5, interval: 24, nDoses: 1 });
    const pd = computePD(pk, {
      emax: 100, ec50: 1, hill: 1.5, mic: 0.01,
      targetType: "t_above_mic", targetValue: 40,
    });
    expect(pd.timeAboveMIC).toBeGreaterThanOrEqual(0);
    expect(pd.timeAboveMIC).toBeLessThanOrEqual(100);
  });

  it("provides recommendation text", () => {
    const pk = simulatePK({ ...DRUG_PK_PROFILES[0].params, dose: 10, interval: 24, nDoses: 3 });
    const pd = computePD(pk, {
      emax: 100, ec50: 1, hill: 1.5, mic: 0.5,
      targetType: "auc_mic", targetValue: 125,
    });
    expect(pd.recommendation).toBeTruthy();
    expect(pd.recommendation.length).toBeGreaterThan(10);
  });
});

describe("DRUG_PK_PROFILES", () => {
  it("has 6 drug profiles", () => {
    expect(DRUG_PK_PROFILES.length).toBe(6);
  });

  it("all profiles have valid PK parameters", () => {
    DRUG_PK_PROFILES.forEach((p) => {
      expect(p.params.Vd).toBeGreaterThan(0);
      expect(p.params.ke).toBeGreaterThan(0);
      expect(p.params.duration).toBeGreaterThan(0);
    });
  });
});
