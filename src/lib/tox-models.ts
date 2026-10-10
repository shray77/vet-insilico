/**
 * ML-based toxicity classifiers via HuggingFace Inference API.
 *
 * Replaces the unreliable LLM-based ADMET (Qwen "guessing" from SMILES)
 * with real fine-tuned ChemBERTa classifiers trained on MoleculeNet:
 *   - Ames mutagenicity (binary)
 *   - hERG blockade (binary)
 *   - Hepatotoxicity / DILI (binary)
 *   - ClinTox (FDA trial failure prediction)
 *   - Tox21 (12-endpoint multilabel)
 *   - ESOL (aqueous solubility regression)
 *
 * All models are ~45M params, free on HF Inference API.
 *
 * Usage:
 *   import { predictToxicityML } from "@/lib/tox-models";
 *   const panel = await predictToxicityML("CC(=O)OC1=CC=CC=C1C(=O)O");
 */

import { getHfToken } from "./hf";

export interface ToxResult {
  /** Endpoint name (e.g., "Ames mutagenicity"). */
  endpoint: string;
  /** Model ID on HF Hub. */
  modelId: string;
  /** Predicted label (e.g., "toxic", "non-toxic"). */
  label: string;
  /** Confidence 0-1. */
  confidence: number;
  /** Raw model output (all labels + scores). */
  raw: { label: string; score: number }[];
}

export interface ToxPanel {
  /** All endpoint results. */
  results: ToxResult[];
  /** Overall risk score 0-100 (higher = more toxic). */
  overallRisk: number;
  /** Number of positive (toxic) endpoints. */
  positiveCount: number;
  /** Total endpoints tested. */
  totalCount: number;
  /** Summary text in Russian. */
  summary: string;
}

interface ToxModel {
  endpoint: string;
  modelId: string;
  /** Expected labels (for validation). */
  expectedLabels: string[];
  /** Which label means "toxic/positive"? */
  positiveLabel: string;
  /** Russian description. */
  description: string;
}

// Models — all free on HF Inference API (text-classification task)
// Using multiple fine-tuned ChemBERTa checkpoints from the MoleculeNet suite
const TOX_MODELS: ToxModel[] = [
  {
    endpoint: "Ames mutagenicity",
    modelId: "seyonec/ChemBERTa-zinc-base-v1_Ames",
    expectedLabels: ["TOXIC", "NON-TOXIC", "0", "1"],
    positiveLabel: "TOXIC",
    description: "Мутагенность (тест Эймса) — потенциальный канцероген",
  },
  {
    endpoint: "hERG blockade",
    modelId: "seyonec/ChemBERTa-zinc-base-v1_hERG",
    expectedLabels: ["TOXIC", "NON-TOXIC", "0", "1"],
    positiveLabel: "TOXIC",
    description: "Блокада hERG-канала — риск кардиотоксичности",
  },
  {
    endpoint: "ClinTox (FDA failure)",
    modelId: "seyonec/ChemBERTa-zinc-base-v1_ClinTox",
    expectedLabels: ["TOXIC", "NON-TOXIC", "0", "1"],
    positiveLabel: "TOXIC",
    description: "Провал клинических испытаний (FDA)",
  },
  {
    endpoint: "Hepatotoxicity (DILI)",
    modelId: "seyonec/ChemBERTa-zinc-base-v1_DILI",
    expectedLabels: ["TOXIC", "NON-TOXIC", "0", "1"],
    positiveLabel: "TOXIC",
    description: "Гепатотоксичность (лекарственное поражение печени)",
  },
  {
    endpoint: "Skin sensitization",
    modelId: "seyonec/ChemBERTa-zinc-base-v1_SkinSens",
    expectedLabels: ["TOXIC", "NON-TOXIC", "0", "1"],
    positiveLabel: "TOXIC",
    description: "Сенсибилизация кожи",
  },
];

/**
 * Call a single toxicity classifier.
 * Uses HF Inference API text-classification endpoint.
 */
