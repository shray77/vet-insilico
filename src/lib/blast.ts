/**
 * NCBI BLAST integration — "What is this sequence?"
 *
 * Uses the NCBI BLAST REST API (https://blast.ncbi.nlm.nih.gov/Blast.cgi)
 * to identify unknown sequences. Free, no API key required.
 *
 * Flow:
 *   1. Submit sequence to BLAST (nr database, protein or nucleotide)
 *   2. Poll for completion (BLAST is async, takes 10-60s)
 *   3. Parse top hits with identity %, coverage, E-value
 *   4. Suggest which VetInSilico tool to use based on the result
 *
 * Usage:
 *   import { blastSequence, type BlastResult } from "@/lib/blast";
 *   const results = await blastSequence("MKWVTFISLL...");
 */

export interface BlastHit {
  /** NCBI accession. */
  accession: string;
  /** Description / title. */
  title: string;
  /** Organism. */
  organism: string;
  /** Percent identity (0-100). */
  identity: number;
  /** Percent query coverage (0-100). */
  coverage: number;
  /** E-value (lower = better). */
  evalue: number;
  /** Bit score. */
  bitScore: number;
  /** Alignment length. */
  alignLength: number;
  /** URL to NCBI record. */
  url: string;
}

export interface BlastResult {
  /** Query sequence length. */
  queryLength: number;
  /** Database searched. */
  database: string;
  /** Top hits, sorted by identity descending. */
  hits: BlastHit[];
  /** Suggested tool based on top hit. */
  suggestion: {
    tool: string;
    href: string;
    reason: string;
  };
}

const BLAST_URL = "https://blast.ncbi.nlm.nih.gov/blast/Blast.cgi";
const POLL_INTERVAL = 5000; // 5s between status checks
const MAX_POLL_TIME = 120000; // 2 min max

/**
 * Submit a sequence to NCBI BLAST and wait for results.
 *
 * @param sequence - protein or nucleotide sequence (raw, no FASTA header)
 * @param program - "blastp" (protein) or "blastn" (nucleotide)
 * @param database - "nr" (default), "refseq_protein", "swissprot"
 * @param onProgress - callback for polling status updates
 * @param signal - AbortSignal for cancellation
 */
export async function blastSequence(
  sequence: string,
  options: {
    program?: "blastp" | "blastn";
    database?: string;
    onProgress?: (status: string, elapsed: number) => void;
    signal?: AbortSignal;
  } = {},
): Promise<BlastResult> {
  const {
    program = "blastp",
    database = "nr",
    onProgress,
    signal,
  } = options;

  const seq = sequence.toUpperCase().replace(/[^A-Z]/g, "");
  if (seq.length < 10) throw new Error("Последовательность слишком короткая (минимум 10 символов)");
  if (seq.length > 5000) throw new Error("Последовательность слишком длинная (максимум 5000 символов)");

  // Step 1: Submit BLAST search
  onProgress?.("Отправка запроса в NCBI BLAST...", 0);
  const submitParams = new URLSearchParams({
    CMD: "Put",
    PROGRAM: program,
    DATABASE: database,
    QUERY: seq,
    FORMAT_TYPE: "XML",
    HITLIST_SIZE: "10",
    EXPECT: "10",
    TIMEOUT: "120",
  });

  const submitResp = await fetch(BLAST_URL, {
    method: "POST",
    body: submitParams,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    signal,
  });
  if (!submitResp.ok) throw new Error(`BLAST submit failed: HTTP ${submitResp.status}`);

  const submitText = await submitResp.text();
  // Extract RID (Request ID) from response
  const ridMatch = submitText.match(/RID\s*=\s*(\S+)/);
  if (!ridMatch) throw new Error("Не удалось получить BLAST RID (сервер занят, попробуйте позже)");
  const rid = ridMatch[1];

  // Step 2: Poll for completion
  const startTime = Date.now();
  let ready = false;

  while (!ready) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const elapsed = Date.now() - startTime;
    if (elapsed > MAX_POLL_TIME) throw new Error("BLAST превысил таймаут (2 мин)");

    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    const checkParams = new URLSearchParams({
      CMD: "Get",
      FORMAT_OBJECT: "SearchInfo",
      RID: rid,
    });

    const checkResp = await fetch(`${BLAST_URL}?${checkParams}`, { signal });
    if (!checkResp.ok) continue;
    const checkText = await checkResp.text();

    const statusMatch = checkText.match(/Status\s*=\s*(\S+)/);
    const status = statusMatch?.[1] ?? "UNKNOWN";

    if (status === "WAITING") {
      onProgress?.(`BLAST выполняется... ${Math.round(elapsed / 1000)}s`, elapsed);
      continue;
    }
    if (status === "FAILED") throw new Error("BLAST завершился с ошибкой");
    if (status === "NOTFOUND") throw new Error("BLAST RID не найден");
    if (status === "READY") {
      ready = true;
      onProgress?.("Загрузка результатов...", elapsed);
      break;
    }
  }

  // Step 3: Fetch results
  const resultParams = new URLSearchParams({
    CMD: "Get",
    FORMAT_TYPE: "XML",
    RID: rid,
  });

  const resultResp = await fetch(`${BLAST_URL}?${resultParams}`, { signal });
  if (!resultResp.ok) throw new Error(`BLAST results fetch failed: HTTP ${resultResp.status}`);
  const resultXml = await resultResp.text();

  // Step 4: Parse XML results
  const hits = parseBlastXml(resultXml);

  // Step 5: Suggest tool based on top hit
  const suggestion = suggestTool(hits, program);

  return {
    queryLength: seq.length,
    database,
    hits,
    suggestion,
  };
}

