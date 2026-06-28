/**
 * Restriction Map — find restriction enzyme cut sites in a DNA sequence.
 *
 * Database: 30+ common restriction enzymes (Type II) with recognition sequences
 * and cut positions. Includes common REBASE entries.
 *
 * Output: cut sites with positions, fragment sizes between cuts, virtual gel
 * electrophoresis simulation.
 *
 * All in browser, no external dependencies.
 */

export interface RestrictionEnzyme {
  name: string;
  /** Recognition sequence (5'→3'). May contain IUPAC codes. */
  recognition: string;
  /** Cut position on top strand (0-indexed offset from start of recognition). */
  cutTop: number;
  /** Cut position on bottom strand (0-indexed offset). If blunt, equals cutTop. */
  cutBottom: number;
  /** Type: blunt, 5'-overhang, 3'-overhang. */
  cutType: "blunt" | "5-overhang" | "3-overhang";
  /** Source organism. */
  source: string;
  /** Common supplier temperature. */
  tempC: number;
  /** Whether the recognition is palindromic. */
  palindromic: boolean;
}

export interface CutSite {
  enzyme: string;
  /** Position of recognition start (1-indexed). */
  position: number;
  /** Position of recognition end (inclusive, 1-indexed). */
  end: number;
  /** Top strand cut position (1-indexed). */
  topCut: number;
  /** Bottom strand cut position (1-indexed). */
  bottomCut: number;
  /** Recognition sequence found. */
  matchSeq: string;
  cutType: "blunt" | "5-overhang" | "3-overhang";
}

export interface RestrictionResult {
  sequence: string;
  length: number;
  cutSites: CutSite[];
  /** Fragment sizes when this enzyme cuts (sorted descending). */
  fragments: { enzyme: string; sizes: number[]; totalFragments: number }[];
  /** Per-enzyme summary. */
  perEnzyme: { enzyme: string; sites: number; fragments: number; largestFragment: number; smallestFragment: number }[];
}

// IUPAC nucleotide codes
const IUPAC: Record<string, string[]> = {
  A: ["A"], C: ["C"], G: ["G"], T: ["T"], U: ["T"],
  R: ["A", "G"], Y: ["C", "T"], S: ["G", "C"], W: ["A", "T"],
  K: ["G", "T"], M: ["A", "C"], B: ["C", "G", "T"],
  D: ["A", "G", "T"], H: ["A", "C", "T"], V: ["A", "C", "G"],
  N: ["A", "C", "G", "T"],
};

function matchesIUPAC(recognition: string, sequence: string): boolean {
  if (recognition.length !== sequence.length) return false;
  for (let i = 0; i < recognition.length; i++) {
    const allowed = IUPAC[recognition[i].toUpperCase()];
    if (!allowed || !allowed.includes(sequence[i].toUpperCase())) return false;
  }
  return true;
}

function reverseComplement(seq: string): string {
  const comp: Record<string, string> = { A: "T", T: "A", G: "C", C: "G", U: "A", N: "N" };
  return seq.split("").reverse().map((b) => comp[b] || "N").join("");
}

function isPalindromic(recognition: string): boolean {
  return recognition.toUpperCase() === reverseComplement(recognition.toUpperCase());
}

