/**
 * PK/PD Simulator — pharmacokinetic / pharmacodynamic simulator.
 *
 * Models:
 *   - One-compartment PK with first-order absorption + IV bolus
 *   - Multiple dosing (steady state)
 *   - MIC-based pharmacodynamic indices: AUC/MIC, Cmax/MIC, T>MIC
 *   - Emax dose-response curve
 *
 * All in browser, deterministic ODE via Euler method.
 *
 * References:
 *   - Rowland & Tozer "Clinical Pharmacokinetics and Pharmacodynamics" (2010)
 *   - Mouton & Ambrose "PK/PD indices for antibiotics" (2007)
 */

export interface PKParams {
  /** Dose (mg/kg). */
  dose: number;
  /** Bioavailability (0-1). */
  F: number;
  /** Volume of distribution (L/kg). */
  Vd: number;
  /** Absorption rate constant (1/h). */
  ka: number;
  /** Elimination rate constant (1/h). */
  ke: number;
  /** Dosing interval (h). */
  interval: number;
  /** Number of doses. */
  nDoses: number;
  /** Route: IV bolus or oral/extravascular. */
  route: "IV" | "oral";
  /** Simulation duration (h). */
  duration: number;
  /** Time step (h). */
  dt: number;
}

export interface PKResult {
  times: number[];
  concentrations: number[];
  /** Peak concentration (mg/L). */
  cmax: number;
  /** Trough concentration at steady state (mg/L). */
  cmin: number;
  /** Time to Cmax (h). */
  tmax: number;
  /** Area under curve (mg·h/L). */
  auc: number;
  /** Half-life (h). */
  halfLife: number;
  /** Clearance (L/h/kg). */
  clearance: number;
  /** Steady-state average concentration (mg/L). */
  cssAvg: number;
  /** Peak at steady state (mg/L). */
  cssMax: number;
  /** Trough at steady state (mg/L). */
  cssMin: number;
}

/**
 * Simulate concentration-time profile for multiple-dose regimen.
 * One-compartment model with first-order absorption (oral) or IV bolus.
 */
export function simulatePK(params: PKParams): PKResult {
  const { dose, F, Vd, ka, ke, interval, nDoses, route, duration, dt } = params;

  const nSteps = Math.floor(duration / dt);
  const times: number[] = new Array(nSteps + 1);
  const concentrations: number[] = new Array(nSteps + 1);

  // Track gut (for oral) and central amounts (per kg)
  let gutAmount = 0;
  let centralAmount = 0;

  // Schedule doses
  const doseTimes: number[] = [];
  for (let i = 0; i < nDoses; i++) doseTimes.push(i * interval);

  let cmax = 0;
  let tmax = 0;
  let auc = 0;

  let t = 0;
  for (let i = 0; i <= nSteps; i++) {
    times[i] = Number(t.toFixed(3));
    const conc = centralAmount / Vd;
    concentrations[i] = Number(conc.toFixed(4));

    if (conc > cmax) {
      cmax = conc;
      tmax = t;
    }

    // Trapezoidal AUC
    if (i > 0) {
      auc += (concentrations[i] + concentrations[i - 1]) / 2 * dt;
    }

    // Apply scheduled dose at this time
    if (doseTimes.some((dt_) => Math.abs(dt_ - t) < dt / 2)) {
      const bioDose = dose * F;
      if (route === "IV") {
        centralAmount += bioDose;
      } else {
        gutAmount += bioDose;
      }
    }

    // Euler step
    if (route === "oral" && gutAmount > 0) {
      const absorbed = ka * gutAmount * dt;
      gutAmount -= absorbed;
      centralAmount += absorbed;
    }
    centralAmount -= ke * centralAmount * dt;
    if (centralAmount < 0) centralAmount = 0;

    t += dt;
  }

  const halfLife = Math.log(2) / ke;
  const clearance = ke * Vd;
  const cssAvg = (F * dose) / (clearance * interval);
  // Approximate Css_max for oral: F*dose/Vd * ka/(ka-ke) * (e^{-ke*tmax} - e^{-ka*tmax})
  // where tmax_ss = ln(ka/ke) / (ka-ke)
  let cssMax: number;
  let cssMin: number;
  if (route === "IV") {
    cssMax = (F * dose) / Vd / (1 - Math.exp(-ke * interval));
    cssMin = cssMax * Math.exp(-ke * interval);
  } else {
    const tmaxSS = ka === ke ? 1 / ka : Math.log(ka / ke) / (ka - ke);
    const accumulationFactor = 1 / (1 - Math.exp(-ke * interval));
    cssMax = (F * dose / Vd) * (ka / (ka - ke)) *
      (Math.exp(-ke * tmaxSS) - Math.exp(-ka * tmaxSS)) * accumulationFactor;
    cssMin = (F * dose / Vd) * (ka / (ka - ke)) *
      (Math.exp(-ke * interval) - Math.exp(-ka * interval)) / (1 - Math.exp(-ke * interval));
  }
  if (!isFinite(cssMax) || cssMax < 0) cssMax = cmax;
  if (!isFinite(cssMin) || cssMin < 0) cssMin = 0;

  return {
    times,
    concentrations,
    cmax: Number(cmax.toFixed(3)),
    cmin: Number(concentrations[concentrations.length - 1].toFixed(3)),
    tmax: Number(tmax.toFixed(2)),
    auc: Number(auc.toFixed(2)),
    halfLife: Number(halfLife.toFixed(2)),
    clearance: Number(clearance.toFixed(3)),
    cssAvg: Number(cssAvg.toFixed(3)),
    cssMax: Number(cssMax.toFixed(3)),
    cssMin: Number(cssMin.toFixed(3)),
  };
}

