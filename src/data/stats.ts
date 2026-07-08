/**
 * Lightweight stats for the homepage — avoids importing the full DRUGS
 * (3900 lines, ~150KB) and PATHOGENS (574 lines) arrays on the homepage
 * when all it needs is counts.
 *
 * The actual data is imported only by the tool pages that need it.
 */

// These counts must match the actual arrays in src/data/drugs.ts and
// src/data/pathogens.ts. If they drift, the homepage will show wrong numbers.
// To verify: run `bun run test` — the stats test checks these.
export const DRUG_COUNT = 204;
export const DRUGS_WITH_SMILES = 190;
export const PATHOGEN_COUNT = 12;
export const RESTRICTION_ENZYME_COUNT = 30;
export const TOOL_COUNT = 17;
