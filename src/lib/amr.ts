/**
 * Antimicrobial Resistance Predictor — predict resistance to antibiotics
 * from a bacterial protein/gene sequence.
 *
 * Hybrid approach (rule-based + ML scoring):
 *
 * 1. Rule-based: scan for known resistance motifs (point mutations, motifs)
 * 2. ML scoring: optional ESM-2 naturalness score — resistance mutations
 *    are typically less "natural" / less conserved in susceptible isolates
 * 3. Drug-class specific: different resistance mechanisms per class
 *
 * Sources of resistance rules:
 *   - CARD (Comprehensive Antibiotic Resistance Database) — point mutation
 *     contexts, ARO-акцессии выверены по онтологии card.mcmaster.ca (аудит SW-11
 *     2026-11-01: все 14 прежних акцессий были неверны — исправлены/удалены)
 *   - ResFinder point mutations
 *
 * Синтетические «мотивные подписи» генов (blaTEM/SHV/CTX-M, tetM, ermB,
 * aac(3)-IV, qnrA) удалены по аудиту SW-11: не соответствуют реальным
 * подписям CARD и содержат IUPAC-вырожденные коды.
 *
 * Output: per-drug-class resistance score, detected mutations, recommendation.
 *
 * NOT for clinical use — educational tool only.
 */

import type { Drug } from "@/data/drugs";

export interface ResistanceHit {
  drugClass: string;
  drugExamples: string[];
  /** Position in input sequence (1-indexed). */
  position: number;
  /** Wild-type residue. */
  wildType: string;
  /** Mutant residue found. */
  mutant: string;
  /** Resistance mechanism (RU). */
  mechanism: string;
  /** Confidence 0-100. */
  confidence: number;
  /** Source. */
  source: string;
}

export interface AMRResult {
  sequence: string;
  length: number;
  hits: ResistanceHit[];
  /** Per-class resistance score (0-100). */
  classScores: { drugClass: string; score: number; level: "susceptible" | "intermediate" | "resistant" }[];
  /** Overall resistance burden 0-100. */
  overallScore: number;
  /** Detected resistance genes (motif hits). */
  resistanceGenes: string[];
  /** Recommendation. */
  recommendation: string;
}

/**
 * Known resistance-conferring mutations and motifs.
 * Context-based detection: searches for pattern `motifBefore + [mutant] + motifAfter`
 * instead of relying on absolute position numbers (which only work for full-length reference genes).
 *
 * This is a simplified subset of CARD/ResFinder data — for educational purposes.
 */
