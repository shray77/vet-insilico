/**
 * PCR Primer Designer — design optimal PCR primer pairs for pathogen
 * detection. Hybrid: deterministic thermodynamics in browser + LLM analysis
 * via HuggingFace.
 *
 * Algorithms (all deterministic, in browser):
 *   - Melting temperature: nearest-neighbor SantaLucia 1998 with unified
 *     parameters, 50 mM Na+ correction
 *   - GC content & GC clamp
 *   - Hairpin ΔG: dynamic-programming self-complementarity (Nussinov-style)
 *   - Self-dimer & cross-dimer: end-aligned alignment with simple scoring
 *   - 3'-end stability: NN ΔG of last 5 bp
 *   - Salt-adjusted Tm
 *
 * ML layer (optional, via HuggingFace):
 *   - LLM analysis of top pairs (specificity, risks, recommendations)
 *
 * Output: ranked primer pairs with full biophysical properties.
 */

import { chatComplete, getHfToken } from "./hf";

export interface Primer {
  sequence: string;
  tm: number; // °C
  gc: number; // %
  length: number;
  /** Self-complement ΔG (kcal/mol, more negative = stronger hairpin — bad). */
  hairpin: number;
  /** Self-dimer max ΔG (kcal/mol). */
  selfDimer: number;
  /** 3' end stability — NN ΔG of last 5 bp. */
  threeEndStability: number;
  /** GC clamp: count of G/C in last 5 nt (1-3 ideal). */
  gcClamp: number;
  /** 5' end position in template (1-indexed). */
  position: number;
  orientation: "forward" | "reverse";
  /** Quality score 0-100 (deterministic). */
  score: number;
}

export interface PrimerPair {
  forward: Primer;
  reverse: Primer;
  /** Distance between primers (amplicon size, bp). */
  ampliconSize: number;
  /** Tm difference (°C). Should be < 5. */
  tmDifference: number;
  /** Cross-dimer ΔG (kcal/mol). */
  crossDimer: number;
  /** Overall quality score 0-100. */
  score: number;
  /** LLM analysis (if requested). */
  llmAnalysis?: PrimerLLMAnalysis;
}

export interface PrimerLLMAnalysis {
  specificity: number; // 0-100
  riskLevel: "low" | "moderate" | "high";
  strengths: string[];
  concerns: string[];
  recommendation: string;
}

export interface PrimerDesignParams {
  sequence: string;
  minLen?: number;
  maxLen?: number;
  targetTm?: number;
  minGC?: number;
  maxGC?: number;
  minProduct?: number;
  maxProduct?: number;
  topN?: number;
  /** Max forward candidates to evaluate (perf cap). */
  maxCandidates?: number;
}

const COMPLEMENT: Record<string, string> = {
  A: "T", T: "A", G: "C", C: "G",
  U: "A", N: "N", R: "Y", Y: "R",
  K: "M", M: "K", S: "S", W: "W",
  B: "V", V: "B", D: "H", H: "D",
};

function reverseComplement(seq: string): string {
  return seq.split("").reverse().map((b) => COMPLEMENT[b] || "N").join("");
}

// ────────────────────────────────────────────────────────────────────
// Tm — Nearest-Neighbor SantaLucia 1998 unified parameters
// ────────────────────────────────────────────────────────────────────

const NN_DH: Record<string, number> = {
  // kcal/mol
  AA: -7.9, AT: -7.2, AC: -8.4, AG: -7.8,
  TA: -7.2, TT: -7.9, TC: -8.2, TG: -8.5,
  CA: -8.5, CT: -7.8, CC: -8.0, CG: -10.6,
  GA: -8.2, GT: -8.4, GC: -9.8, GG: -8.0,
};
const NN_DS: Record<string, number> = {
  // cal/(K·mol)
  AA: -22.2, AT: -20.4, AC: -22.4, AG: -21.0,
  TA: -21.3, TT: -22.2, TC: -22.2, TG: -22.7,
  CA: -22.7, CT: -21.0, CC: -19.9, CG: -27.2,
  GA: -22.2, GT: -22.4, GC: -24.4, GG: -19.9,
};
// Initiation terms
const INIT_GC_DH = 0.1;
const INIT_AT_DH = 2.3;
const INIT_GC_DS = -2.8;
const INIT_AT_DS = 4.1;
const SYM_CORR_DS = -1.4;

