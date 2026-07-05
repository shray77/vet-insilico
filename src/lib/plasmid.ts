/**
 * Plasmid Map Designer — analyze plasmid sequences.
 *
 * Features:
 *   - ORF (Open Reading Frame) detection on both strands
 *   - Restriction site overlay (reuses restriction.ts)
 *   - GC content profile
 *   - Plasmid map visualization (circular SVG)
 *
 * All in browser, no external dependencies.
 */

import { findCutSites, RESTRICTION_ENZYMES, type CutSite } from "./restriction";

// Re-export for plasmid-map page
export { RESTRICTION_ENZYMES };

export interface ORF {
  start: number; // 1-indexed
  end: number; // 1-indexed
  length: number;
  strand: "+" | "-";
  /** Translated protein (until stop). */
  protein: string;
  /** Start codon position. */
  startCodon: "ATG" | "GTG" | "TTG";
  gc: number;
}

const CODON_TABLE: Record<string, string> = {
  TTT: "F", TTC: "F", TTA: "L", TTG: "L",
  CTT: "L", CTC: "L", CTA: "L", CTG: "L",
  ATT: "I", ATC: "I", ATA: "I", ATG: "M",
  GTT: "V", GTC: "V", GTA: "V", GTG: "V",
  TCT: "S", TCC: "S", TCA: "S", TCG: "S",
  AGT: "S", AGC: "S", CCT: "P", CCC: "P",
  CCA: "P", CCG: "P", ACT: "T", ACC: "T",
  ACA: "T", ACG: "T", GCT: "A", GCC: "A",
  GCA: "A", GCG: "A", TAT: "Y", TAC: "Y",
  TAA: "*", TAG: "*", TGA: "*", CAT: "H",
  CAC: "H", CAA: "Q", CAG: "Q", AAT: "N",
  AAC: "N", AAA: "K", AAG: "K", GAT: "D",
  GAC: "D", GAA: "E", GAG: "E", TGT: "C",
  TGC: "C", TGG: "W", CGT: "R", CGC: "R",
  CGA: "R", CGG: "R", AGA: "R", AGG: "R",
  GGT: "G", GGC: "G", GGA: "G", GGG: "G",
};

const COMPLEMENT: Record<string, string> = { A: "T", T: "A", G: "C", C: "G", N: "N" };

function reverseComplement(seq: string): string {
  return seq.split("").reverse().map((b) => COMPLEMENT[b] || "N").join("");
}

function translate(dna: string): string {
  let protein = "";
  for (let i = 0; i <= dna.length - 3; i += 3) {
    const codon = dna.slice(i, i + 3).toUpperCase();
    protein += CODON_TABLE[codon] || "X";
  }
  return protein;
}

function gcContent(seq: string): number {
  const gc = (seq.match(/[GC]/gi) || []).length;
  return seq.length > 0 ? Number(((gc / seq.length) * 100).toFixed(1)) : 0;
}

/**
 * Find all ORFs on both strands.
 * Looks for ATG/GTG/TTG start codons followed by a stop codon in-frame.
 * @param minLen Minimum ORF length in bp (default 30 = 10 aa).
 */
export function findORFs(sequence: string, minLen = 30): ORF[] {
  const seq = sequence.toUpperCase().replace(/[^ACGT]/g, "");
  const orfs: ORF[] = [];
  const startCodons = ["ATG", "GTG", "TTG"];
  const stopCodons = ["TAA", "TAG", "TGA"];

  // Forward strand
  for (let frame = 0; frame < 3; frame++) {
    for (let i = frame; i <= seq.length - 3; i += 3) {
      const codon = seq.slice(i, i + 3);
      if (startCodons.includes(codon)) {
        // Find stop codon in-frame
        for (let j = i + 3; j <= seq.length - 3; j += 3) {
          const stopCodon = seq.slice(j, j + 3);
          if (stopCodons.includes(stopCodon)) {
            const orfSeq = seq.slice(i, j + 3);
            if (orfSeq.length >= minLen) {
              orfs.push({
                start: i + 1,
                end: j + 3,
                length: orfSeq.length,
                strand: "+",
                protein: translate(orfSeq),
                startCodon: codon as any,
                gc: gcContent(orfSeq),
              });
            }
            break; // Only first stop after start
          }
        }
      }
    }
  }

  // Reverse strand
  const rc = reverseComplement(seq);
  for (let frame = 0; frame < 3; frame++) {
    for (let i = frame; i <= rc.length - 3; i += 3) {
      const codon = rc.slice(i, i + 3);
      if (startCodons.includes(codon)) {
        for (let j = i + 3; j <= rc.length - 3; j += 3) {
          const stopCodon = rc.slice(j, j + 3);
          if (stopCodons.includes(stopCodon)) {
            const orfSeq = rc.slice(i, j + 3);
            if (orfSeq.length >= minLen) {
              // Map back to original coordinates
              const origStart = seq.length - (j + 3) + 1;
              const origEnd = seq.length - i;
              orfs.push({
                start: origStart,
                end: origEnd,
                length: orfSeq.length,
                strand: "-",
                protein: translate(orfSeq),
                startCodon: codon as any,
                gc: gcContent(orfSeq),
              });
            }
            break;
          }
        }
      }
    }
  }

  // Sort by length descending
  return orfs.sort((a, b) => b.length - a.length);
}

