import { describe, it, expect } from "vitest";
import { checkLipinski, dockDrugToTarget, virtualScreening, getTopResults } from "./docking";
import { DRUGS } from "@/data/drugs";
import { PATHOGENS } from "@/data/pathogens";
import type { Drug } from "@/data/drugs";

describe("checkLipinski", () => {
  it("passes for small lipophilic neutral drug", () => {
    const drug: Drug = {
      id: "test-1", name: "Test", inn: "test", form: "tab", pharm_group: "test",
      mw: 250, logp: 2.0, hbd: 2, hba: 4, rotatable_bonds: 3,
      charge: 0, hydrophobicity: 0.5, radius: 5,
      activity: "antibacterial", mechanism: "test", ru_registered: true,
    };
    const r = checkLipinski(drug);
    expect(r.pass).toBe(true);
    expect(r.violations).toBe(0);
  });

  it("fails when MW exceeds 600", () => {
    const drug: Drug = {
      id: "test-2", name: "Big", inn: "big", form: "tab", pharm_group: "test",
      mw: 750, logp: 2.0, hbd: 2, hba: 4, rotatable_bonds: 3,
      charge: 0, hydrophobicity: 0.5, radius: 5,
      activity: "antibacterial", ru_registered: true,
    };
    const r = checkLipinski(drug);
    expect(r.violations).toBeGreaterThan(0);
  });

  it("fails when LogP > 5", () => {
    const drug: Drug = {
      id: "test-3", name: "Lipo", inn: "lipo", form: "tab", pharm_group: "test",
      mw: 300, logp: 7.5, hbd: 1, hba: 2, rotatable_bonds: 3,
      charge: 0, hydrophobicity: 0.9, radius: 5,
      activity: "antiparasitic", ru_registered: false,
    };
    const r = checkLipinski(drug);
    expect(r.violations).toBeGreaterThan(0);
  });

  it("allows 1 violation (relaxed Lipinski)", () => {
    const drug: Drug = {
      id: "test-4", name: "Borderline", inn: "bord", form: "tab", pharm_group: "test",
      mw: 650, logp: 4.0, hbd: 3, hba: 6, rotatable_bonds: 5,
      charge: 0, hydrophobicity: 0.5, radius: 5,
      activity: "antibacterial", ru_registered: true,
    };
    const r = checkLipinski(drug);
    // MW>600 is 1 violation, others pass → 1 violation total → still passes
    expect(r.pass).toBe(true);
    expect(r.violations).toBe(1);
  });
});

describe("dockDrugToTarget", () => {
  it("returns results for all pockets of a target", () => {
    const target = PATHOGENS[0].targets[0];
    const drug = DRUGS[0];
    const results = dockDrugToTarget(drug, target);
    expect(results.length).toBe(target.pockets.length);
    results.forEach((r) => {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
      expect(r.shapeScore).toBeGreaterThanOrEqual(0);
      expect(r.shapeScore).toBeLessThanOrEqual(100);
      expect(r.electrostaticScore).toBeGreaterThanOrEqual(0);
      expect(r.electrostaticScore).toBeLessThanOrEqual(100);
      expect(r.hydrophobicScore).toBeGreaterThanOrEqual(0);
      expect(r.hydrophobicScore).toBeLessThanOrEqual(100);
      expect(r.bindingAffinity).toBeLessThan(0); // negative ΔG
    });
  });

  it("penalizes same-charge repulsion", () => {
    // Find a target/pocket with non-zero charge
    let testTarget = PATHOGENS[0].targets[0];
    let testPocket = testTarget.pockets.find((p) => p.charge !== 0);
    if (!testPocket) {
      for (const p of PATHOGENS) {
        for (const t of p.targets) {
          const pk = t.pockets.find((pp) => pp.charge !== 0);
          if (pk) { testTarget = t; testPocket = pk; break; }
        }
        if (testPocket) break;
      }
    }
    if (!testPocket) return; // skip if no charged pocket
    const pocket = testPocket;

    const positiveDrug: Drug = {
      id: "pos", name: "Pos", inn: "pos", form: "tab", pharm_group: "test",
      mw: 300, logp: 2.0, hbd: 2, hba: 4, rotatable_bonds: 3,
      charge: 1, hydrophobicity: 0.5, radius: pocket.radius * 0.75,
      activity: "antibacterial", ru_registered: true,
    };
    const neutralDrug: Drug = { ...positiveDrug, charge: 0, id: "neu" };
    const oppositeDrug: Drug = { ...positiveDrug, charge: -pocket.charge, id: "opp" };
    const sameChargeDrug: Drug = { ...positiveDrug, charge: pocket.charge, id: "same" };

    const rOpposite = dockDrugToTarget(oppositeDrug, testTarget).find((r) => r.target.id === testTarget.id);
    const rNeutral = dockDrugToTarget(neutralDrug, testTarget).find((r) => r.target.id === testTarget.id);
    const rSame = dockDrugToTarget(sameChargeDrug, testTarget).find((r) => r.target.id === testTarget.id);

    if (!rOpposite || !rNeutral || !rSame) return;

    // Opposite charge should be best (100), neutral medium (70), same charge worst
    expect(rOpposite.electrostaticScore).toBeGreaterThanOrEqual(rNeutral.electrostaticScore);
    expect(rNeutral.electrostaticScore).toBeGreaterThan(rSame.electrostaticScore);
  });
});

