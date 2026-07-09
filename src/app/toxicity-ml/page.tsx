"use client";

import { useState, useRef } from "react";
import { ToolPageLayout, LoadingPanel, EmptyPanel, ErrorAlert } from "@/components/ui";
import { predictToxicityML, getToxEndpoints, type ToxPanel } from "@/lib/tox-models";
import { ShieldAlert, AlertTriangle, CheckCircle2, X } from "lucide-react";

const SAMPLE_SMILES = [
  { name: "Aspirin", smiles: "CC(=O)OC1=CC=CC=C1C(=O)O" },
  { name: "Ibuprofen", smiles: "CC(C)CC1=CC=C(C=C1)CC(C)C(=O)O" },
  { name: "Paracetamol", smiles: "CC(=O)NC1=CC=C(O)C=C1" },
];

export default function ToxicityMLPage() {
  const [smiles, setSmiles] = useState(SAMPLE_SMILES[0].smiles);
  const [result, setResult] = useState<ToxPanel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const endpoints = getToxEndpoints();

  const run = async () => {
    if (!smiles || smiles.length < 5) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const panel = await predictToxicityML(smiles, ctrl.signal);
      setResult(panel);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const cancel = () => { abortRef.current?.abort(); setLoading(false); };

  const riskColor = (risk: number) => risk >= 60 ? "#dc2626" : risk >= 30 ? "#eab308" : "#16a34a";

  return (
    <ToolPageLayout
      name="ML Toxicity"
      icon="☠️"
      color="rose"
      description="Реальные ML-классификаторы токсичности (ChemBERTa fine-tunes на MoleculeNet). Ames, hERG, DILI, ClinTox, сенсибилизация кожи. 5 эндпоинтов, бесплатный HF API."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Параметры</h3>

          <div className="mb-4">
            <span className="text-xs text-zinc-500 block mb-1.5">Примеры:</span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_SMILES.map((s, i) => (
                <button key={i} onClick={() => setSmiles(s.smiles)}
                  className="px-2 py-1 rounded-md text-xs border border-zinc-200 dark:border-zinc-700 hover:bg-accent">
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <label className="block mb-4">
            <span className="text-xs text-zinc-500">SMILES молекулы</span>
            <textarea value={smiles} onChange={(e) => setSmiles(e.target.value)} rows={3}
              className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-mono" />
          </label>

          <div className="flex gap-2">
            <button onClick={run} disabled={loading || smiles.length < 5}
              className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 transition">
              {loading ? "⏳ Анализ..." : "☠️ Анализ токсичности"}
            </button>
            {loading && <button onClick={cancel}
              className="px-3 py-2.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600">
              <X className="h-4 w-4" />
            </button>}
          </div>

          {error && <div className="mt-3"><ErrorAlert message={error} /></div>}

          <div className="mt-4 text-[10px] text-zinc-400 bg-zinc-50 dark:bg-zinc-900 rounded p-2">
            <div className="font-semibold mb-1">Эндпоинты ({endpoints.length}):</div>
            {endpoints.map((e) => (
              <div key={e.endpoint}>• <b>{e.endpoint}</b>: {e.description}</div>
            ))}
            <div className="mt-1">💡 Требуется HF token (🤖 в шапке)</div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {loading && <LoadingPanel message="ChemBERTa классификаторы анализируют молекулу..." />}
          {!result && !loading && !error && <EmptyPanel message="Введите SMILES для анализа токсичности" />}
          {result && (
            <div className="space-y-4">
              {/* Overall risk */}
              <div className="rounded-xl border p-4" style={{
                borderColor: riskColor(result.overallRisk) + "55",
                backgroundColor: riskColor(result.overallRisk) + "10",
              }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {result.overallRisk >= 30 ? <AlertTriangle className="h-5 w-5" style={{ color: riskColor(result.overallRisk) }} /> : <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    <span className="text-sm font-bold">Общий риск токсичности</span>
                  </div>
                  <span className="text-2xl font-bold tabular-nums" style={{ color: riskColor(result.overallRisk) }}>
                    {result.overallRisk}/100
                  </span>
                </div>
                <div className="text-xs" style={{ color: riskColor(result.overallRisk) }}>{result.summary}</div>
                <div className="mt-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <div className="h-full transition-all" style={{ width: `${result.overallRisk}%`, backgroundColor: riskColor(result.overallRisk) }} />
                </div>
              </div>

              {/* Per-endpoint results */}
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-500">
                  Результаты по эндпоинтам ({result.totalCount}/{result.results.length} успешно)
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-zinc-500">
                      <th className="text-left py-2 px-3">Эндпоинт</th>
                      <th className="text-center py-2 px-3">Результат</th>
                      <th className="text-center py-2 px-3">Уверенность</th>
                      <th className="text-left py-2 px-3">Описание</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.map((r, i) => {
                      const ep = endpoints.find((e) => e.endpoint === r.endpoint);
                      const isToxic = r.label.toLowerCase().includes("toxic") || r.label === "1";
                      const isUnknown = r.label === "UNKNOWN" || r.label === "ERROR";
                      return (
                        <tr key={i} className="border-b border-zinc-100 dark:border-zinc-900">
                          <td className="py-2 px-3 font-medium">{r.endpoint}</td>
                          <td className="py-2 px-3 text-center">
                            {isUnknown ? (
                              <span className="text-zinc-400">—</span>
                            ) : isToxic ? (
                              <span className="inline-flex items-center gap-1 text-red-600 font-bold">
                                <ShieldAlert className="h-3 w-3" /> TOXIC
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-green-600 font-bold">
                                <CheckCircle2 className="h-3 w-3" /> SAFE
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center tabular-nums">
                            {isUnknown ? "—" : `${(r.confidence * 100).toFixed(1)}%`}
                          </td>
                          <td className="py-2 px-3 text-zinc-400 text-[10px]">{ep?.description}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="text-[10px] text-zinc-400">
                Модели: ChemBERTa-zinc-base-v1 fine-tunes (MoleculeNet). Бесплатный HF Inference API.
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageLayout>
  );
}
