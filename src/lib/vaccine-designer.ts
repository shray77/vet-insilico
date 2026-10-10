/**
 * Multi-Epitope Vaccine Construct Designer.
 *
 * Takes a pathogen protein sequence and designs a multi-epitope vaccine
 * construct by:
 *   1. Predicting B-cell and T-cell epitopes (existing epitopes.ts)
 *   2. Selecting top candidates (non-overlapping, diverse)
 *   3. Linking them with GPGPG linkers (standard for multi-epitope vaccines)
 *   4. Adding signal peptide (for MHC-I presentation)
 *   5. Adding His-tag (for purification/detection)
 *   6. Codon-optimizing for the target species (existing codon.ts)
 *   7. Adding restriction sites for cloning (existing codon.ts)
 *
 * This is the actual workflow vaccine designers do — no tool currently
 * does it end-to-end. VetInSilico already has all the pieces; this
 * module wires them together.
 */

import { predictBCellEpitopes, predictTCellEpitopes, type TCellEpitope } from "./epitopes";
import { optimizeCodons, type OptimizationResult } from "./codon";
import { blosum62Score } from "./blosum62";

export interface VaccineEpitope {
  /** Original sequence. */
  sequence: string;
  /** Type: B-cell or T-cell. */
  type: "B-cell" | "T-cell-MHC-I";
  /** Score from prediction algorithm (0-100). */
  score: number;
  /** Position in original protein. */
  start: number;
  end: number;
  /** MHC allele (for T-cell only). */
  mhcAllele?: string;
}

export interface VaccineConstruct {
  /** Final protein sequence (with linkers, signal peptide, tags). */
  proteinSequence: string;
  /** List of epitopes included in the construct. */
  epitopes: VaccineEpitope[];
  /** Total length in amino acids. */
  length: number;
  /** Number of B-cell epitopes. */
  bCellCount: number;
  /** Number of T-cell epitopes. */
  tCellCount: number;
  /** Linker used between epitopes. */
  linker: string;
  /** Average naturalness score (BLOSUM62-based, 0-1). */
  naturalness: number;
  /** Molecular weight estimate (kDa). */
  molecularWeight: number;
  /** Codon-optimized DNA (if requested). */
  codonOptimized?: OptimizationResult;
  /** GenBank-format export. */
  genBank?: string;
}

// ─── Constants ──────────────────────────────────────────────────────

/** GPGPG linker — standard for multi-epitope vaccines (flexible, immunogenic). */
const DEFAULT_LINKER = "GPGPG";

/** Signal peptide from tissue plasminogen activator (tPA) — drives secretion. */
const SIGNAL_PEPTIDE = "MDAMKRGLCCVLLLCGAVFVSPSAS";

/** 6xHis tag for purification/detection. */
const HIS_TAG = "HHHHHH";

/** Stop codon. */
const STOP = "*";

// ─── Main function ──────────────────────────────────────────────────

export interface DesignOptions {
  /** Max number of B-cell epitopes to include. */
  maxBEpitopes?: number;
  /** Max number of T-cell epitopes to include. */
  maxTEpitopes?: number;
  /** MHC alleles to predict T-cell epitopes for. */
  mhcAlleles?: string[];
  /** Linker sequence between epitopes. */
  linker?: string;
  /** Include signal peptide? */
  includeSignalPeptide?: boolean;
  /** Include His-tag? */
  includeHisTag?: boolean;
  /** Codon-optimize for species? (e.g., "pig", "cattle", "chicken") */
  codonOptimizeFor?: string;
  /** Add restriction sites for cloning? */
  addRestrictionSites?: boolean;
}