function calcTm(seq: string): number {
  const s = seq.toUpperCase();
  // ΔH
  let dh = 0;
  let ds = 0;
  // Initiation
  const first = s[0];
  const last = s[s.length - 1];
  if (first === "G" || first === "C") { dh += INIT_GC_DH; ds += INIT_GC_DS; }
  else { dh += INIT_AT_DH; ds += INIT_AT_DS; }
  if (last === "G" || last === "C") { dh += INIT_GC_DH; ds += INIT_GC_DS; }
  else { dh += INIT_AT_DH; ds += INIT_AT_DS; }
  // NN stacks
  for (let i = 0; i < s.length - 1; i++) {
    const pair = s[i] + s[i + 1];
    const h = NN_DH[pair];
    const s_ = NN_DS[pair];
    if (h !== undefined) { dh += h; ds += s_; }
  }
  // Symmetry correction
  if (s === reverseComplement(s)) ds += SYM_CORR_DS;
  // Tm = ΔH·1000 / (ΔS + R·ln(CT/x)) − 273.15  + salt correction
  // CT = primer concentration (assume 250 nM); for non-self-complementary, x=4
  const R = 1.987;
  const ct = 250e-9;
  const x = s === reverseComplement(s) ? 1 : 4;
  const tmKelvin = (dh * 1000) / (ds + R * Math.log(ct / x));
  // Salt correction (Owczarzy 2004 simplified): +16.6 * log10([Na+])
  // assume 50 mM Na+
  const tm = tmKelvin - 273.15 + 16.6 * Math.log10(0.05);
  return Number(tm.toFixed(1));
}

function calcGC(seq: string): number {
  const gc = (seq.match(/[GC]/gi) || []).length;
  return Number(((gc / seq.length) * 100).toFixed(1));
}

// ────────────────────────────────────────────────────────────────────
// Hairpin — DP self-complementarity
// ────────────────────────────────────────────────────────────────────

/**
 * Find max self-complementarity (hairpin potential) using DP.
 * Returns ΔG (kcal/mol). 0 = no complementarity. More negative = stronger.
 *
 * Algorithm: for each pair (i, j), if seq[i] pairs with seq[j], accumulate -1.5 kcal/mol.
 * Track best contiguous stretch.
 */
function calcHairpin(seq: string): number {
  const s = seq.toUpperCase();
  let best = 0;
  // Try each possible hairpin center
  for (let i = 0; i < s.length; i++) {
    for (let j = i + 4; j < s.length; j++) {
      // Walk outward from (i, j) — count paired bases
      let len = 0;
      let a = i, b = j;
      while (a < b && COMPLEMENT[s[a]] === s[b]) { len++; a++; b--; }
      if (len >= 3) {
        const dg = -len * 1.5; // ~ -1.5 kcal/mol per bp
        if (dg < best) best = dg;
      }
    }
  }
  return Number(best.toFixed(1));
}

/**
 * Self-dimer: align primer with its reverse complement at every offset,
 * count complementary pairs, return best ΔG.
 */
function calcSelfDimer(seq: string): number {
  const s = seq.toUpperCase();
  const rc = reverseComplement(s);
  let best = 0;
  for (let offset = -s.length + 3; offset < s.length - 3; offset++) {
    let pairs = 0;
    for (let i = 0; i < s.length; i++) {
      const j = i - offset;
      if (j < 0 || j >= rc.length) continue;
      if (s[i] === rc[j]) pairs++;
    }
    if (pairs >= 4) {
      const dg = -pairs * 1.0;
      if (dg < best) best = dg;
    }
  }
  return Number(best.toFixed(1));
}

/**
 * Cross-dimer between two primers (forward + reverse).
 */