export interface PDParams {
  /** Emax (max effect, 0-100%). */
  emax: number;
  /** EC50 (concentration at 50% effect, mg/L). */
  ec50: number;
  /** Hill coefficient (slope). */
  hill: number;
  /** MIC for antibiotics (mg/L). */
  mic?: number;
  /** PD target type. */
  targetType?: "auc_mic" | "cmax_mic" | "t_above_mic";
  /** PD target value (e.g. AUC/MIC > 125 for fluoroquinolones). */
  targetValue?: number;
}

export interface PDResult {
  /** Emax curve points: concentration → effect %. */
  curve: { conc: number; effect: number }[];
  /** PD index value. */
  pdIndex: number;
  /** PD target attainment (boolean). */
  targetAttained: boolean;
  /** % time above MIC. */
  timeAboveMIC: number;
  /** Recommendation text. */
  recommendation: string;
}

/**
 * Compute Emax dose-response curve and PD indices.
 */
export function computePD(
  pk: PKResult,
  params: PDParams,
): PDResult {
  const { emax, ec50, hill, mic, targetType, targetValue } = params;

  // Generate Emax curve
  const curve: { conc: number; effect: number }[] = [];
  const maxConc = Math.max(10, pk.cmax * 1.5);
  for (let i = 0; i <= 50; i++) {
    const c = (maxConc * i) / 50;
    const effect = (emax * Math.pow(c, hill)) / (Math.pow(ec50, hill) + Math.pow(c, hill));
    curve.push({ conc: Number(c.toFixed(3)), effect: Number(effect.toFixed(2)) });
  }

  // PD indices
  let pdIndex = 0;
  let timeAboveMIC = 0;
  if (mic && mic > 0) {
    if (targetType === "auc_mic") {
      pdIndex = pk.auc / mic;
    } else if (targetType === "cmax_mic") {
      pdIndex = pk.cmax / mic;
    } else if (targetType === "t_above_mic") {
      // Count time where concentration > MIC
      let aboveCount = 0;
      for (let i = 0; i < pk.times.length; i++) {
        if (pk.concentrations[i] >= mic) aboveCount++;
      }
      timeAboveMIC = (aboveCount / pk.times.length) * 100;
      pdIndex = timeAboveMIC;
    }
  }

  const targetAttained = targetValue ? pdIndex >= targetValue : false;

  let recommendation = "";
  if (mic && targetType) {
    if (targetType === "auc_mic") {
      if (pdIndex >= 125) recommendation = "Отличный бактериологический ответ (AUC/MIC ≥ 125). Высокая вероятность эрадикации.";
      else if (pdIndex >= 40) recommendation = "Умеренный ответ (AUC/MIC 40-125). Бактериостатический эффект.";
      else recommendation = "Недостаточный ответ (AUC/MIC < 40). Рассмотреть увеличение дозы или смену препарата.";
    } else if (targetType === "cmax_mic") {
      if (pdIndex >= 10) recommendation = "Высокий пик (Cmax/MIC ≥ 10). Хорошо для аминогликозидов.";
      else if (pdIndex >= 4) recommendation = "Умеренный пик (Cmax/MIC 4-10).";
      else recommendation = "Низкий пик. Рассмотреть увеличение разовой дозы.";
    } else if (targetType === "t_above_mic") {
      if (pdIndex >= 80) recommendation = "T>MIC ≥ 80% — отличный бактериологический ответ для β-лактамов.";
      else if (pdIndex >= 40) recommendation = "T>MIC 40-80% — умеренный ответ.";
      else recommendation = "T>MIC < 40% — недостаточное время воздействия. Увеличить частоту дозирования.";
    }
  }

  return {
    curve,
    pdIndex: Number(pdIndex.toFixed(2)),
    targetAttained,
    timeAboveMIC: Number(timeAboveMIC.toFixed(1)),
    recommendation,
  };
}