const RESISTANCE_MUTATIONS: {
  drugClass: string;
  drugExamples: string[];
  gene: string;
  /** Reference position (for display). */
  position: number;
  wildType: string;
  mutants: string[];
  /** Conserved residues BEFORE the mutation site (used for context matching). */
  motifBefore: string;
  /** Conserved residues AFTER the mutation site. */
  motifAfter: string;
  mechanism: string;
  confidence: number;
  source: string;
}[] = [
  // Fluoroquinolone resistance — QRDR mutations in GyrA
  // E. coli GyrA QRDR sequence: ...AIVM-[S83]-DGIY-[D87]-ALHMG...
  // S83 context: motifBefore=VM, motifAfter=DG → pattern VM[S]DG (WT) / VM[L]DG (S83L)
  {
    drugClass: "Фторхинолоны",
    drugExamples: ["Энрофлоксацин", "Ципрофлоксацин", "Марбофлоксацин"],
    gene: "gyrA",
    position: 83,
    wildType: "S",
    mutants: ["L", "W", "A", "F"],
    motifBefore: "VM",
    motifAfter: "DG",
    mechanism: "Мутация S83 в QRDR GyrA снижает сродство фторхинолонов к ДНК-гиразе",
    confidence: 90,
    source: "CARD: ARO:3003292", // fluoroquinolone resistant gyrA (было ARO:3000062 — не существует)
  },
  // D87 context: motifBefore=IY, motifAfter=AL → pattern IY[D]AL (WT) / IY[N]AL (D87N)
  {
    drugClass: "Фторхинолоны",
    drugExamples: ["Энрофлоксацин", "Ципрофлоксацин", "Марбофлоксацин"],
    gene: "gyrA",
    position: 87,
    wildType: "D",
    mutants: ["N", "G", "Y", "A"],
    motifBefore: "IY",
    motifAfter: "AL",
    mechanism: "Мутация D87 в QRDR GyrA",
    confidence: 85,
    source: "CARD: ARO:3003292", // fluoroquinolone resistant gyrA (было ARO:3000062 — не существует)
  },
  // Rifampin resistance — RpoB RRDR (resistance determining region)
  // M. tuberculosis RpoB: ...Lys-Arg-Pro-[H526]-Leu-Asp-Val...
  {
    drugClass: "Рифамицины",
    drugExamples: ["Рифампицин"],
    gene: "rpoB",
    position: 526,
    wildType: "H",
    mutants: ["Y", "D", "L", "R"],
    motifBefore: "KRP",
    motifAfter: "LDV",
    mechanism: "Мутация H526 в RpoB RRDR снижает связывание рифампицина",
    confidence: 95,
    source: "CARD: ARO:3003283", // rpoB M. tuberculosis (было ARO:3000166 = tet(B))
  },
  // M. tuberculosis RpoB: ...Thr-[S531]-Phe-Leu...
  {
    drugClass: "Рифамицины",
    drugExamples: ["Рифампицин"],
    gene: "rpoB",
    position: 531,
    wildType: "S",
    mutants: ["L", "W", "F"],
    motifBefore: "TSA",
    motifAfter: "FLE",
    mechanism: "Мутация S531L в RpoB — частая причина резистентности M. tuberculosis",
    confidence: 95,
    source: "CARD: ARO:3003283", // rpoB M. tuberculosis (было ARO:3000166 = tet(B))
  },
  // β-lactam resistance — PBPs (S. pneumoniae PBP2x)
  // Active site: ...Ser-Asn-[T338]-Phe-Lys...
  {
    drugClass: "β-лактамы",
    drugExamples: ["Амоксициллин", "Ампициллин", "Цефалексин"],
    gene: "pbp2x",
    position: 338,
    wildType: "T",
    mutants: ["A", "G", "S"],
    motifBefore: "SNT",
    motifAfter: "FKG",
    mechanism: "Мутация T338 в PBP2x снижает связывание β-лактамов",
    confidence: 80,
    source: "CARD: ARO:3003043", // pbp2x S. pneumoniae (было ARO:3000051 — не существует)
  },
  // Macrolide resistance — 23S rRNA peptidyl transferase loop
  // E. coli 23S: ...G-[A2058]-G...
  // Note: 23S rRNA sequences use U instead of T
  {
    drugClass: "Макролиды",
    drugExamples: ["Эритромицин", "Тилозин", "Тулатромицин"],
    gene: "23S rRNA",
    position: 2058,
    wildType: "A",
    mutants: ["G", "C", "U"],
    motifBefore: "GCG",
    motifAfter: "GCG",
    mechanism: "Мутация A2058 в 23S rRNA снижает связывание макролидов с рибосомой",
    confidence: 88,
    source: "CARD: ARO:3004125", // 23S rRNA A2058 (было ARO:3000080 = aminonucleoside antibiotic)
  },
  // Tetracycline — ribosomal protection (TetM-like)
  {
    drugClass: "Тетрациклины",
    drugExamples: ["Доксициклин", "Окситетрациклин"],
    gene: "16S rRNA",
    position: 965,
    wildType: "G",
    mutants: ["A", "U"],
    motifBefore: "UACAC",
    motifAfter: "UGG",
    mechanism: "Мутация G965 в 16S rRNA снижает связывание тетрациклина",
    confidence: 75,
    source: "CARD: ARO:3003211", // 16S rRNA mutation (было ARO:3000070 — не существует)
  },
  // Aminoglycoside — 16S rRNA
  {
    drugClass: "Аминогликозиды",
    drugExamples: ["Гентамицин", "Стрептомицин"],
    gene: "16S rRNA",
    position: 1401,
    wildType: "C",
    mutants: ["T", "A", "G"],
    motifBefore: "GCGG",
    motifAfter: "ACAG",
    mechanism: "Точечная мутация C1401 в 16S rRNA снижает связывание аминогликозидов",
    confidence: 85,
    source: "CARD: ARO:3003211", // 16S rRNA mutation (было ARO:3000085; механизм «метилирование ArmA-like» — путаница: мутация ≠ метилирование)
  },
  // Sulfonamide — FolP mutations
  // S. Gallinarum FolP: ...Ile-[F28]-Pro-Val... (Int J Antimicrob Agents 2009+
  // — подтверждена замена F28L/I; было P28 с мутантами A/S/L — дикий тип расходился)
  {
    drugClass: "Сульфаниламиды",
    drugExamples: ["Сульфадиазин", "Сульфаметоксазол"],
    gene: "folP",
    position: 28,
    wildType: "F",
    mutants: ["L", "I"],
    motifBefore: "IYR",
    motifAfter: "PVA",
    mechanism: "Мутация F28 в FolP снижает сродство к сульфаниламидам",
    confidence: 78,
    source: "CARD: ARO:3003386", // folP (было ARO:3000090 = Bla1)
  },
];