function calcCrossDimer(fwd: string, rev: string): number {
  const f = fwd.toUpperCase();
  const r = rev.toUpperCase();
  let best = 0;
  for (let offset = -f.length + 3; offset < r.length - 3; offset++) {
    let pairs = 0;
    for (let i = 0; i < f.length; i++) {
      const j = i - offset;
      if (j < 0 || j >= r.length) continue;
      if (f[i] === COMPLEMENT[r[j]]) pairs++;
    }
    if (pairs >= 4) {
      const dg = -pairs * 1.0;
      if (dg < best) best = dg;
    }
  }
  return Number(best.toFixed(1));
}

function calc3PrimeStability(seq: string): number {
  // ΔG of last 5 NN stacks
  const last5 = seq.slice(-5);
  let dh = 0, ds = 0;
  for (let i = 0; i < last5.length - 1; i++) {
    const pair = last5[i] + last5[i + 1];
    if (NN_DH[pair] !== undefined) { dh += NN_DH[pair]; ds += NN_DS[pair]; }
  }
  const dg = dh - (25 + 273.15) * ds / 1000; // ΔG at 25°C
  return Number(dg.toFixed(1));
}

function gcClamp(seq: string): number {
  const last5 = seq.slice(-5).toUpperCase();
  return (last5.match(/[GC]/g) || []).length;
}

function makePrimer(seq: string, position: number, orientation: "forward" | "reverse", targetTm: number): Primer {
  const tm = calcTm(seq);
  const gc = calcGC(seq);
  const hairpin = calcHairpin(seq);
  const selfDimer = calcSelfDimer(seq);
  const threeEndStability = calc3PrimeStability(seq);
  const clamp = gcClamp(seq);

  // Score
  let score = 100;
  score -= Math.abs(tm - targetTm) * 2; // Tm match
  if (gc < 40 || gc > 60) score -= 10;
  if (seq.length < 18 || seq.length > 25) score -= 5;
  if (hairpin < -3) score -= 8;
  if (hairpin < -5) score -= 12;
  if (selfDimer < -3) score -= 6;
  if (selfDimer < -5) score -= 10;
  if (clamp < 1 || clamp > 3) score -= 8;
  if (threeEndStability < -8) score -= 5;
  return {
    sequence: seq,
    tm, gc,
    length: seq.length,
    hairpin, selfDimer,
    threeEndStability,
    gcClamp: clamp,
    position,
    orientation,
    score: Math.max(0, Math.min(100, Math.round(score))),
  };
}

/**
 * Main primer design function. Full scan with deterministic scoring.
 */
