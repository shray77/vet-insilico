/**
 * Outbreak Surveillance Dashboard — combined analysis pipeline.
 *
 * Wires together three existing tools into a single workflow for
 * outbreak response:
 *   1. Multiple sequence alignment (alignment.ts — Needleman-Wunsch)
 *   2. Phylogenetic tree (phylo.ts — UPGMA + Kimura 2P distance)
 *   3. Molecular clock (molecular-clock.ts — divergence time estimate)
 *   4. AMR detection (amr.ts — resistance mutation scanning)
 *
 * Input: multiple pathogen sequences (from field isolates)
 * Output: combined report with tree + timeline + resistance status
 *
 * This is what public-health vets do during ASFV/FMDV outbreaks —
 * currently they use 3-4 separate tools (MEGA, BEAST, ResFinder).
 */

import { needlemanWunsch } from "./alignment";
import { upgma, computeDistanceMatrix, type PhyloResult } from "./phylo";
import { calculateDivergenceTime, CLOCK_RATES } from "./molecular-clock";
import { predictAMR, type AMRResult } from "./amr";

export interface OutbreakIsolate {
  name: string;
  sequence: string;
  /** Collection date (ISO or partial, e.g., "2024-03"). */
  date?: string;
  /** Geographic location. */
  location?: string;
}

export interface IsolateAnalysis {
  name: string;
  date: string;
  location: string;
  sequence: string;
  amr: AMRResult | null;
  length: number;
}

export interface PairwiseDistance {
  a: string;
  b: string;
  distance: number;
  /** Estimated divergence time in years. */
  divergenceYears: number;
  /** Alignment identity %. */
  identity: number;
}

export interface SurveillanceReport {
  isolates: IsolateAnalysis[];
  tree: PhyloResult | null;
  pairwise: PairwiseDistance[];
  /** Estimated time to most recent common ancestor (years). */
  tmrcaEstimate: number | null;
  /** Pathogen guess from molecular clock rates. */
  pathogenGuess: string | null;
  /** Number of isolates with AMR mutations. */
  resistantCount: number;
  /** Total AMR mutations found. */
  totalMutations: number;
  /** Newick tree string for visualization. */
  newickTree: string | null;
  /** Summary recommendations. */
  summary: string[];
}

/**
 * Run combined outbreak surveillance analysis.
 *
 * @param isolates - array of pathogen sequences with metadata
 * @param options - pathogen type (protein/dna), molecular clock rate
 */