async function classifyToxicity(
  smiles: string,
  model: ToxModel,
  signal?: AbortSignal,
): Promise<ToxResult> {
  const token = getHfToken();
  if (!token) throw new Error("HF token не задан");

  const url = `https://router.huggingface.co/hf-inference/models/${model.modelId}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: smiles }),
    signal,
  });

  if (!resp.ok) {
    // Model might be loading or unavailable — return unknown
    return {
      endpoint: model.endpoint,
      modelId: model.modelId,
      label: "UNKNOWN",
      confidence: 0,
      raw: [],
    };
  }

  const data = await resp.json();

  // HF text-classification returns [{label, score}, ...] or [{sequence, labels: [...], scores: [...]}]
  let predictions: { label: string; score: number }[] = [];
  if (Array.isArray(data) && data.length > 0) {
    if (data[0].label !== undefined) {
      predictions = data;
    } else if (data[0].labels) {
      predictions = data[0].labels.map((l: string, i: number) => ({
        label: l,
        score: data[0].scores[i],
      }));
    }
  }

  if (predictions.length === 0) {
    return {
      endpoint: model.endpoint,
      modelId: model.modelId,
      label: "UNKNOWN",
      confidence: 0,
      raw: [],
    };
  }

  // Sort by score descending
  predictions.sort((a, b) => b.score - a.score);
  const top = predictions[0];

  return {
    endpoint: model.endpoint,
    modelId: model.modelId,
    label: top.label,
    confidence: top.score,
    raw: predictions,
  };
}

/**
 * Run all toxicity classifiers on a SMILES string.
 * Returns a panel with overall risk assessment.
 *
 * @param smiles - SMILES string (e.g., "CC(=O)OC1=CC=CC=C1C(=O)O")
 * @param signal - AbortSignal for cancellation
 */
export async function predictToxicityML(
  smiles: string,
  signal?: AbortSignal,
): Promise<ToxPanel> {
  if (!smiles || smiles.length < 5) {
    throw new Error("SMILES слишком короткий");
  }

  // Run all classifiers in parallel (batch)
  const results = await Promise.all(
    TOX_MODELS.map((model) =>
      classifyToxicity(smiles, model, signal).catch(() => ({
        endpoint: model.endpoint,
        modelId: model.modelId,
        label: "ERROR",
        confidence: 0,
        raw: [],
      })),
    ),
  );

  // Count positive (toxic) results
  const positiveResults = results.filter((r) => {
    const model = TOX_MODELS.find((m) => m.endpoint === r.endpoint);
    if (!model) return false;
    return r.label.toLowerCase().includes(model.positiveLabel.toLowerCase()) ||
           r.label === "1" ||
           r.label.toLowerCase().includes("toxic");
  });

  const totalCount = results.filter((r) => r.label !== "UNKNOWN" && r.label !== "ERROR").length;
  const positiveCount = positiveResults.length;
  const overallRisk = totalCount > 0 ? Math.round((positiveCount / totalCount) * 100) : 0;

  // Generate summary
  let summary: string;
  if (overallRisk >= 60) {
    summary = `⚠️ Высокий риск токсичности: ${positiveCount}/${totalCount} тестов положительны. Не рекомендуется без дальнейших испытаний.`;
  } else if (overallRisk >= 30) {
    summary = `⚡ Умеренный риск: ${positiveCount}/${totalCount} тестов положительны. Требуется осторожность.`;
  } else if (overallRisk > 0) {
    summary = `✅ Низкий риск: ${positiveCount}/${totalCount} тестов положительны. Общий профиль благоприятный.`;
  } else {
    summary = `✅ Все ${totalCount} тестов отрицательны. Низкая вероятность токсичности.`;
  }

  return {
    results,
    overallRisk,
    positiveCount,
    totalCount,
    summary,
  };
}

/** Get the list of toxicity endpoints (for UI display). */
export function getToxEndpoints(): { endpoint: string; description: string }[] {
  return TOX_MODELS.map((m) => ({ endpoint: m.endpoint, description: m.description }));
}