function classify(score: number): "susceptible" | "intermediate" | "resistant" {
  if (score < 25) return "susceptible";
  if (score < 60) return "intermediate";
  return "resistant";
}

/**
 * Predict resistance from a protein/DNA sequence.
 * Sequence is expected to be a candidate resistance gene (e.g., GyrA, RpoB, PBP).
 *
 * Note: this is a simplified educational tool. Real AMR prediction uses
 * whole-genome sequencing + curated databases (CARD, ResFinder).
 */
export function predictAMR(sequence: string): AMRResult {
  const seq = sequence.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, "");
  const hits: ResistanceHit[] = [];
  const resistanceGenes: string[] = [];

  // ── Context-based mutation detection ──
  // For each known mutation, search for pattern: motifBefore + [mutant] + motifAfter
  // This works regardless of where the sequence starts (no need for full-length reference)
  for (const mut of RESISTANCE_MUTATIONS) {
    const before = mut.motifBefore.toUpperCase();
    const after = mut.motifAfter.toUpperCase();
    // Search for both wild-type and mutant patterns
    const wildPattern = before + mut.wildType + after;
    const wildFound = seq.includes(wildPattern);

    for (const mutant of mut.mutants) {
      const mutPattern = before + mutant + after;
      let idx = seq.indexOf(mutPattern);
      while (idx >= 0) {
        hits.push({
          drugClass: mut.drugClass,
          drugExamples: mut.drugExamples,
          position: idx + before.length + 1, // position in this sequence (1-indexed)
          wildType: mut.wildType,
          mutant,
          mechanism: `${mut.gene} ${mut.wildType}${mut.position}${mutant}: ${mut.mechanism}`,
          confidence: mut.confidence,
          source: mut.source,
        });
        if (!resistanceGenes.includes(mut.gene)) {
          resistanceGenes.push(mut.gene);
        }
        idx = seq.indexOf(mutPattern, idx + 1);
      }
    }
  }

  // ── Compute per-class scores ──
  const classScoreMap: Record<string, number> = {};
  for (const hit of hits) {
    const weight = hit.confidence / 100;
    classScoreMap[hit.drugClass] = (classScoreMap[hit.drugClass] || 0) + weight * 40;
  }
  const classScores = Object.entries(classScoreMap).map(([cls, score]) => ({
    drugClass: cls,
    score: Math.min(100, Math.round(score)),
    level: classify(score),
  }));

  // Overall = average across all detected classes + flag for high-impact
  const overallScore = classScores.length === 0 ? 0 :
    Math.min(100, Math.round(classScores.reduce((s, c) => s + c.score, 0) / classScores.length));

  let recommendation = "";
  if (hits.length === 0) {
    recommendation = "Известных детерминант резистентности не обнаружено. Препараты из всех классов могут быть эффективны. Важно: отрицательный результат не гарантирует чувствительность — возможны механизмы, не входящие в базу.";
  } else {
    const resistant = classScores.filter((c) => c.level === "resistant").map((c) => c.drugClass);
    if (resistant.length > 0) {
      recommendation = `Обнаружена вероятная резистентность к: ${resistant.join(", ")}. Избегать этих классов. `;
    }
    const intermediate = classScores.filter((c) => c.level === "intermediate").map((c) => c.drugClass);
    if (intermediate.length > 0) {
      recommendation += `Промежуточная чувствительность: ${intermediate.join(", ")}. Использовать с осторожностью, возможно повышение дозы. `;
    }
    recommendation += "Подтвердить фенотипическим тестом (диско-диффузия или MIC).";
  }

  return {
    sequence: seq,
    length: seq.length,
    hits,
    classScores,
    overallScore,
    resistanceGenes,
    recommendation,
  };
}

/**
 * Check which drugs from our database are affected by detected resistance.
 */