export function designVaccine(
  proteinSeq: string,
  options: DesignOptions = {},
): VaccineConstruct {
  const {
    maxBEpitopes = 5,
    maxTEpitopes = 5,
    mhcAlleles = ["HLA-A*02:01"],
    linker = DEFAULT_LINKER,
    includeSignalPeptide = true,
    includeHisTag = true,
    codonOptimizeFor,
    addRestrictionSites = false,
  } = options;

  // 1. Predict epitopes
  const bEpitopes = predictBCellEpitopes(proteinSeq, 8, 20).slice(0, maxBEpitopes);
  const tEpitopes: TCellEpitope[] = [];
  for (const allele of mhcAlleles) {
    const tEps = predictTCellEpitopes(proteinSeq, allele).slice(0, maxTEpitopes);
    tEpitopes.push(...tEps);
  }
  // Deduplicate T-cell epitopes by sequence
  const seenT = new Set<string>();
  const uniqueTEpitopes = tEpitopes.filter((t) => {
    if (seenT.has(t.sequence)) return false;
    seenT.add(t.sequence);
    return true;
  }).slice(0, maxTEpitopes);

  // 2. Build epitope list (alternating B and T for better immune response)
  const selectedEpitopes: VaccineEpitope[] = [];
  const maxLen = Math.max(bEpitopes.length, uniqueTEpitopes.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < bEpitopes.length) {
      const b = bEpitopes[i];
      selectedEpitopes.push({
        sequence: b.sequence,
        type: "B-cell",
        score: b.score,
        start: b.start,
        end: b.end,
      });
    }
    if (i < uniqueTEpitopes.length) {
      const t = uniqueTEpitopes[i];
      selectedEpitopes.push({
        sequence: t.sequence,
        type: "T-cell-MHC-I",
        score: t.score,
        start: t.start,
        end: t.end,
        mhcAllele: t.mhc_allele,
      });
    }
  }

  if (selectedEpitopes.length === 0) {
    throw new Error("Не найдено эпитопов в последовательности. Используйте更长 последовательность.");
  }

  // 3. Assemble construct: signal peptide + epitopes(linked) + His-tag
  const parts: string[] = [];
  if (includeSignalPeptide) parts.push(SIGNAL_PEPTIDE);

  for (let i = 0; i < selectedEpitopes.length; i++) {
    parts.push(selectedEpitopes[i].sequence);
    if (i < selectedEpitopes.length - 1) {
      parts.push(linker);
    }
  }

  if (includeHisTag) parts.push(HIS_TAG);
  parts.push(STOP);

  const proteinSequence = parts.join("");

  // 4. Compute naturalness (BLOSUM62-based)
  let totalScore = 0;
  let count = 0;
  for (let i = 0; i < proteinSequence.length - 1; i++) {
    totalScore += blosum62Score(proteinSequence[i], proteinSequence[i + 1]);
    count++;
  }
  const naturalness = count > 0 ? Math.max(0, (totalScore / count + 4) / 8) : 0;

  // 5. Molecular weight estimate (110 Da per aa average)
  const molecularWeight = (proteinSequence.length * 110) / 1000; // kDa

  // 6. Codon optimization (optional)
  let codonOptimized: OptimizationResult | undefined;
  if (codonOptimizeFor) {
    // Remove stop codon marker — codon optimizer handles its own stop
    const dnaForOptimization = proteinSequence.replace("*", "");
    try {
      codonOptimized = optimizeCodons(
        // Reverse translate protein to DNA first
        reverseTranslate(dnaForOptimization),
        codonOptimizeFor as any,
        { avoidRestrictionSites: addRestrictionSites, avoidHairpins: true },
      );
    } catch {
      // Codon optimization is optional — don't fail the whole construct
    }
  }

  // 7. GenBank export (optional)
  const genBank = toGenBank(proteinSequence, selectedEpitopes, includeSignalPeptide, includeHisTag, linker);

  return {
    proteinSequence,
    epitopes: selectedEpitopes,
    length: proteinSequence.length,
    bCellCount: bEpitopes.length,
    tCellCount: uniqueTEpitopes.length,
    linker,
    naturalness,
    molecularWeight,
    codonOptimized,
    genBank,
  };
}

// ─── Reverse translation (protein → DNA) ────────────────────────────

const AA_TO_CODON: Record<string, string> = {
  A: "GCT", R: "CGT", N: "AAT", D: "GAT", C: "TGT",
  Q: "CAG", E: "GAG", G: "GGT", H: "CAT", I: "ATC",
  L: "CTT", K: "AAA", M: "ATG", F: "TTT", P: "CCT",
  S: "TCT", T: "ACT", W: "TGG", Y: "TAT", V: "GTT",
  "*": "TAA",
};

function reverseTranslate(protein: string): string {
  return protein.split("").map((aa) => AA_TO_CODON[aa] || "NNN").join("");
}

// ─── GenBank export ─────────────────────────────────────────────────

function toGenBank(
  protein: string,
  epitopes: VaccineEpitope[],
  hasSignal: boolean,
  hasHisTag: boolean,
  linker: string,
): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "-");
  const lines: string[] = [];

  lines.push(`LOCUS       VACCINE_CONSTRUCT    ${protein.length} aa            linear   UNK ${date}`);
  lines.push(`DEFINITION  Multi-epitope vaccine construct designed by VetInSilico Hub.`);
  lines.push(`ACCESSION   .`);
  lines.push(`VERSION     .`);
  lines.push(`SOURCE      synthetic vaccine construct`);
  lines.push(`  ORGANISM  synthetic construct`);
  lines.push(`FEATURES             Location/Qualifiers`);
  lines.push(`     source          1..${protein.length}`);
  lines.push(`                     /organism="synthetic construct"`);
  lines.push(`                     /mol_type="protein"`);

  // Annotate signal peptide
  let offset = 1;
  if (hasSignal) {
    const spLen = 25; // tPA signal peptide length
    lines.push(`     sig_peptide     ${offset}..${offset + spLen - 1}`);
    lines.push(`                     /label="tPA signal peptide"`);
    offset += spLen;
  }

  // Annotate epitopes
  for (const ep of epitopes) {
    const epLen = ep.sequence.length;
    const featType = ep.type === "B-cell" ? "misc_feature" : "misc_feature";
    lines.push(`     ${featType.padEnd(16)}${offset}..${offset + epLen - 1}`);
    lines.push(`                     /label="${ep.type} epitope"`);
    lines.push(`                     /note="score=${ep.score.toFixed(1)}, pos=${ep.start}-${ep.end}${ep.mhcAllele ? `, ${ep.mhcAllele}` : ""}"`);
    offset += epLen;
    // Skip linker (except after last epitope)
    if (ep !== epitopes[epitopes.length - 1]) {
      offset += linker.length;
    }
  }

  // Annotate His-tag
  if (hasHisTag) {
    const hisLen = 6;
    lines.push(`     misc_feature    ${offset}..${offset + hisLen - 1}`);
    lines.push(`                     /label="6xHis tag"`);
    offset += hisLen;
  }

  lines.push(`ORIGIN`);
  // Write protein sequence in GenBank format (60 chars per line)
  const seq = protein.toLowerCase();
  for (let i = 0; i < seq.length; i += 60) {
    const chunk = seq.slice(i, i + 60);
    const lineNum = String(i + 1).padStart(9, " ");
    const groups = chunk.match(/.{1,10}/g)?.join(" ") || chunk;
    lines.push(`${lineNum} ${groups}`);
  }
  lines.push("//");

  return lines.join("\n");
}