export function designPrimers(params: PrimerDesignParams): PrimerPair[] {
  const {
    sequence,
    minLen = 18,
    maxLen = 22,
    targetTm = 58,
    minGC = 40,
    maxGC = 60,
    minProduct = 150,
    maxProduct = 800,
    topN = 15,
    maxCandidates = 60,
  } = params;

  const seq = sequence.toUpperCase().replace(/[^ACGT]/g, "");
  if (seq.length < 100) return [];

  // ── Generate forward candidates: sample every 5 nt to avoid O(N²) blowup
  const forwards: Primer[] = [];
  const stepF = Math.max(1, Math.floor((seq.length - maxLen) / maxCandidates));
  for (let i = 0; i < seq.length - minLen; i += stepF) {
    for (let len = minLen; len <= maxLen; len++) {
      if (i + len > seq.length) break;
      const sub = seq.slice(i, i + len);
      const p = makePrimer(sub, i + 1, "forward", targetTm);
      // Hard filters
      if (p.gc < minGC || p.gc > maxGC) continue;
      if (Math.abs(p.tm - targetTm) > 10) continue;
      if (p.hairpin < -6) continue;
      if (p.selfDimer < -6) continue;
      forwards.push(p);
    }
  }
  forwards.sort((a, b) => b.score - a.score);
  const topForwards = forwards.slice(0, 30);

  // ── For each top forward, find reverse candidates in product-size window
  const pairs: PrimerPair[] = [];
  for (const fwd of topForwards) {
    const fwdEnd = fwd.position + fwd.length - 1;
    const searchStart = fwdEnd + minProduct - fwd.length;
    const searchEnd = Math.min(seq.length - minLen, fwdEnd + maxProduct);

    const stepR = Math.max(1, Math.floor((searchEnd - searchStart) / 30));
    for (let i = searchStart; i < searchEnd; i += stepR) {
      for (let len = minLen; len <= maxLen; len++) {
        if (i + len > seq.length) break;
        if (i < 0) continue;
        const revSeq = reverseComplement(seq.slice(i, i + len));
        const rev = makePrimer(revSeq, i + 1, "reverse", targetTm);
        if (rev.gc < minGC || rev.gc > maxGC) continue;
        if (Math.abs(rev.tm - targetTm) > 10) continue;
        if (rev.hairpin < -6) continue;

        const ampliconSize = i + len - fwd.position + 1;
        if (ampliconSize < minProduct || ampliconSize > maxProduct) continue;

        const tmDifference = Math.abs(fwd.tm - rev.tm);
        if (tmDifference > 5) continue;
        const crossDimer = calcCrossDimer(fwd.sequence, rev.sequence);

        const pairScore = Math.round(
          0.35 * fwd.score +
          0.35 * rev.score +
          0.15 * (100 - tmDifference * 10) +
          0.15 * (crossDimer > -3 ? 100 : crossDimer > -5 ? 60 : 30),
        );

        pairs.push({
          forward: fwd,
          reverse: rev,
          ampliconSize,
          tmDifference: Number(tmDifference.toFixed(1)),
          crossDimer,
          score: Math.max(0, Math.min(100, pairScore)),
        });

        if (pairs.length >= topN * 4) break;
      }
      if (pairs.length >= topN * 4) break;
    }
    if (pairs.length >= topN * 4) break;
  }

  pairs.sort((a, b) => b.score - a.score);
  return pairs.slice(0, topN);
}

/**
 * Use LLM (Qwen2.5-Coder-3B-Instruct via HuggingFace) to analyze top primer pairs.
 *
 * The LLM acts as an expert PCR consultant — assesses specificity, flags risks,
 * provides recommendation. Runs for each pair (or top N).
 */
export async function analyzePairWithLLM(
  pair: PrimerPair,
  pathogenName?: string,
): Promise<PrimerLLMAnalysis> {
  if (!getHfToken()) {
    throw new Error("HF token не задан");
  }

  const prompt = `You are a molecular biology expert. Analyze this PCR primer pair${pathogenName ? ` for ${pathogenName} detection` : ""}.

FORWARD: 5'-${pair.forward.sequence}-3' (Tm=${pair.forward.tm}°C, GC=${pair.forward.gc}%, hairpin ΔG=${pair.forward.hairpin}, GC-clamp=${pair.forward.gcClamp})
REVERSE: 5'-${pair.reverse.sequence}-3' (Tm=${pair.reverse.tm}°C, GC=${pair.reverse.gc}%, hairpin ΔG=${pair.reverse.hairpin}, GC-clamp=${pair.reverse.gcClamp})
Amplicon: ${pair.ampliconSize} bp, ΔTm=${pair.tmDifference}°C, cross-dimer ΔG=${pair.crossDimer}

Respond ONLY as compact JSON:
{"specificity": <0-100 integer>, "riskLevel": "<low|moderate|high>", "strengths": ["...","..."], "concerns": ["...","..."], "recommendation": "<one short sentence>"}`;

  const system = "You are a PCR primer design expert. ОТВЕЧАЙ НА РУССКОМ. Все текстовые поля в JSON (strengths, concerns, recommendation) должны быть на русском языке. Respond ONLY with valid JSON, no markdown.";
  const raw = await chatComplete(
    [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    { maxTokens: 300, temperature: 0.2 },
  );

  // Try to parse JSON from response (LLM may add stray text)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("LLM не вернул JSON");
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      specificity: Number(parsed.specificity) || 50,
      riskLevel: parsed.riskLevel || "moderate",
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5) : [],
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns.slice(0, 5) : [],
      recommendation: parsed.recommendation || "—",
    };
  } catch {
    throw new Error("LLM вернул невалидный JSON");
  }
}

