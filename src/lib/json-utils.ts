/**
 * JSON extraction + validation utilities for LLM responses.
 *
 * LLMs (Qwen, GPT, etc.) often wrap JSON in prose or markdown fences.
 * The old greedy regex /\{[\s\S]*\}/ matched from first { to last },
 * including trailing prose → JSON.parse failed. This module provides
 * a balanced-brace extractor + type guards for known response shapes.
 */

/**
 * Extract the first balanced JSON object from a raw LLM string.
 * Counts brace depth and stops at the first balanced closing brace.
 * Also handles ```json fenced blocks.
 *
 * Returns null if no valid JSON object is found.
 */
export function extractJson(raw: string): string | null {
  if (!raw) return null;

  // Try ```json fenced block first
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    const trimmed = fenced[1].trim();
    if (trimmed.startsWith("{")) return trimmed;
  }

  // Balanced-brace extraction
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    // Handle string literals (don't count braces inside strings)
    if (ch === "\\") { escape = !escape; continue; }
    if (ch === '"' && !escape) { inString = !inString; }
    escape = false;

    if (inString) continue;

    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        return raw.slice(start, i + 1);
      }
    }
  }

  return null;
}

/**
 * Validate that an unknown object has the shape of a DiagnosisResult
 * (from the AI Vet page). Returns the typed object or null.
 */
export function validateDiagnosisResult(obj: unknown): {
  differentialDiagnoses: { name: string; probability: number; reasoning: string }[];
  recommendedTests: string[];
  urgency: "low" | "moderate" | "high" | "critical";
  recommendation: string;
} | null {
  if (typeof obj !== "object" || obj === null) return null;
  const o = obj as Record<string, unknown>;

  // Check required fields
  if (!Array.isArray(o.differentialDiagnoses)) return null;
  if (!Array.isArray(o.recommendedTests)) return null;
  if (typeof o.urgency !== "string") return null;
  if (typeof o.recommendation !== "string") return null;

  // Validate urgency values
  const validUrgency = ["low", "moderate", "high", "critical"];
  if (!validUrgency.includes(o.urgency)) {
    o.urgency = "moderate"; // default fallback
  }

  // Validate differentialDiagnoses entries
  const diagnoses = o.differentialDiagnoses.map((d: unknown) => {
    if (typeof d !== "object" || d === null) return { name: "?", probability: 0, reasoning: "" };
    const dd = d as Record<string, unknown>;
    return {
      name: typeof dd.name === "string" ? dd.name : "?",
      probability: typeof dd.probability === "number" ? dd.probability : 0,
      reasoning: typeof dd.reasoning === "string" ? dd.reasoning : "",
    };
  });

  return {
    differentialDiagnoses: diagnoses,
    recommendedTests: o.recommendedTests.filter((t: unknown) => typeof t === "string"),
    urgency: o.urgency as "low" | "moderate" | "high" | "critical",
    recommendation: o.recommendation,
  };
}

/**
 * Validate that an unknown object has the shape of a DrugRepurposingAnalysis
 * (from the drug-repurposing page). Returns the typed object or null.
 */
export function validateDrugAnalysis(obj: unknown): Record<string, unknown> | null {
  if (typeof obj !== "object" || obj === null) return null;
  const o = obj as Record<string, unknown>;

  // Must have at least one of the expected fields
  const hasField = o.repurposingPotential || o.confidenceScore || o.rationale;
  if (!hasField) return null;

  // Coerce types
  const result: Record<string, unknown> = {
    repurposingPotential: typeof o.repurposingPotential === "string" ? o.repurposingPotential : "unknown",
    confidenceScore: typeof o.confidenceScore === "number" ? o.confidenceScore : 0,
    rationale: typeof o.rationale === "string" ? o.rationale : "",
    keyRisks: Array.isArray(o.keyRisks) ? o.keyRisks.filter((r: unknown) => typeof r === "string") : [],
    nextSteps: Array.isArray(o.nextSteps) ? o.nextSteps.filter((s: unknown) => typeof s === "string") : [],
  };

  return result;
}