export const RESTRICTION_ENZYMES: RestrictionEnzyme[] = [
  // Common blunt cutters
  { name: "EcoRV", recognition: "GATATC", cutTop: 3, cutBottom: 3, cutType: "blunt", source: "E. coli", tempC: 37, palindromic: true },
  { name: "SmaI", recognition: "CCCGGG", cutTop: 3, cutBottom: 3, cutType: "blunt", source: "S. marcescens", tempC: 25, palindromic: true },
  { name: "HincII", recognition: "GTPyPuAC", cutTop: 4, cutBottom: 4, cutType: "blunt", source: "H. influenzae", tempC: 37, palindromic: true },
  { name: "PvuII", recognition: "CAGCTG", cutTop: 3, cutBottom: 3, cutType: "blunt", source: "P. vulgaris", tempC: 37, palindromic: true },
  { name: "AluI", recognition: "AGCT", cutTop: 2, cutBottom: 2, cutType: "blunt", source: "Arthrobacter luteus", tempC: 37, palindromic: true },
  { name: "HaeIII", recognition: "GGCC", cutTop: 2, cutBottom: 2, cutType: "blunt", source: "H. aegyptius", tempC: 37, palindromic: true },
  // Common sticky 5'-overhang cutters
  { name: "EcoRI", recognition: "GAATTC", cutTop: 1, cutBottom: 5, cutType: "5-overhang", source: "E. coli", tempC: 37, palindromic: true },
  { name: "BamHI", recognition: "GGATCC", cutTop: 1, cutBottom: 5, cutType: "5-overhang", source: "B. amyloliquefaciens", tempC: 37, palindromic: true },
  { name: "BglII", recognition: "AGATCT", cutTop: 1, cutBottom: 5, cutType: "5-overhang", source: "B. globigii", tempC: 37, palindromic: true },
  { name: "HindIII", recognition: "AAGCTT", cutTop: 1, cutBottom: 5, cutType: "5-overhang", source: "H. influenzae", tempC: 37, palindromic: true },
  { name: "NdeI", recognition: "CATATG", cutTop: 2, cutBottom: 4, cutType: "5-overhang", source: "N. denitrificans", tempC: 37, palindromic: true },
  { name: "XbaI", recognition: "TCTAGA", cutTop: 1, cutBottom: 5, cutType: "5-overhang", source: "X. badrii", tempC: 37, palindromic: true },
  { name: "SalI", recognition: "GTCGAC", cutTop: 1, cutBottom: 5, cutType: "5-overhang", source: "S. albus", tempC: 37, palindromic: true },
  { name: "XhoI", recognition: "CTCGAG", cutTop: 1, cutBottom: 5, cutType: "5-overhang", source: "X. holcicola", tempC: 37, palindromic: true },
  { name: "KpnI", recognition: "GGTACC", cutTop: 5, cutBottom: 1, cutType: "3-overhang", source: "K. pneumoniae", tempC: 37, palindromic: true },
  { name: "PstI", recognition: "CTGCAG", cutTop: 5, cutBottom: 1, cutType: "3-overhang", source: "P. stuartii", tempC: 37, palindromic: true },
  { name: "SphI", recognition: "GCATGC", cutTop: 5, cutBottom: 1, cutType: "3-overhang", source: "S. phaeochromogenes", tempC: 37, palindromic: true },
  // 4-cutters (frequent cutters)
  { name: "TaqI", recognition: "TCGA", cutTop: 1, cutBottom: 3, cutType: "5-overhang", source: "T. aquaticus", tempC: 65, palindromic: true },
  { name: "MboI", recognition: "GATC", cutTop: 0, cutBottom: 4, cutType: "5-overhang", source: "M. bovis", tempC: 37, palindromic: true },
  { name: "DpnI", recognition: "GATC", cutTop: 0, cutBottom: 0, cutType: "blunt", source: "D. pneumoniae", tempC: 37, palindromic: true }, // methylated
  { name: "HhaI", recognition: "GCGC", cutTop: 3, cutBottom: 1, cutType: "3-overhang", source: "H. haemolyticus", tempC: 37, palindromic: true },
  { name: "HpaII", recognition: "CCGG", cutTop: 1, cutBottom: 3, cutType: "5-overhang", source: "H. parainfluenzae", tempC: 37, palindromic: true },
  // 8-cutters (rare cutters)
  { name: "NotI", recognition: "GCGGCCGC", cutTop: 2, cutBottom: 6, cutType: "5-overhang", source: "N. otitidis", tempC: 37, palindromic: true },
  { name: "SfiI", recognition: "GGCCNNNNNGGCC", cutTop: 4, cutBottom: 8, cutType: "3-overhang", source: "S. fimbriatum", tempC: 50, palindromic: false },
  { name: "AscI", recognition: "GGCGCGCC", cutTop: 2, cutBottom: 6, cutType: "5-overhang", source: "A. species", tempC: 37, palindromic: true },
  // IUPAC recognition sequences
  { name: "HinfI", recognition: "GANTC", cutTop: 1, cutBottom: 4, cutType: "5-overhang", source: "H. influenzae", tempC: 37, palindromic: false },
  { name: "DdeI", recognition: "CTNAG", cutTop: 1, cutBottom: 4, cutType: "5-overhang", source: "D. desulfuricans", tempC: 37, palindromic: false },
  { name: "RsaI", recognition: "GTAC", cutTop: 2, cutBottom: 2, cutType: "blunt", source: "R. species", tempC: 37, palindromic: false },
];