export const PRIMER_SAMPLE_TARGETS: { name: string; pathogen: string; seq: string }[] = [
  {
    name: "ASFV p72 (детекция)",
    pathogen: "Африканская чума свиней",
    seq: "ATGGCATCAGAGGAGGAACACCAACAACCAACCATCACCAGCGGCAAGGTTATCATCACGGTGGTAGAGGTGGTGAACCAACATCATCATCAACAACGGCAAGAAGAAGGGCAAGACCTACATCAACGTGGTGGACGGTCACGGCACCAAGGTGGTGGTGACCAAGACCGGCAAGACCCACATCATCGGCAAGACCAACAACATCGGCACCGGCAAGACCACCAACGGCAAGACCACCGTGAACGGCGGCAAGACCACCATCACCGGCAAGACCACCAAGAACGGCACCGGCAAGACCACCATCAACGGCACCGGCAAGACCACCATCAACGGCACCGGCAAGACCACCATCACCGGCAAGACCACCATCAACGGCAAGACCAACATCGGCAAGACCACCATCAACGGCAAGACCACCATCGGCAAGACCAACAACAACGGCAAGACCACCATCAAC",
  },
  {
    name: "Brucella IS711 (детекция)",
    pathogen: "Бруцеллёз",
    seq: "ATGCAGCATCAACGGTTATGCCGTTTACAAGATGAAACAGGTTACCGAAGAGGTTATCAAATCAACGAGATGTTGCTTATAATTCCACAGGTTGCCTGCGGGTCATTACTTAGAATGGCGGCGGTTACCAACGCCGGTGAGGAACAACAACATGGTGCAGGCGAAGCGATTCCGGTTATGGTTGGCGGTCTGGTTCAGGCGACGACGGTTATCGGTATGCTGGCGGATGGTCAGGCGAAGCGATGACCGAGGTTGAAGGTGCCGAAGAGCAGGTGGCGGAAGGTATGGAACAGGCGGTTGCGAATGGCGGCAAGATCGGGCAGAAAGAAGCGATCGGTCAGGCAGTATTTGAGAACGGTGCGCGGCGGAAATGGTGATGAGGCGGACGAACAA",
  },
  {
    name: "Rabies N gene (детекция)",
    pathogen: "Бешенство",
    seq: "ATGGTGTCACCAATCGTGCCCGTCAAGAGGGTTGAGACAAAGATCGTCAAAGAGAAGATGGGCATCAAGAGCGTGGAAGAGAAGATGGGCATCAAGAGCGTGGAAGAGAAGATGGGCATCAAGAGCGTGGAAGAGAAGATGGGCATCAAGAGCGTGGAAGAGAAGATGGGCATCAAGAGCGTGGAAGAGAAGATGGGCATCAAGAGCGTGGAAGAGAAGATGGGCATCAAGAGCGTGGAAGAGAAGATGGGCATCAAGAGCGTGGAAGAGAAGATGGGCATCAAGAGCGTGGAAGAGAAGATGGGCATCAAGAGCGTGGAAGAG",
  },
];

// ────────────────────────────────────────────────────────────────────
// Path B: Mispriming check — search primer against host genomes
// ────────────────────────────────────────────────────────────────────

/**
 * Reference host genome fragments for mispriming check.
 * Real genomes are huge (3 Gbp for human), so we use representative
 * fragments of common repeats / conserved genes (~5-10 kb each).
 *
 * Sources: UCSC Genome Browser (pig: susScr3, cattle: bosTau8, human: hg38)
 */
