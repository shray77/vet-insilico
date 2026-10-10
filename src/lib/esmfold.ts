/**
 * ESMFold protein structure prediction via HuggingFace.
 *
 * Calls the ESMFold Gradio Space (facebook/ESMFold) to predict 3D
 * protein structure from sequence. Returns PDB string + per-residue
 * pLDDT confidence scores.
 *
 * Free on HF free tier (Space runs on free CPU).
 * Latency: 30-120s per protein (cold start possible).
 *
 * Usage:
 *   import { predictStructure } from "@/lib/esmfold";
 *   const result = await predictStructure("MKWVTFISLL...");
 */

import { getHfToken } from "./hf";

export interface StructurePrediction {
  /** PDB-format structure string. */
  pdb: string;
  /** Per-residue pLDDT scores (0-100). */
  plddt: number[];
  /** Predicted secondary structure (H=helix, E=strand, C=coil). */
  secondaryStructure?: string;
  /** Sequence length. */
  length: number;
  /** Mean pLDDT (overall confidence). */
  meanPlddt: number;
  /** Quality assessment. */
  quality: "high" | "medium" | "low";
  /** Time taken in seconds. */
  elapsed?: number;
}

const ESMFOLD_SPACE_URL = "https://facebook-esmfold.hf.space";

/**
 * Predict protein 3D structure from sequence using ESMFold.
 *
 * Uses the Gradio API of the official ESMFold HF Space.
 * The Space runs on free CPU tier — expect 30-120s latency.
 *
 * @param sequence - protein sequence (1-letter code, 50-1000 aa)
 * @param signal - AbortSignal for cancellation
 */
export async function predictStructure(
  sequence: string,
  signal?: AbortSignal,
): Promise<StructurePrediction> {
  const seq = sequence.toUpperCase().replace(/[^A-Z]/g, "");

  if (seq.length < 30) {
    throw new Error("Минимум 30 аминокислот для предсказания структуры");
  }
  if (seq.length > 1000) {
    throw new Error("Максимум 1000 аминокислот (ограничение ESMFold Space)");
  }

  const startTime = Date.now();

  // Try Gradio API of the ESMFold Space
  // The Space exposes a /run/predict endpoint
  const token = getHfToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Step 1: Submit the prediction
  const submitResp = await fetch(`${ESMFOLD_SPACE_URL}/gradio_api/call/predict`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      data: [seq],
    }),
    signal,
  });

  if (!submitResp.ok) {
    // Try alternative API path (older Gradio versions)
    return await predictStructureAlt(seq, signal, startTime);
  }

  const submitData = await submitResp.json();
  const eventId = submitData.event_id;
  if (!eventId) {
    return await predictStructureAlt(seq, signal, startTime);
  }

  // Step 2: Poll for result via SSE stream
  const resultResp = await fetch(`${ESMFOLD_SPACE_URL}/gradio_api/call/predict/${eventId}`, {
    headers,
    signal,
  });

  if (!resultResp.ok) {
    return await predictStructureAlt(seq, signal, startTime);
  }

  // Parse SSE stream
  const text = await resultResp.text();
  const result = parseGradioSSE(text);

  if (!result) {
    return await predictStructureAlt(seq, signal, startTime);
  }

  const elapsed = (Date.now() - startTime) / 1000;
  return parsePrediction(result, seq, elapsed);
}

/**
 * Alternative: try the older Gradio API format.
 */
async function predictStructureAlt(
  seq: string,
  signal: AbortSignal | undefined,
  startTime: number,
): Promise<StructurePrediction> {
  const token = getHfToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // Try /api/predict (older Gradio)
  const resp = await fetch(`${ESMFOLD_SPACE_URL}/api/predict`, {
    method: "POST",
    headers,
    body: JSON.stringify({ data: [seq] }),
    signal,
  });

  if (!resp.ok) {
    throw new Error(`ESMFold Space недоступен (HTTP ${resp.status}). Попробуйте позже — возможно cold start.`);
  }

  const data = await resp.json();
  const elapsed = (Date.now() - startTime) / 1000;
  return parsePrediction(data, seq, elapsed);
}

/**
 * Parse Gradio SSE response.
 * Format: "event: complete\ndata: {json}\n\n"
 */
function parseGradioSSE(text: string): Record<string, unknown> | null {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("data: ")) {
      try {
        return JSON.parse(lines[i].slice(6));
      } catch {
        continue;
      }
    }
  }
  // Try parsing the whole text as JSON (fallback)
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Parse the ESMFold prediction output.
 *
 * ESMFold Space returns data like:
 * { data: [{ pdb: "...", plddt: [...], ... }, ...] }
 * or older format: { data: ["PDB_STRING", ...] }
 */
function parsePrediction(
  data: Record<string, unknown>,
  seq: string,
  elapsed: number,
): StructurePrediction {
  const dataArray = data.data as unknown[] | undefined;
  if (!dataArray || dataArray.length === 0) {
    throw new Error("ESMFold вернул пустой результат");
  }

  // Try to extract PDB string from the first data element
  let pdb = "";
  let plddt: number[] = [];

  const first = dataArray[0];

  if (typeof first === "string") {
    // Simple string PDB
    pdb = first;
  } else if (typeof first === "object" && first !== null) {
    // Object with pdb/plddt fields
    const obj = first as Record<string, unknown>;
    pdb = (obj.pdb as string) || (obj.structure as string) || "";
    plddt = (obj.plddt as number[]) || [];
  }

  if (!pdb || pdb.length < 50) {
    throw new Error("ESMFold не вернул PDB структуру");
  }

  // Parse pLDDT from PDB B-factor column if not provided separately
  if (plddt.length === 0) {
    plddt = parsePlddtFromPdb(pdb);
  }

  const meanPlddt = plddt.length > 0
    ? plddt.reduce((a, b) => a + b, 0) / plddt.length
    : 50;

  let quality: "high" | "medium" | "low";
  if (meanPlddt >= 70) quality = "high";
  else if (meanPlddt >= 50) quality = "medium";
  else quality = "low";

  return {
    pdb,
    plddt,
    length: seq.length,
    meanPlddt: Math.round(meanPlddt * 10) / 10,
    quality,
    elapsed: Math.round(elapsed),
  };
}

/**
 * Parse pLDDT scores from PDB B-factor column.
 * ESMFold writes per-residue confidence as B-factor.
 */
function parsePlddtFromPdb(pdb: string): number[] {
  const scores: number[] = [];
  const lines = pdb.split("\n");
  const seen = new Set<number>();

  for (const line of lines) {
    if (line.startsWith("ATOM") && line.length >= 66) {
      // B-factor is columns 61-66
      const bfactor = parseFloat(line.slice(60, 66).trim());
      const resSeq = parseInt(line.slice(22, 26).trim(), 10);
      if (!isNaN(bfactor) && !seen.has(resSeq)) {
        scores.push(bfactor);
        seen.add(resSeq);
      }
    }
  }

  return scores;
}

/**
 * Get pLDDT color for a residue (AlphaFold coloring scheme).
 */
export function plddtColor(plddt: number): string {
  if (plddt >= 90) return "#0053D6"; // Very high (blue)
  if (plddt >= 70) return "#65CBF3"; // Confident (cyan)
  if (plddt >= 50) return "#FFDB13"; // Low (yellow)
  return "#FF7D45"; // Very low (orange)
}

/**
 * Get quality label in Russian.
 */
export function qualityLabel(quality: "high" | "medium" | "low"): string {
  switch (quality) {
    case "high": return "Высокая уверенность";
    case "medium": return "Средняя уверенность";
    case "low": return "Низкая уверенность";
  }
}
