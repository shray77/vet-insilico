import { describe, it, expect } from "vitest";
import { calculateDose, getDrugsForSpecies, getDoseRates, DOSE_DATABASE, AVAILABLE_SPECIES_DOSE } from "./dose";

describe("calculateDose", () => {
  const sampleRate = DOSE_DATABASE[0]; // enrofloxacin, pig

  it("calculates dose per administration = doseMgKg × weight", () => {
    const result = calculateDose(sampleRate, 50);
    expect(result.dosePerAdministration).toBeCloseTo(sampleRate.doseMgKg * 50, 1);
  });

  it("calculates total course dose", () => {
    const result = calculateDose(sampleRate, 50);
    expect(result.totalCourseDose).toBeGreaterThan(0);
    expect(result.totalCourseDose).toBeGreaterThanOrEqual(result.dosePerAdministration);
  });

  it("calculates volume from concentration", () => {
    const result = calculateDose(sampleRate, 50, { concentration: 100 });
    expect(result.doseVolume).toBeCloseTo(result.dosePerAdministration / 100, 2);
  });

  it("neonate dose is reduced by 30%", () => {
    const adult = calculateDose(sampleRate, 50, { ageGroup: "adult" });
    const neonate = calculateDose(sampleRate, 50, { ageGroup: "neonate" });
    expect(neonate.dosePerAdministration).toBeLessThan(adult.dosePerAdministration);
    expect(neonate.dosePerAdministration).toBeCloseTo(adult.dosePerAdministration * 0.7, 1);
  });

  it("young dose is reduced by 15%", () => {
    const adult = calculateDose(sampleRate, 50, { ageGroup: "adult" });
    const young = calculateDose(sampleRate, 50, { ageGroup: "young" });
    expect(young.dosePerAdministration).toBeLessThan(adult.dosePerAdministration);
    expect(young.dosePerAdministration).toBeCloseTo(adult.dosePerAdministration * 0.85, 1);
  });

  it("estimates cost when pricePerMl provided", () => {
    const result = calculateDose(sampleRate, 50, { concentration: 100, pricePerMl: 10 });
    expect(result.estimatedCost).toBeGreaterThan(0);
  });

  it("returns notes from dose rate", () => {
    const result = calculateDose(sampleRate, 50);
    expect(result.notes).toBeTruthy();
  });

  it("warns for large animals with IM route", () => {
    const largeAnimal = calculateDose({ ...sampleRate, route: "IM" }, 600);
    expect(largeAnimal.warning).toBeTruthy();
  });
});

describe("getDrugsForSpecies", () => {
  it("returns drugs for pig", () => {
    const drugs = getDrugsForSpecies("Свинья");
    expect(drugs.length).toBeGreaterThan(0);
    expect(drugs).toContain("enrofloxacin");
  });

  it("returns empty array for unknown species", () => {
    const drugs = getDrugsForSpecies("Неизвестный вид");
    expect(drugs).toEqual([]);
  });
});

describe("getDoseRates", () => {
  it("returns dose rates for known drug+species", () => {
    const rates = getDoseRates("enrofloxacin", "Свинья");
    expect(rates.length).toBeGreaterThan(0);
  });

  it("returns empty for unknown combination", () => {
    const rates = getDoseRates("unknown", "Свинья");
    expect(rates).toEqual([]);
  });
});

describe("DOSE_DATABASE", () => {
  it("has at least 30 dose schemes", () => {
    expect(DOSE_DATABASE.length).toBeGreaterThanOrEqual(30);
  });

  it("all doses have positive doseMgKg", () => {
    DOSE_DATABASE.forEach((d) => {
      expect(d.doseMgKg).toBeGreaterThan(0);
    });
  });

  it("all durations are positive", () => {
    DOSE_DATABASE.forEach((d) => {
      expect(d.durationDays).toBeGreaterThan(0);
    });
  });
});

describe("AVAILABLE_SPECIES_DOSE", () => {
  it("includes 6 species", () => {
    expect(AVAILABLE_SPECIES_DOSE.length).toBe(6);
    expect(AVAILABLE_SPECIES_DOSE).toContain("Свинья");
    expect(AVAILABLE_SPECIES_DOSE).toContain("КРС");
    expect(AVAILABLE_SPECIES_DOSE).toContain("Собака");
    expect(AVAILABLE_SPECIES_DOSE).toContain("Кошка");
  });
});