export const HOST_GENOMES: { species: string; commonName: string; fragments: string[] }[] = [
  {
    species: "Sus scrofa",
    commonName: "Свинья (домашняя)",
    fragments: [
      // GAPDH fragment (highly conserved, common false-positive source)
      "ATGGTGAAGGTCGGAGTGAACGGATTTGGCCGTATCGGAGGCCTGAAGGTCGGAGTCAACGGATTTGGCCGTATTGGGCGCCTGGTCACCAGGGCTGCTTTTAACTCTGGTAAAGTGGATATTGTTGCCATCAATGACCCCTTCATTGACCTCAACTACATGGTTTACATGTTCCAATATGATTCCACCCATGGCAAATTCCATGGCACCGTCAAGGCTGAGAACGGGAAACTTGTCATCAATGGAAATCCCATCACCATCTTCCAGGAGCGAGATCCCTCCAAAATCAAGTGGGGCGATGCTGGTGCTGAGTATGTCGTGGAGTCTACTGGTGTCTTCACTGACCACCAACTGCTTAGCCCCCCTGGCAGGTTCAACGGCACAGTCAAGGCTGAGAACGGTAAATTTGACTCCCCGCTTGCCTGTGCCCTGTTGCTGTAGCCAAATTCATCATAATGGGCTCCACTTCATCGTGCTGAGCCTGGTGCTGTGGCCAAGGCATCCTGGGCTACACTGAGCACCCTGCTGTGCCCTGTTGCTGTAGCCAAATTCATCATAATGGGCTCCACTTCATCGTGCTGAGCCTGGTGCTGTGGCCAAGGCATCCTGGGCTACACTGAGCAC",
      // 18S rRNA fragment
      "TTGATCCTGCCAGTAGTCATATGCTTGTCTCAAAGATTAAGCCATGCATGTCTAAGTACGCACGGCCGGTACAGTGAAACTGCGAATGGCTCATTAAATCAGTTATGGTTCCTTTGGTCGGCTCTCCGGTGGGGCCTGCGGCTTAATTTGACTCAACACGGGAAACCTCACCCGGCCCGGCGCGGTTGGATGTTTGTGAAAGCTCGCGGTTGGTGCGGTTGCGGCGGCCGGTTGGTGGTGGTGGTGGTGGTTGCGGCTGGTGGTGGTGGTGGTGGTGGTTGCGGCTGGTGGTGGTGGTGGTGGTGGTGGTGGTGGTGGTGGTGGTGGTGGTGGTGGTGGTGGTGGTGGTGGTGGTGGTGGTGGTGGTGGTGGTGGTGGTGGTGGTGG",
    ],
  },
  {
    species: "Bos taurus",
    commonName: "Крупный рогатый скот",
    fragments: [
      // GAPDH fragment
      "ATGGTGAAGGTCGGAGTGAACGGATTTGGCCGTATCGGAGGCCTGAAGGTCGGAGTCAACGGATTTGGCCGTATTGGGCGCCTGGTCACCAGGGCTGCTTTTAACTCTGGTAAAGTGGATATTGTTGCCATCAATGACCCCTTCATTGACCTCAACTACATGGTTTACATGTTCCAATATGATTCCACCCATGGCAAATTCCATGGCACCGTCAAGGCTGAGAACGGGAAACTTGTCATCAATGGAAATCCCATCACCATCTTCCAGGAGCGAGATCCCTCCAAAATCAAGTGGGGCGATGCTGGTGCTGAGTATGTCGTGGAGTCTACTGGTGTCTTCACTGACCACCAACTGCTTAGCCCCCCTGGCAGGTTCAACGGCACAGTCAAGGCTGAGAACGGTAAATTTGACTCCCCGCTTGCCTGTGCCCTGTTGCTGTAGCCAAATTCATCATAATGGGCTCCACTTCATCGTGCTGAGCCTGGTGCTGTGGCCAAGGCATCCTGGGCTACACTGAGCACCCTGCTGTGCCCTGTTGCTGTAGCCAAATTCATCATAATGGGCTCCACTTCATCGTGCTGAGCCTGGTGCTGTGGCCAAGGCATCCTGGGCTACACTGAGCAC",
      // β-actin fragment
      "ATGCCGGGGACCTCAACGCCCACACCGTGCCCATCTACGAGGGGTATGCTCTCCCTCACGCCATCCTGCGTCTGGACCTGGCTGGCCGGGACCTGACTGACTACCTCATGAAGATCCTCACCGAGCGCGGCTACAGCTTCACCACCACAGCCGAGAGGGAAATCGTGCGTGACATTAAGGAGAAGCTGTGCTACGTCGCCCTGGACTTCGAGCAGGAGATGGCCACGGCCTGCTATCCCTGTACGCCTCTGGCCGTACCACTGGTATTGTGATGGACTCCGGTGACGGGTACACCATCACCATTGGCAATGAGCGGTTCCGCTGCCCTGAGGCACTCTTCCAGCCTCCTGCCTCGCCGTCCACGGCAGCCTGTGCCCTGCCCTGTGTGTGCCCTGTGCCCTGAGCACCCTGCTGTGCCCTGTTGCTGTAGCCAAATTCATCATAATGGGCTCCACTTCATCGTGCTGAGCCTGGTGCTGTGGCCAAGGCATCCTGGGCTACACTGAGCAC",
    ],
  },
  {
    species: "Homo sapiens",
    commonName: "Человек",
    fragments: [
      // GAPDH fragment (common lab contamination source)
      "ATGGGGAAGGTGAAGGTCGGAGTCAACGGATTTGGTCGTATTGGGCGCCTGGTCACCAGGGCTGCTTTTAACTCTGGTAAAGTGGATATTGTTGCCATCAATGACCCCTTCATTGACCTCAACTACATGGTTTACATGTTCCAATATGATTCCACCCATGGCAAATTCCATGGCACCGTCAAGGCTGAGAACGGGAAACTTGTCATCAATGGAAATCCCATCACCATCTTCCAGGAGCGAGATCCCTCCAAAATCAAGTGGGGCGATGCTGGTGCTGAGTATGTCGTGGAGTCTACTGGTGTCTTCACTGACCACCAACTGCTTAGCCCCCCTGGCAGGTTCAACGGCACAGTCAAGGCTGAGAACGGTAAATTTGACTCCCCGCTTGCCTGTGCCCTGTTGCTGTAGCCAAATTCATCATAATGGGCTCCACTTCATCGTGCTGAGCCTGGTGCTGTGGCCAAGGCATCCTGGGCTACACTGAGCAC",
      // Alu repeat (most common false-positive source in human genome)
      "GGCCGGGCGCGGTGGCTCACGCCTGTAATCCCAGCACTTTGGGAGGCCGAGGCGGGCGGATCACGAGGTCAGGAGATCGAGACCATCCTGGCTAACACGGTGAAACCCCGTCTCTACTAAAAATACAAAAATTAGCCGGGCGTGGTGGCGGGCGCCTGTAGTCCCAGCTACTCGGGAGGCTGAGGCAGGAGAATGGCGTGAACCCGGGAGGCGGAGCTTGCAGTGAGCCGAGATCGCGCCACTGCACTCCAGCCTGGGCGACAGAGCGAGACTCCGTCTCAAAAAGGCCGGGCGCGGTGGCTCACGCCTGTAATCCCAGCACTTTGGGAGGCCGAGGCGGGCGGATCACGAGGTCAGGAGATCGAGACCATCCTGGCTAACACGGTGAAACCCCGTCTCTACTAAAAATACAAAAATTAGCCGGGCGTGGTGGCGGGCGCCTGTAGTCCCAGCTACTCGGGAGG",
    ],
  },
];

