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

  it("ceftiofur cattle dose = 2.2 mg/kg (label, SW-11: было 1.1 — занижение ×2)", () => {
    const rates = getDoseRates("ceftiofur", "КРС");
    expect(rates.length).toBeGreaterThan(0);
    expect(rates[0].doseMgKg).toBe(2.2);
    expect(calculateDose(rates[0], 100).dosePerAdministration).toBeCloseTo(220, 1);
  });

  it("clindamycin dog dose = 5.5 mg/kg q12h (label, SW-11: было 11 q12h — суточная ×2)", () => {
    const rates = getDoseRates("clindamycin", "Собака");
    expect(rates.length).toBeGreaterThan(0);
    expect(rates[0].doseMgKg).toBe(5.5);
    expect(rates[0].intervalHours).toBe(12);
    // суточная доза = 11 мг/кг/сут — лейбл (Vet Dermatol 2011;22:429-35)
    expect(calculateDose(rates[0], 10).totalDailyDose).toBeCloseTo(110, 1);
  });

  it("penicillin G entries are marked IU/kg and skip mg/ml volume math (SW-11)", () => {
    for (const species of ["КРС", "Лошадь"]) {
      const rate = getDoseRates("penicillin G", species)[0];
      expect(rate.doseUnit).toBe("IU/kg");
      const res = calculateDose(rate, 500, { concentration: 300 });
      expect(res.doseUnit).toBe("IU/kg");
      expect(res.doseVolume).toBe(0);
      expect(res.warning).toBeTruthy();
    }
  });

  it("mg/kg entries keep volume math", () => {
    const enro = getDoseRates("enrofloxacin", "Свинья")[0];
    expect(enro.doseUnit).toBeUndefined();
    const res = calculateDose(enro, 50, { concentration: 100 });
    expect(res.doseUnit).toBe("mg/kg");
    expect(res.doseVolume).toBeCloseTo(1.25, 2);
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