describe("virtualScreening", () => {
  it("screens all drugs against all targets of a pathogen", () => {
    const pathogen = PATHOGENS[0];
    const totalPockets = pathogen.targets.reduce((s, t) => s + t.pockets.length, 0);
    const results = virtualScreening(DRUGS.slice(0, 10), pathogen.targets);
    expect(results.length).toBe(10 * totalPockets);
  });

  it("is deterministic (same input → same output)", () => {
    const pathogen = PATHOGENS[0];
    const drugs = DRUGS.slice(0, 20);
    const r1 = virtualScreening(drugs, pathogen.targets);
    const r2 = virtualScreening(drugs, pathogen.targets);
    expect(r1).toEqual(r2);
  });
});

describe("getTopResults", () => {
  it("filters by Lipinski when requested", () => {
    const pathogen = PATHOGENS[0];
    const all = virtualScreening(DRUGS.slice(0, 30), pathogen.targets);
    const filtered = getTopResults(all, 100, true);
    filtered.forEach((r) => {
      // Either passes Lipinski or has only 1 violation (relaxed)
      expect(r.lipinskiPass || r.lipinskiViolations <= 1).toBe(true);
    });
  });

  it("respects topN limit", () => {
    const pathogen = PATHOGENS[0];
    const all = virtualScreening(DRUGS, pathogen.targets);
    const top5 = getTopResults(all, 5, false);
    expect(top5.length).toBeLessThanOrEqual(5);
  });

  it("sorts by score descending", () => {
    const pathogen = PATHOGENS[0];
    const all = virtualScreening(DRUGS, pathogen.targets);
    const top = getTopResults(all, 50, false);
    for (let i = 1; i < top.length; i++) {
      expect(top[i].score).toBeLessThanOrEqual(top[i - 1].score);
    }
  });
});

describe("drug database invariants", () => {
  it("all drugs have valid hydrophobicity in [0, 1]", () => {
    DRUGS.forEach((d) => {
      expect(d.hydrophobicity).toBeGreaterThanOrEqual(0);
      expect(d.hydrophobicity).toBeLessThanOrEqual(1);
    });
  });

  it("all drugs have positive MW", () => {
    DRUGS.forEach((d) => {
      expect(d.mw).toBeGreaterThan(0);
    });
  });

  it("all drugs have charge in [-3, +3]", () => {
    DRUGS.forEach((d) => {
      expect(d.charge).toBeGreaterThanOrEqual(-3);
      expect(d.charge).toBeLessThanOrEqual(3);
    });
  });

  it("all drugs have unique IDs", () => {
    const ids = DRUGS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all drugs have known activity type", () => {
    const validActivities = ["antiviral", "antibacterial", "antiparasitic", "antiinflammatory", "unknown"];
    DRUGS.forEach((d) => {
      expect(validActivities).toContain(d.activity);
    });
  });
});

describe("pathogen database invariants", () => {
  it("all pathogens have at least 1 target", () => {
    PATHOGENS.forEach((p) => {
      expect(p.targets.length).toBeGreaterThan(0);
    });
  });

  it("all targets have at least 1 binding pocket", () => {
    PATHOGENS.forEach((p) => {
      p.targets.forEach((t) => {
        expect(t.pockets.length).toBeGreaterThan(0);
      });
    });
  });

  it("all pockets have valid charge in [-1, +1]", () => {
    PATHOGENS.forEach((p) => {
      p.targets.forEach((t) => {
        t.pockets.forEach((pk) => {
          expect(pk.charge).toBeGreaterThanOrEqual(-1);
          expect(pk.charge).toBeLessThanOrEqual(1);
        });
      });
    });
  });
});