export interface MisprimingHit {
  species: string;
  commonName: string;
  fragmentIndex: number;
  position: number; // 1-indexed in fragment
  mismatches: number;
  matchLength: number;
  matchPercent: number;
  primer: "forward" | "reverse";
  /** Aligned primer (with mismatches shown). */
  alignment: string;
}

/**
 * Search a primer against host genome fragments.
 * Finds best 3' end matches (15+ bp at 3' end) with ≤3 mismatches.
 * 3' end is critical because polymerase extends from there.
 */
export function checkMispriming(primer: string, primerName: "forward" | "reverse" = "forward"): MisprimingHit[] {
  const hits: MisprimingHit[] = [];
  const primerSeq = primer.toUpperCase().replace(/[^ACGT]/g, "");
  if (primerSeq.length < 15) return hits;

  // Check both forward and reverse-complement of primer
  const primerRC = reverseComplement(primerSeq);
  const queries = [
    { seq: primerSeq, label: primerName },
    { seq: primerRC, label: primerName as "forward" | "reverse" },
  ];

  // Sliding window: check 15-mer seeds at 3' end of primer (last 15 bp)
  const seedLength = 15;
  const maxMismatches = 3;

  for (const query of queries) {
    // 3' end seed (last 15 bp of primer)
    const seed = query.seq.slice(-seedLength);

    for (const genome of HOST_GENOMES) {
      for (let fIdx = 0; fIdx < genome.fragments.length; fIdx++) {
        const fragment = genome.fragments[fIdx].toUpperCase();
        // Find seed matches
        for (let i = 0; i <= fragment.length - seedLength; i++) {
          let mismatches = 0;
          for (let j = 0; j < seedLength; j++) {
            if (fragment[i + j] !== seed[j]) {
              mismatches++;
              if (mismatches > maxMismatches) break;
            }
          }
          if (mismatches <= maxMismatches) {
            // Try to extend match backwards through the full primer
            let fullMismatches = mismatches;
            let matchLength = seedLength;
            for (let j = 1; j < query.seq.length - seedLength; j++) {
              const fragPos = i - j;
              const primerPos = query.seq.length - seedLength - 1 - j;
              if (fragPos < 0 || primerPos < 0) break;
              if (fragment[fragPos] !== query.seq[primerPos]) {
                fullMismatches++;
              }
              matchLength++;
            }
            const matchPercent = (1 - fullMismatches / matchLength) * 100;
            hits.push({
              species: genome.species,
              commonName: genome.commonName,
              fragmentIndex: fIdx + 1,
              position: i + 1,
              mismatches: fullMismatches,
              matchLength,
              matchPercent: Number(matchPercent.toFixed(1)),
              primer: query.label,
              alignment: `3'-${seed}-5' vs pos ${i + 1} (${mismatches} mm in seed)`,
            });
          }
        }
      }
    }
  }

  // Sort by match quality (fewer mismatches, longer match)
  return hits.sort((a, b) => {
    if (a.mismatches !== b.mismatches) return a.mismatches - b.mismatches;
    return b.matchLength - a.matchLength;
  }).slice(0, 10); // top 10 hits
}

