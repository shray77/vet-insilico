/**
 * Molecular Clock Calculator — estimate divergence time from genetic distance.
 *
 * Uses:
 *   - Kimura 2-parameter distance (from alignment)
 *   - Molecular clock rate (substitutions per site per year)
 *   - Confidence intervals
 *
 * Formula: T = d / (2r)
 *   d = genetic distance (substitutions per site)
 *   r = molecular clock rate (substitutions per site per year per lineage)
 *   Factor of 2 because both lineages accumulate mutations
 *
 * Common clock rates:
 *   - ASFV p72: ~1×10⁻⁵ subs/site/year
 *   - Influenza HA: ~3×10⁻³ subs/site/year
 *   - Rabies N: ~2×10⁻⁴ subs/site/year
 *   - HIV-1: ~1×10⁻² subs/site/year
 *   - mtDNA (vertebrate): ~2×10⁻⁸ subs/site/year
 *
 * All in browser, no external dependencies.
 */

export interface MolecularClockResult {
  geneticDistance: number;
  clockRate: number;
  /** Divergence time in years. */
  divergenceTimeYears: number;
  /** Upper bound (95% CI). */
  upperBoundYears: number;
  /** Lower bound (95% CI). */
  lowerBoundYears: number;
  /** In human-readable format. */
  humanReadable: string;
  /** Method used. */
  method: string;
}

export interface ClockRate {
  gene: string;
  organism: string;
  /** Substitutions per site per year. */
  rate: number;
  /** Description / source. */
  source: string;
}

/**
 * Published molecular clock rates for veterinary-relevant genes.
 */
export const CLOCK_RATES: ClockRate[] = [
  { gene: "ASFV p72", organism: "African Swine Fever Virus", rate: 1e-5, source: "Gallardo et al. 2014" },
  { gene: "ASFV p54", organism: "African Swine Fever Virus", rate: 2e-5, source: "Gallardo et al. 2014" },
  { gene: "Influenza HA", organism: "Influenza A virus", rate: 3e-3, source: "Suzuki 2006" },
  { gene: "Influenza NA", organism: "Influenza A virus", rate: 2.5e-3, source: "Suzuki 2006" },
  { gene: "Rabies N", organism: "Rabies virus", rate: 2e-4, source: "Bourhy et al. 2008" },
  { gene: "Rabies G", organism: "Rabies virus", rate: 3e-4, source: "Bourhy et al. 2008" },
  { gene: "FMDV VP1", organism: "Foot-and-Mouth Disease Virus", rate: 1.5e-3, source: "Carrillo et al. 2017" },
  { gene: "BVDV E2", organism: "Bovine Viral Diarrhea Virus", rate: 1e-3, source: "Vilcek et al. 2001" },
  { gene: "Brucella omp2b", organism: "Brucella spp.", rate: 1e-7, source: "Whatmore 2009" },
  { gene: "E. coli 16S rRNA", organism: "E. coli", rate: 1e-8, source: "Ochman et al. 1999" },
  { gene: "mtDNA cyt b", organism: "Vertebrate mitochondria", rate: 2e-8, source: "Brown et al. 1979" },
  { gene: "mtDNA COI", organism: "Vertebrate mitochondria", rate: 1.5e-8, source: "Brown et al. 1979" },
];

/**
 * Calculate divergence time from genetic distance and clock rate.
 *
 * @param geneticDistance Substitutions per site (from K2P or p-distance)
 * @param clockRate Substitutions per site per year (per lineage)
 * @param confidenceInterval Standard error of the distance (optional, for CI)
 */
export function calculateDivergenceTime(
  geneticDistance: number,
  clockRate: number,
  confidenceInterval?: number,
): MolecularClockResult {
  // T = d / (2r) — both lineages accumulate mutations
  const divergenceTimeYears = geneticDistance / (2 * clockRate);

  // 95% CI: ±1.96 × SE / (2r)
  let upperBoundYears = divergenceTimeYears;
  let lowerBoundYears = divergenceTimeYears;
  if (confidenceInterval !== undefined && confidenceInterval > 0) {
    const ciYears = 1.96 * confidenceInterval / (2 * clockRate);
    upperBoundYears = divergenceTimeYears + ciYears;
    lowerBoundYears = Math.max(0, divergenceTimeYears - ciYears);
  }

  const humanReadable = formatTime(divergenceTimeYears);

  return {
    geneticDistance,
    clockRate,
    divergenceTimeYears: Number(divergenceTimeYears.toFixed(1)),
    upperBoundYears: Number(upperBoundYears.toFixed(1)),
    lowerBoundYears: Number(lowerBoundYears.toFixed(1)),
    humanReadable,
    method: "T = d / (2r)",
  };
}

function formatTime(years: number): string {
  if (years < 1) return `${(years * 365).toFixed(1)} дней`;
  if (years < 100) return `${years.toFixed(1)} лет`;
  if (years < 1000) return `${years.toFixed(0)} лет (~${(years / 30).toFixed(0)} поколений)`;
  if (years < 1000000) return `${(years / 1000).toFixed(1)} тыс. лет`;
  if (years < 1000000000) return `${(years / 1000000).toFixed(1)} млн лет`;
  return `${(years / 1000000000).toFixed(1)} млрд лет`;
}

/**
 * Sample dataset: ASFV p72 sequences with known isolation dates.
 * Genetic distances computed from pairwise comparison.
 */
export const MOLECULAR_CLOCK_SAMPLES: {
  name: string;
  description: string;
  gene: string;
  pairs: { strain1: string; strain2: string; distance: number; isolationYears: string; yearDiff: number }[];
}[] = [
  {
    name: "ASFV p72 — штаммы из разных эпох",
    description: "Pairwise K2P distances between ASFV p72 sequences",
    gene: "ASFV p72",
    pairs: [
      { strain1: "Kenya 1950", strain2: "Georgia 2007", distance: 0.012, isolationYears: "1950-2007", yearDiff: 57 },
      { strain1: "Spain 1975", strain2: "Russia 2023", distance: 0.015, isolationYears: "1975-2023", yearDiff: 48 },
      { strain1: "Belarus 2013", strain2: "Russia 2023", distance: 0.003, isolationYears: "2013-2023", yearDiff: 10 },
      { strain1: "Sardinia 1978", strain2: "Belarus 2013", distance: 0.008, isolationYears: "1978-2013", yearDiff: 35 },
    ],
  },
  {
    name: "Rabies N gene — варианты",
    description: "Pairwise K2P distances between rabies N gene variants",
    gene: "Rabies N",
    pairs: [
      { strain1: "Arctic-like", strain2: "Cosmopolitan", distance: 0.045, isolationYears: "?", yearDiff: 0 },
      { strain1: "Asian", strain2: "Africa-1", distance: 0.062, isolationYears: "?", yearDiff: 0 },
      { strain1: "European bat", strain2: "Arctic-like", distance: 0.089, isolationYears: "?", yearDiff: 0 },
    ],
  },
];
