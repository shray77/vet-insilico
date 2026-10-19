/**
 * Lightweight stats for the homepage — avoids importing the full DRUGS
 * (3900 lines, ~150KB) and PATHOGENS (574 lines) arrays on the homepage
 * when all it needs is counts.
 *
 * The actual data is imported only by the tool pages that need it.
 */

// These counts must match the actual arrays in src/data/drugs.ts and
// src/data/pathogens.ts. If they drift, the homepage will show wrong numbers.
// To verify counts: grep the arrays in src/data/drugs.ts / pathogens.ts.
export const DRUG_COUNT = 202;
export const PATHOGEN_COUNT = 17;