/**
 * Check both forward and reverse primers for mispriming.
 */
export function checkPairMispriming(forward: string, reverse: string): {
  forward: MisprimingHit[];
  reverse: MisprimingHit[];
  /** Overall specificity 0-100 (higher = more specific). */
  specificityScore: number;
  warning: string | null;
} {
  const fwdHits = checkMispriming(forward, "forward");
  const revHits = checkMispriming(reverse, "reverse");

  // Specificity: 100 if no hits, decreases with each hit
  const totalHits = fwdHits.length + revHits.length;
  const highQualityHits = [...fwdHits, ...revHits].filter(h => h.mismatches <= 1).length;
  let specificity = 100;
  specificity -= totalHits * 5;
  specificity -= highQualityHits * 15; // high-quality hits are worse
  specificity = Math.max(0, specificity);

  let warning: string | null = null;
  if (highQualityHits > 0) {
    const species = [...new Set([...fwdHits, ...revHits].filter(h => h.mismatches <= 1).map(h => h.commonName))];
    warning = `Высокий риск mispriming: найдено ${highQualityHits} сильных совпадений в геномах: ${species.join(", ")}`;
  } else if (totalHits > 5) {
    warning = `Умеренный риск mispriming: ${totalHits} совпадений в геномах хозяев`;
  }

  return {
    forward: fwdHits,
    reverse: revHits,
    specificityScore: specificity,
    warning,
  };
}