/**
 * Find all cut sites for the given enzymes in a sequence.
 * For palindromic enzymes, only top strand is searched (matches cover both).
 * For non-palindromic, both orientations are searched.
 */
export function findCutSites(sequence: string, enzymes: RestrictionEnzyme[]): CutSite[] {
  const seq = sequence.toUpperCase().replace(/[^ACGTNRYKMSWBDHV]/g, "");
  const sites: CutSite[] = [];

  for (const enz of enzymes) {
    const rec = enz.recognition.toUpperCase();
    const recLen = rec.length;
    const revRec = reverseComplement(rec);

    for (let i = 0; i <= seq.length - recLen; i++) {
      const sub = seq.slice(i, i + recLen);
      if (matchesIUPAC(rec, sub) || (enz.palindromic === false && matchesIUPAC(revRec, sub))) {
        const isReverse = matchesIUPAC(revRec, sub) && !matchesIUPAC(rec, sub);
        // Compute actual cut positions on the original (top) strand
        const topCut = i + (isReverse ? (recLen - enz.cutBottom) : enz.cutTop) + 1;
        const bottomCut = i + (isReverse ? (recLen - enz.cutTop) : enz.cutBottom) + 1;
        sites.push({
          enzyme: enz.name,
          position: i + 1,
          end: i + recLen,
          topCut,
          bottomCut,
          matchSeq: sub,
          cutType: enz.cutType,
        });
      }
    }
  }

  return sites.sort((a, b) => a.position - b.position);
}

/**
 * Compute fragments produced by each enzyme's digest.
 */
export function computeFragments(sequence: string, enzymes: RestrictionEnzyme[]): RestrictionResult {
  const seq = sequence.toUpperCase().replace(/[^ACGTNRYKMSWBDHV]/g, "");
  const cutSites = findCutSites(seq, enzymes);

  const fragments: { enzyme: string; sizes: number[]; totalFragments: number }[] = [];
  const perEnzyme: { enzyme: string; sites: number; fragments: number; largestFragment: number; smallestFragment: number }[] = [];

  for (const enz of enzymes) {
    const enzSites = cutSites.filter((s) => s.enzyme === enz.name);
    if (enzSites.length === 0) continue;

    // Cut positions on top strand (sorted)
    const topCuts = enzSites.map((s) => s.topCut).sort((a, b) => a - b);
    const sizes: number[] = [];
    let prev = 0;
    for (const cut of topCuts) {
      sizes.push(cut - prev);
      prev = cut;
    }
    sizes.push(seq.length - prev);

    fragments.push({ enzyme: enz.name, sizes: sizes.sort((a, b) => b - a), totalFragments: sizes.length });
    perEnzyme.push({
      enzyme: enz.name,
      sites: enzSites.length,
      fragments: sizes.length,
      largestFragment: Math.max(...sizes),
      smallestFragment: Math.min(...sizes),
    });
  }

  return {
    sequence: seq,
    length: seq.length,
    cutSites,
    fragments,
    perEnzyme,
  };
}

/**
 * Get a list of "frequent cutters" (4-5 bp recognition) for a given sequence.
 */
export function getFrequentCutters(): RestrictionEnzyme[] {
  return RESTRICTION_ENZYMES.filter((e) => e.recognition.length <= 5);
}

export function getRareCutters(): RestrictionEnzyme[] {
  return RESTRICTION_ENZYMES.filter((e) => e.recognition.length >= 6);
}

export const RESTRICTION_SAMPLES: { name: string; pathogen: string; seq: string }[] = [
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
  {
    name: "pUC18 MCS (клонирование)",
    pathogen: "Вектор",
    seq: "AAGCTTGCATGCCTGCAGGTCGACGGATCCGAATTCGAGCTCGGTACCCGGGGATCCTCTAGAGTCGACCTGCAGGCATGCAAGCTT",
  },
];
