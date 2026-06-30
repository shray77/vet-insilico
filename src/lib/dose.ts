/**
 * Antibiotic Dose Calculator — veterinary-specific dose calculator.
 *
 * Uses the existing DRUGS database + species-specific dose rates.
 * Calculates dose by body weight, with adjustments for:
 *   - Species (pig, cattle, poultry, dog, cat, horse)
 *   - Age (neonate, young, adult — affects clearance)
 *   - Route (IV, IM, SC, oral)
 *   - Frequency and duration
 *
 * References:
 *   - Plumb's Veterinary Drug Handbook
 *   - Russian veterinary formulary
 *   - SWAB/SVA guidelines (Swedish Veterinary Antibiotic Guidelines)
 */

export interface DoseRate {
  /** Drug INN. */
  drug: string;
  /** Species. */
  species: string;
  /** Dose in mg/kg. */
  doseMgKg: number;
  /** Route. */
  route: "IV" | "IM" | "SC" | "oral" | "topical";
  /** Frequency in hours. */
  intervalHours: number;
  /** Duration in days. */
  durationDays: number;
  /** Notes / warnings. */
  notes?: string;
  /** Contraindications. */
  contraindications?: string;
}

// Simplified dose database — top antibiotics per species
export const DOSE_DATABASE: DoseRate[] = [
  // ─── Swine ───
  { drug: "enrofloxacin", species: "Свинья", doseMgKg: 2.5, route: "IM", intervalHours: 24, durationDays: 3, notes: "Не применять у свиней на откорме (период ожидания 10 дней)" },
  { drug: "oxytetracycline", species: "Свинья", doseMgKg: 10, route: "IM", intervalHours: 24, durationDays: 4, notes: "Развести в 2 точки введения при дозе >10 мл" },
  { drug: "florfenicol", species: "Свинья", doseMgKg: 15, route: "IM", intervalHours: 48, durationDays: 7, notes: "Период ожидания 14 дней" },
  { drug: "ceftiofur", species: "Свинья", doseMgKg: 3, route: "IM", intervalHours: 24, durationDays: 3, notes: "Для лечения респираторных инфекций" },
  { drug: "tulathromycin", species: "Свинья", doseMgKg: 2.5, route: "IM", intervalHours: 0, durationDays: 1, notes: "Однократно. Период ожидания 33 дня" },
  { drug: "trimethoprim", species: "Свинья", doseMgKg: 5, route: "IM", intervalHours: 24, durationDays: 5, notes: "В комбинации с сульфадиазином 1:5" },
  { drug: "amoxicillin", species: "Свинья", doseMgKg: 10, route: "oral", intervalHours: 12, durationDays: 5, notes: "Перорально через воду" },
  // ─── Cattle ───
  { drug: "enrofloxacin", species: "КРС", doseMgKg: 5, route: "SC", intervalHours: 24, durationDays: 3, notes: "Период ожидания 14 дней (молоко 84 часа)" },
  { drug: "oxytetracycline", species: "КРС", doseMgKg: 10, route: "IV", intervalHours: 24, durationDays: 4, notes: "Вводить медленно IV. Период ожидания 22 дня" },
  { drug: "florfenicol", species: "КРС", doseMgKg: 40, route: "SC", intervalHours: 48, durationDays: 2, notes: "2 введения с интервалом 48ч. Период ожидания 38 дней" },
  { drug: "ceftiofur", species: "КРС", doseMgKg: 1.1, route: "SC", intervalHours: 24, durationDays: 3, notes: "Для лечения пневмонии. Не применять у жвачных < 8 недель" },
  { drug: "tulathromycin", species: "КРС", doseMgKg: 2.5, route: "SC", intervalHours: 0, durationDays: 1, notes: "Однократно. Период ожидания 49 дней" },
  { drug: "penicillin G", species: "КРС", doseMgKg: 10000, route: "IM", intervalHours: 24, durationDays: 3, notes: "Доза в IU/кг. Период ожидания 14 дней" },
  { drug: "sulfadiazine", species: "КРС", doseMgKg: 30, route: "IV", intervalHours: 24, durationDays: 5, notes: "В комбинации с триметопримом" },
  // ─── Poultry ───
  { drug: "enrofloxacin", species: "Птица", doseMgKg: 10, route: "oral", intervalHours: 24, durationDays: 5, notes: "Через воду. Период ожидания 12 дней" },
  { drug: "oxytetracycline", species: "Птица", doseMgKg: 25, route: "oral", intervalHours: 24, durationDays: 5, notes: "Через воду. Не использовать у несушек" },
  { drug: "florfenicol", species: "Птица", doseMgKg: 20, route: "oral", intervalHours: 24, durationDays: 5, notes: "Через воду" },
  { drug: "doxycycline", species: "Птица", doseMgKg: 15, route: "oral", intervalHours: 24, durationDays: 5, notes: "Через воду. Период ожидания 7 дней" },
  { drug: "tylosin", species: "Птица", doseMgKg: 25, route: "oral", intervalHours: 24, durationDays: 5, notes: "Через воду" },
  { drug: "sulfadimidine", species: "Птица", doseMgKg: 100, route: "oral", intervalHours: 24, durationDays: 5, notes: "Через воду" },
  // ─── Dog ───
  { drug: "enrofloxacin", species: "Собака", doseMgKg: 5, route: "oral", intervalHours: 24, durationDays: 7, notes: "Не применять щенкам < 8 мес (хрящевая ткань)" },
  { drug: "amoxicillin", species: "Собака", doseMgKg: 10, route: "oral", intervalHours: 12, durationDays: 7, notes: "Клавулановая кислота 2:1" },
  { drug: "doxycycline", species: "Собака", doseMgKg: 5, route: "oral", intervalHours: 12, durationDays: 7, notes: "Давать с водой (эзофагит)" },
  { drug: "metronidazole", species: "Собака", doseMgKg: 15, route: "oral", intervalHours: 12, durationDays: 7, notes: "Антианаэробный" },
  { drug: "gentamicin", species: "Собака", doseMgKg: 6, route: "IM", intervalHours: 24, durationDays: 5, notes: "Контроль функции почек. Не > 7 дней" },
  { drug: "clindamycin", species: "Собака", doseMgKg: 11, route: "oral", intervalHours: 12, durationDays: 7, notes: "Нефротоксичный у кошек" },
  { drug: "cefalexin", species: "Собака", doseMgKg: 15, route: "oral", intervalHours: 12, durationDays: 7, notes: "Кожные инфекции" },
  // ─── Cat ───
  { drug: "amoxicillin", species: "Кошка", doseMgKg: 12.5, route: "oral", intervalHours: 12, durationDays: 7, notes: "С клавулановой кислотой" },
  { drug: "doxycycline", species: "Кошка", doseMgKg: 5, route: "oral", intervalHours: 12, durationDays: 7, notes: "Давать с водой (эзофагит)" },
  { drug: "clindamycin", species: "Кошка", doseMgKg: 11, route: "oral", intervalHours: 24, durationDays: 7, notes: "Ограничить курс (нефротоксичность)" },
  { drug: "marbofloxacin", species: "Кошка", doseMgKg: 4, route: "oral", intervalHours: 24, durationDays: 7, notes: "Не применять котятам < 8 мес" },
  { drug: "metronidazole", species: "Кошка", doseMgKg: 10, route: "oral", intervalHours: 12, durationDays: 7, notes: "Горький — давать в капсуле" },
  { drug: "cefalexin", species: "Кошка", doseMgKg: 15, route: "oral", intervalHours: 12, durationDays: 7 },
  // ─── Horse ───
  { drug: "penicillin G", species: "Лошадь", doseMgKg: 22000, route: "IM", intervalHours: 12, durationDays: 5, notes: "IU/кг. Не давать лошадям orally" },
  { drug: "gentamicin", species: "Лошадь", doseMgKg: 6.6, route: "IV", intervalHours: 24, durationDays: 5, notes: "Контроль функции почек" },
  { drug: "enrofloxacin", species: "Лошадь", doseMgKg: 5, route: "oral", intervalHours: 24, durationDays: 7, notes: "Не применять жеребятам < 12 мес" },
  { drug: "doxycycline", species: "Лошадь", doseMgKg: 10, route: "oral", intervalHours: 12, durationDays: 7, notes: "Давать с водой" },
  { drug: "metronidazole", species: "Лошадь", doseMgKg: 15, route: "oral", intervalHours: 8, durationDays: 7, notes: "Анаэробные инфекции" },
  { drug: "ceftiofur", species: "Лошадь", doseMgKg: 2.2, route: "IM", intervalHours: 24, durationDays: 5 },
];