/**
 * Parse BLAST XML results to extract top hits.
 * Uses regex-based parsing (no DOM parser needed — keeps it lightweight).
 */
function parseBlastXml(xml: string): BlastHit[] {
  const hits: BlastHit[] = [];

  // Find all <Hit> blocks
  const hitBlocks = xml.match(/<Hit>[\s\S]*?<\/Hit>/g) || [];

  for (const block of hitBlocks) {
    const accession = block.match(/<Hit_accession>([^<]+)/)?.[1] || "";
    const def = block.match(/<Hit_def>([^<]+)/)?.[1] || "";
    const title = decodeXml(def);
    const organism = extractOrganism(title);

    const hspBlock = block.match(/<Hsp>[\s\S]*?<\/Hsp>/)?.[0] || "";
    const identity = parseFloat(hspBlock.match(/<Hsp_identity>(\d+)/)?.[1] || "0");
    const alignLen = parseInt(hspBlock.match(/<Hsp_align-len>(\d+)/)?.[1] || "0");
    const evalue = parseFloat(hspBlock.match(/<Hsp_evalue>([^<]+)/)?.[1] || "999");
    const bitScore = parseFloat(hspBlock.match(/<Hsp_bit-score>([^<]+)/)?.[1] || "0");
    const queryFrom = parseInt(hspBlock.match(/<Hsp_query-from>(\d+)/)?.[1] || "0");
    const queryTo = parseInt(hspBlock.match(/<Hsp_query-to>(\d+)/)?.[1] || "0");

    const identityPct = alignLen > 0 ? (identity / alignLen) * 100 : 0;
    const coveragePct = queryTo > queryFrom ? ((queryTo - queryFrom + 1) / 100) * 100 : 0;

    if (accession) {
      hits.push({
        accession,
        title,
        organism,
        identity: Math.round(identityPct * 10) / 10,
        coverage: Math.round(coveragePct * 10) / 10,
        evalue,
        bitScore,
        alignLength: alignLen,
        url: `https://www.ncbi.nlm.nih.gov/protein/${accession}`,
      });
    }
  }

  // Sort by identity descending
  hits.sort((a, b) => b.identity - a.identity);
  return hits.slice(0, 10);
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractOrganism(title: string): string {
  // Try to extract organism from brackets: "protein name [Organism name]"
  const match = title.match(/\[([^\]]+)\]/);
  return match?.[1] || "Unknown";
}

/**
 * Suggest which VetInSilico tool to use based on BLAST results.
 */
function suggestTool(hits: BlastHit[], program: string): {
  tool: string;
  href: string;
  reason: string;
} {
  if (hits.length === 0) {
    return {
      tool: "Alignment",
      href: "/alignment",
      reason: "BLAST не нашёл совпадений. Попробуйте выровнять с известной последовательностью вручную.",
    };
  }

  const topHit = hits[0];
  const title = topHit.title.toLowerCase();
  const organism = topHit.organism.toLowerCase();

  // Viral protein → epitopes / vaccine designer
  if (title.includes("virus") || title.includes("viral") || organism.includes("virus")) {
    return {
      tool: "Vaccine Designer",
      href: "/vaccine-designer",
      reason: `Вирусный белок (${topHit.organism}). Рекомендуется дизайн вакцины — предсказание эпитопов + кодон-оптимизация.`,
    };
  }

  // Antibiotic resistance gene → AMR
  if (title.includes("resistance") || title.includes("beta-lactamase") || title.includes("tem") || title.includes("ctx-m") || title.includes("ndm")) {
    return {
      tool: "AMR Detector",
      href: "/amr",
      reason: `Ген резистентности (${topHit.accession}). Рекомендуется анализ антимикробной резистентности.`,
    };
  }

  // Plasmid-related → plasmid mapper
  if (title.includes("plasmid") || title.includes("replicon") || title.includes("origin")) {
    return {
      tool: "Plasmid Mapper",
      href: "/plasmid-map",
      reason: `Плазмидная последовательность (${topHit.accession}). Рекомендуется карта плазмиды.`,
    };
  }

  // Bacterial → AMR + phylogeny
  if (organism.includes("bacter") || organism.includes("escherichia") || organism.includes("salmonella") || organism.includes("streptococcus")) {
    return {
      tool: "AMR + Phylogeny",
      href: "/amr",
      reason: `Бактериальная последовательность (${topHit.organism}). Рекомендуется анализ AMR + филогения.`,
    };
  }

  // Default → epitopes
  return {
    tool: "Epitope Prediction",
    href: "/epitopes",
    reason: `Идентифицирован белок (${topHit.title.slice(0, 60)}...). Рекомендуется предсказание эпитопов.`,
  };
}