/**
 * Drug-specific PK defaults (typical veterinary values).
 */
export const DRUG_PK_PROFILES: {
  name: string; group: string; species: string;
  params: Omit<PKParams, "dose" | "nDoses" | "interval">;
  mic?: number; pdType?: "auc_mic" | "cmax_mic" | "t_above_mic"; pdTarget?: number;
}[] = [
  {
    name: "Энрофлоксацин", group: "Фторхинолон", species: "Собака",
    params: { F: 1.0, Vd: 2.5, ka: 1.5, ke: 0.12, route: "oral", duration: 72, dt: 0.1 },
    mic: 0.5, pdType: "auc_mic", pdTarget: 125,
  },
  {
    name: "Амоксициллин", group: "β-лактам", species: "Собака",
    params: { F: 0.85, Vd: 0.3, ka: 1.2, ke: 0.7, route: "oral", duration: 48, dt: 0.05 },
    mic: 0.5, pdType: "t_above_mic", pdTarget: 40,
  },
  {
    name: "Гентамицин", group: "Аминогликозид", species: "Собака",
    params: { F: 1.0, Vd: 0.25, ka: 0, ke: 0.23, route: "IV", duration: 48, dt: 0.05 },
    mic: 2.0, pdType: "cmax_mic", pdTarget: 10,
  },
  {
    name: "Доксициклин", group: "Тетрациклин", species: "Собака",
    params: { F: 0.9, Vd: 1.5, ka: 0.8, ke: 0.05, route: "oral", duration: 96, dt: 0.1 },
    mic: 1.0, pdType: "auc_mic", pdTarget: 40,
  },
  {
    name: "Марбофлоксацин", group: "Фторхинолон", species: "Кошка",
    params: { F: 0.95, Vd: 1.5, ka: 1.0, ke: 0.08, route: "oral", duration: 72, dt: 0.1 },
    mic: 0.25, pdType: "auc_mic", pdTarget: 125,
  },
  {
    name: "Цефтиофур", group: "Цефалоспорин", species: "КРС",
    params: { F: 1.0, Vd: 0.4, ka: 0, ke: 0.25, route: "IV", duration: 48, dt: 0.05 },
    mic: 1.0, pdType: "t_above_mic", pdTarget: 40,
  },
];