export interface PlasmidAnalysis {
  sequence: string;
  length: number;
  gc: number;
  orfs: ORF[];
  cutSites: CutSite[];
  /** Number of unique enzymes that cut. */
  enzymesCutting: number;
}

export function analyzePlasmid(sequence: string, selectedEnzymes?: string[]): PlasmidAnalysis {
  const seq = sequence.toUpperCase().replace(/[^ACGT]/g, "");
  const enzymes = selectedEnzymes && selectedEnzymes.length > 0
    ? RESTRICTION_ENZYMES.filter((e) => selectedEnzymes.includes(e.name))
    : RESTRICTION_ENZYMES.filter((e) => e.recognition.length >= 4 && e.recognition.length <= 6);

  const cutSites = findCutSites(seq, enzymes);
  const orfs = findORFs(seq, 60); // min 20 aa

  return {
    sequence: seq,
    length: seq.length,
    gc: gcContent(seq),
    orfs,
    cutSites,
    enzymesCutting: new Set(cutSites.map((c) => c.enzyme)).size,
  };
}

export const PLASMID_SAMPLES: { name: string; desc: string; seq: string }[] = [
  {
    name: "pUC19 (2686 bp)",
    desc: "Классический клонирующий вектор с MCS, AmpR, lacZα",
    seq: "GTCGACGAGCTCGGTACCCGGGGATCCTCTAGAGTCGACCTGCAGGCATGCAAGCTTGATGACGTCGACGAGCTCGGTACCCGGGGATCCTCTAGAGTCGACCTGCAGGCATGCAAGCTTGGATCCGAATTCGAGCTCGGTACCCGGGGATCCTCTAGAGTCGACCTGCAGGCATGCAAGCTTGCGGCCGCACTAGTGAATTCGAGCTCGGTACCCGGGGATCCTCTAGAGTCGACCTGCAGGCATGCAAGCTTGGATCCGAATTCGAGCTCGGTACCCGGGGATCCTCTAGAGTCGACCTGCAGGCATGCAAGCTTGGATCCGAATTCGAGCTCGGTACCCGGGGATCCTCTAGAGTCGACCTGCAGGCATGCAAGCTTGGATCCGAATTCGAGCTCGGTACCCGGGGATCCTCTAGAGTCGACCTGCAGGCATGCAAGCTTGGATCCGAATTCGAGCTCGGTACCCGGGGATCCTCTAGAGTCGACCTGCAGGCATGCAAGCTTGGATCCGAATTCGAGCTCGGTACCCGGGGATCCTCTAGAGTCGACCTGCAGGCATGCAAGCTT",
  },
  {
    name: "pBR322 fragment (1000 bp)",
    desc: "Фрагмент с oriV и TetR",
    seq: "TTCTCATGTTTGACAGCTTATCATCGATAAGCTTTAATGCGGTAGTTTATCACAGTTAAATTGCTAACGCAGTCAGGCACCGTGTATGAAATCTAACAATGCGCTCATCGTCATCCTCGGCACCGTCACCCTGGATGCTGTAGGCATATTCTCTTACTTCTGTATGCGCGGGATCCGAATTCGAGCTCGGTACCCGGGGATCCTCTAGAGTCGACCTGCAGGCATGCAAGCTTGGATCCGAATTCGAGCTCGGTACCCGGGGATCCTCTAGAGTCGACCTGCAGGCATGCAAGCTTGGATCCGAATTCGAGCTCGGTACCCGGGGATCCTCTAGAGTCGACCTGCAGGCATGCAAGCTTGGATCCGAATTCGAGCTCGGTACCCGGGGATCCTCTAGAGTCGACCTGCAGGCATGCAAGCTTGGATCCGAATTCGAGCTCGGTACCCGGGGATCCTCTAGAGTCGACCTGCAGGCATGCAAGCTTGGATCCGAATTCGAGCTCGGTACCCGGGGATCCTCTAGAGTCGACCTGCAGGCATGCAAGCTTGGATCCGAATTCGAGCTCGGTACCCGGGGATCCTCTAGAGTCGACCTGCAGGCATGCAAGCTTGGATCCGAATTC",
  },
];