export function getAffectedDrugs(amr: AMRResult, drugs: Drug[]): Drug[] {
  const affectedClasses = new Set<string>();
  amr.hits.forEach((h) => affectedClasses.add(h.drugClass));

  // Map our drug pharm_group → resistance class
  const classMapping: Record<string, string> = {
    "Фторхинолон": "Фторхинолоны",
    "Тетрациклин": "Тетрациклины",
    "Макролид": "Макролиды",
    "Макролид (15-чл)": "Макролиды",
    "Макролид (16-чл)": "Макролиды",
    "Аминогликозид": "Аминогликозиды",
    "Сульфаниламид": "Сульфаниламиды",
    "Антибиотик-пенициллин": "β-лактамы",
    "Антибиотик-цефалоспорин": "β-лактамы",
    "Антибиотик-цефалоспорин 3 пок.": "β-лактамы",
    "Антибиотик-цефалоспорин 4 пок.": "β-лактамы",
  };

  return drugs.filter((d) => {
    const cls = classMapping[d.pharm_group];
    return cls && affectedClasses.has(cls);
  });
}

export const AMR_SAMPLES: { name: string; description: string; seq: string }[] = [
  {
    name: "E. coli gyrA (susceptible, WT QRDR)",
    description: "Дикий тип GyrA QRDR: AIVM-S-GDA (S83) и GDA-D-NAG (D87)",
    seq: "MSDSLEPQNMADLAVELFNEREGDRLAVITGPGLATVEAQKAGVEVLKQLRDKLTGQDVAAGVLASYVAAGVSDSVSIVGRDDNLGQAIHEGFTAVAGYPTVEILTEQTPGQIFDSLAEQAISSSGRLIEYGDAIVMSDGIYDALHMGQMKAVDEQNLAEQAISSSGRLIEYGDTDSVIEANDAGVTAQRYDSDLNQMVSQLYADRRSLLRELRA",
  },
  {
    name: "E. coli gyrA (S83L + D87N — FQ-R)",
    description: "Двойная мутация QRDR: VM-L-DG (S83L) и IY-N-AL (D87N) — фторхинолоновая резистентность",
    seq: "MSDSLEPQNMADLAVELFNEREGDRLAVITGPGLATVEAQKAGVEVLKQLRDKLTGQDVAAGVLASYVAAGVSDSVSIVGRDDNLGQAIHEGFTAVAGYPTVEILTEQTPGQIFDSLAEQAISSSGRLIEYGDAIVMLDGIYNALHMGQMKAVDEQNLAEQAISSSGRLIEYGDTDSVIEANDAGVTAQRYDSDLNQMVSQLYADRRNLLRELRA",
  },
  {
    name: "M. tuberculosis rpoB (S531L — RIF-R)",
    description: "Мутация S531L в RpoB RRDR: TSA-L-FLE (вместо TSA-S-FLE)",
    seq: "TQROPYQQLDPVTGSQTRLEQMLEQKPSVTELHPDPDDTNQLHAQTSADRQTKQAHARLSLLESRPSDSDQYDQDIDALIELRAQETSGYQVRDLLEVLAGQDDYELRDAVQRLQARLPGLEVLDQLTQGEARRLLEEAERAERLEQRRLAQAEKQAQAHRLEQAFQANRARANVANVREALESVEATGQQRLQAELEQGLRQAGDADRAQEALEAGLQRAQQQLEQAHQAQRRLLDALRELANRAEELAESQDRAELLASQGETSALFLEALRAAALESQDAELEAQRAQEARLQALVAQGTDLTEAQQAAQAQDRLRALEATGRRLEAGLQRAQDKARDAAELAQAKAALAQERLRELDAELEQAGQQAQRLQAESLQALRAQAQARDLAQLEQANRAQALQQAQQRLQAAVDEAVRATQEQRLDQLTAQGAEAAQRAQAAREVLEQARLAELEQLQ",
  },
  {
    name: "S. pneumoniae pbp2x (T338A — β-lactam-R)",
    description: "Мутация T338A в PBP2x активном сайте: SNT-A-FKG (вместо SNT-T-FKG)",
    seq: "MKKIFLFTLLISGALAHAQPNVRFVKQNTNVITRAENPNVSADKQDNVTAKQNTLDAQYRQQVKQAYQKLVQFKQDSEGTAYSKQITQHNYKINVRQAHQDLSAYYFKQDNTSQITQANYKPNVRQQYQQVLQFKQDSEGVAYSKQITQHNYKINVRQAHQDLSAYYFKQDNTSQITQANYKPNVRQQYQQVLQFKQDSEGVAYSKQITQHNYKINVRQAHQDLSAYYFKQDNTSQITQANYKPNVRQQYQQVLQFKSNTAFKGKQITQHNYKINVRQAHQDLSAYYFKQDNTSQITQANYKPNVRQQYQQVLQFKQDSEGVAYSKQITQHNYKINVRQAHQDLSAYYFKQDNTSQITQANYKPNVRQ",
  },
];