export interface DoseCalculationResult {
  drug: string;
  species: string;
  bodyWeight: number;
  dosePerAdministration: number; // mg
  doseVolume: number; // ml (if concentration provided)
  totalDailyDose: number; // mg/day
  totalCourseDose: number; // mg total
  numberOfAdministrations: number;
  route: string;
  intervalHours: number;
  durationDays: number;
  notes: string;
  contraindications?: string;
  /** Estimated cost (if price provided). */
  estimatedCost?: number;
  /** Warning if dose is unusually high. */
  warning?: string;
}

export function calculateDose(
  doseRate: DoseRate,
  bodyWeight: number,
  options: { concentration?: number; pricePerMl?: number; ageGroup?: "neonate" | "young" | "adult" } = {},
): DoseCalculationResult {
  const { concentration, pricePerMl, ageGroup } = options;

  // Age adjustment
  let adjustedDose = doseRate.doseMgKg;
  if (ageGroup === "neonate") {
    // Neonates: reduced clearance, reduce dose by 30%
    adjustedDose *= 0.7;
  } else if (ageGroup === "young") {
    adjustedDose *= 0.85;
  }

  const dosePerAdministration = adjustedDose * bodyWeight; // mg
  const administrationsPerDay = doseRate.intervalHours > 0 ? 24 / doseRate.intervalHours : 1;
  const totalDailyDose = dosePerAdministration * administrationsPerDay;
  const numberOfAdministrations = doseRate.intervalHours > 0 ? doseRate.durationDays * administrationsPerDay : doseRate.durationDays;
  const totalCourseDose = dosePerAdministration * numberOfAdministrations;

  const doseVolume = concentration ? dosePerAdministration / concentration : 0;

  let warning: string | undefined;
  if (dosePerAdministration > 5000) warning = "Большая разовая доза — разделить на 2 точки введения";
  if (bodyWeight > 500 && doseRate.route === "IM") warning = "Не применять IM у крупных животных — использовать IV";

  const estimatedCost = pricePerMl && doseVolume ? doseVolume * numberOfAdministrations * pricePerMl : undefined;

  return {
    drug: doseRate.drug,
    species: doseRate.species,
    bodyWeight,
    dosePerAdministration: Number(dosePerAdministration.toFixed(1)),
    doseVolume: Number(doseVolume.toFixed(2)),
    totalDailyDose: Number(totalDailyDose.toFixed(1)),
    totalCourseDose: Number(totalCourseDose.toFixed(1)),
    numberOfAdministrations: Math.ceil(numberOfAdministrations),
    route: doseRate.route,
    intervalHours: doseRate.intervalHours,
    durationDays: doseRate.durationDays,
    notes: doseRate.notes || "",
    contraindications: doseRate.contraindications,
    estimatedCost,
    warning,
  };
}

/** Get available species. */
export const AVAILABLE_SPECIES_DOSE = [...new Set(DOSE_DATABASE.map(d => d.species))];

/** Get drugs for a species. */
export function getDrugsForSpecies(species: string): string[] {
  return [...new Set(DOSE_DATABASE.filter(d => d.species === species).map(d => d.drug))];
}

/** Get dose rates for a specific drug+species. */
export function getDoseRates(drug: string, species: string): DoseRate[] {
  return DOSE_DATABASE.filter(d => d.drug === drug && d.species === species);
}