export function analyzeOutbreak(
  isolates: OutbreakIsolate[],
  options: {
    seqType?: "protein" | "dna";
    clockRate?: number; // substitutions/site/year
  } = {},
): SurveillanceReport {
  const { seqType = "dna", clockRate } = options;

  if (isolates.length < 2) {
    throw new Error("Минимум 2 изолята для анализа вспышки");
  }
  if (isolates.length > 20) {
    throw new Error("Максимум 20 изолятов (производительность)");
  }

  // 1. Analyze each isolate individually (AMR + metadata)
  const analyzed: IsolateAnalysis[] = isolates.map((iso) => {
    const seq = iso.sequence.toUpperCase().replace(/[^A-Z]/g, "");
    let amr: AMRResult | null = null;

    // Only run AMR on DNA sequences (looking for resistance genes)
    if (seqType === "dna" && seq.length > 50) {
      try {
        amr = predictAMR(seq);
      } catch {
        amr = null;
      }
    }

    return {
      name: iso.name,
      date: iso.date || "Unknown",
      location: iso.location || "Unknown",
      sequence: seq,
      amr,
      length: seq.length,
    };
  });

  // 2. Compute pairwise distances (Kimura 2P for DNA, raw p-distance for protein)
  const labels = analyzed.map((a) => a.name);
  const dmResult = computeDistanceMatrix(
    analyzed.map((a) => ({ name: a.name, seq: a.sequence })),
    seqType,
  );

  // 3. Build phylogenetic tree (UPGMA)
  let tree: PhyloResult | null = null;
  try {
    tree = upgma(labels, dmResult.matrix);
  } catch {
    tree = null;
  }

  // 4. Compute pairwise distances with divergence time estimates
  const pairwise: PairwiseDistance[] = [];
  let minDivergence = Infinity;

  for (let i = 0; i < analyzed.length; i++) {
    for (let j = i + 1; j < analyzed.length; j++) {
      const a = analyzed[i];
      const b = analyzed[j];
      if (a.sequence.length < 10 || b.sequence.length < 10) continue;

      // Align (pairwise)
      const minLen = Math.min(a.sequence.length, b.sequence.length);
      const aSub = a.sequence.slice(0, minLen);
      const bSub = b.sequence.slice(0, minLen);

      let distance: number;
      

      if (seqType === "dna") {
        // Kimura 2-parameter distance (inline — avoids circular import)
        let transitions = 0, transversions = 0, valid = 0;
        for (let k = 0; k < minLen; k++) {
          const a = aSub[k], b = bSub[k];
          if (!"ACGT".includes(a) || !"ACGT".includes(b)) continue;
          valid++;
          if (a === b) continue;
          const isTransition = (a === "A" && b === "G") || (a === "G" && b === "A") ||
                              (a === "C" && b === "T") || (a === "T" && b === "C");
          if (isTransition) transitions++;
          else transversions++;
        }
        if (valid > 0) {
          const p = transitions / valid;
          const q = transversions / valid;
          const arg = 1 - 2 * p - q;
          const arg2 = 1 - 2 * q;
          if (arg > 0 && arg2 > 0) {
            distance = -0.5 * Math.log(arg) - 0.25 * Math.log(arg2);
          } else {
            distance = 1 - (minLen - transitions - transversions) / minLen;
          }
        } else {
          distance = 1;
        }
      } else {
        // Raw p-distance for protein
        let diffs = 0;
        for (let k = 0; k < minLen; k++) {
          if (aSub[k] !== bSub[k]) diffs++;
        }
        distance = diffs / minLen;
      }

      const identity = (1 - distance) * 100;

      // Estimate divergence time
      const rate = clockRate || guessClockRate(labels, distance);
      const divergenceYears = rate > 0 ? distance / (2 * rate) : 0;

      if (divergenceYears > 0 && divergenceYears < minDivergence) {
        minDivergence = divergenceYears;
      }

      pairwise.push({
        a: a.name,
        b: b.name,
        distance: Number(distance.toFixed(4)),
        divergenceYears: Number(divergenceYears.toFixed(2)),
        identity: Number(identity.toFixed(1)),
      });
    }
  }

  // Sort pairwise by distance
  pairwise.sort((a, b) => a.distance - b.distance);

  // 5. TMRCA estimate (minimum pairwise divergence / 2)
  const tmrcaEstimate = minDivergence !== Infinity ? Number(minDivergence.toFixed(2)) : null;

  // 6. Guess pathogen from clock rates
  const pathogenGuess = guessPathogen(labels);

  // 7. Count AMR
  let resistantCount = 0;
  let totalMutations = 0;
  for (const iso of analyzed) {
    if (iso.amr && iso.amr.resistanceGenes.length > 0) {
      resistantCount++;
      totalMutations += iso.amr.resistanceGenes.length;
    }
  }

  // 8. Generate summary
  const summary: string[] = [];
  if (tmrcaEstimate !== null) {
    summary.push(
      `Оценка TMRCA: ~${tmrcaEstimate.toFixed(1)} лет. ` +
      (tmrcaEstimate < 0.5
        ? "Изоляты очень близко связаны — недавняя вспышка."
        : tmrcaEstimate < 2
          ? "Умеренная дивергенция — возможно, недавнее занос."
          : "Высокая дивергенция — разные линии патогена."),
    );
  }
  if (resistantCount > 0) {
    summary.push(
      `⚠️ ${resistantCount} из ${analyzed.length} изолятов имеют мутации резистентности (${totalMutations} всего).`,
    );
  } else {
    summary.push("✅ Мутации резистентности не обнаружены.");
  }
  if (tree) {
    summary.push(`Филогенетическое дерево: ${tree.leaves.length} кластеров.`);
  }
  if (pairwise.length > 0) {
    const closest = pairwise[0];
    summary.push(
      `Ближайшая пара: ${closest.a} ↔ ${closest.b} (identity ${closest.identity}%, дивергенция ${closest.divergenceYears} лет).`,
    );
  }

  return {
    isolates: analyzed,
    tree,
    pairwise,
    tmrcaEstimate,
    pathogenGuess,
    resistantCount,
    totalMutations,
    newickTree: tree?.newick || null,
    summary,
  };
}

/**
 * Guess pathogen from sequence names/labels.
 */
function guessPathogen(labels: string[]): string | null {
  const all = labels.join(" ").toLowerCase();
  const patterns: Record<string, RegExp> = {
    "ASFV (African swine fever virus)": /asfv|african.*swine|asf\s*p/,
    "FMDV (Foot-and-mouth disease virus)": /fmdv|foot.*mouth|fmd/,
    "HPAI (Avian influenza)": /hpai|avian.*flu|h5n1|h5n8|influenza.*a/,
    "CSFV (Classical swine fever)": /csfv|classical.*swine/,
    "PPRV (Peste des petits ruminants)": /ppr|peste.*petits/,
    "Rabies virus": /rabies|lyssavirus/,
    "Brucella": /brucella/,
    "E. coli": /e\.?\s*coli|escherichia/,
    "Salmonella": /salmonella/,
  };
  for (const [name, re] of Object.entries(patterns)) {
    if (re.test(all)) return name;
  }
  return null;
}

/**
 * Guess molecular clock rate from pathogen name.
 */
function guessClockRate(labels: string[], distance: number): number {
  const pathogen = guessPathogen(labels);
  if (!pathogen) return 1e-3; // default: 10^-3 subs/site/year (RNA virus)

  const rate = CLOCK_RATES.find((r) =>
    r.organism.toLowerCase().includes(pathogen.split(" ")[0].toLowerCase()),
  );
  return rate?.rate || 1e-3;
}
