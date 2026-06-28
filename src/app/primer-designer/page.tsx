"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import HubHeader from "@/components/HubHeader";
import {
  designPrimers,
  analyzePairWithLLM,
  PRIMER_SAMPLE_TARGETS,
  type PrimerPair,
  type PrimerLLMAnalysis,
} from "@/lib/primer";
import { getHfToken } from "@/lib/hf";

export default function PrimerDesignerPage() {
  const [sequence, setSequence] = useState(PRIMER_SAMPLE_TARGETS[0].seq);
  const [selectedSample, setSelectedSample] = useState(0);
  const [params, setParams] = useState({
    targetTm: 58,
    minProduct: 150,
    maxProduct: 600,
    minLen: 18,
    maxLen: 22,
  });
  const [running, setRunning] = useState(false);
  const [pairs, setPairs] = useState<PrimerPair[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState<number | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string>("");
  const [hasHfToken, setHasHfToken] = useState(false);

  // Re-check token whenever we expand or analyze
  const checkToken = () => setHasHfToken(!!getHfToken());

  const runDesign = () => {
    setRunning(true);
    setPairs([]);
    setExpandedIdx(null);
    setTimeout(() => {
      const result = designPrimers({
        sequence,
        targetTm: params.targetTm,
        minProduct: params.minProduct,
        maxProduct: params.maxProduct,
        minLen: params.minLen,
        maxLen: params.maxLen,
        topN: 15,
      });
      setPairs(result);
      setRunning(false);
    }, 200);
  };

  const loadSample = (idx: number) => {
    setSelectedSample(idx);
    setSequence(PRIMER_SAMPLE_TARGETS[idx].seq);
    setPairs([]);
  };

  const runLLMAnalysis = async (idx: number) => {
    checkToken();
    if (!getHfToken()) {
      setAnalyzeError("Сначала задайте HF token — кнопка 🤖 в шапке");
      return;
    }
    setAnalyzing(idx);
    setAnalyzeError("");
    try {
      const pathogenName = PRIMER_SAMPLE_TARGETS[selectedSample].pathogen;
      const analysis = await analyzePairWithLLM(pairs[idx], pathogenName);
      const newPairs = [...pairs];
      newPairs[idx] = { ...newPairs[idx], llmAnalysis: analysis };
      setPairs(newPairs);
    } catch (e: any) {
      setAnalyzeError(e.message || "Ошибка LLM");
    } finally {
      setAnalyzing(null);
    }
  };

  const scoreColor = (s: number) =>
    s >= 80 ? "#16a34a" : s >= 60 ? "#84cc16" : s >= 40 ? "#eab308" : "#dc2626";

  const riskColor = (r: string) =>
    r === "low" ? "#16a34a" : r === "moderate" ? "#eab308" : "#dc2626";

  return (
    <div className="min-h-screen">
      <HubHeader />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-teal-500">Хаб</Link>
          <span className="mx-1">/</span>
          <span>PCR Primer Designer</span>
        </div>

        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 mb-6">
          <h2 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
            🔬 PCR Primer Designer — ML-powered
          </h2>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Дизайн пар праймеров с детальной термодинамикой (SantaLucia 1998 NN, hairpin DP, dimers) +
            опциональный LLM-анализ специфичности и рисков через Qwen2.5-Coder-3B-Instruct (HuggingFace).
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input */}
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
              Образцы мишеней
            </h3>
            <div className="space-y-2 mb-4">
              {PRIMER_SAMPLE_TARGETS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => loadSample(i)}
                  className={`w-full text-left p-3 rounded-lg text-sm transition border ${
                    selectedSample === i
                      ? "bg-amber-600 text-white border-amber-600"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-amber-300 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <div className="font-medium">{s.name}</div>
                  <div className={`text-xs ${selectedSample === i ? "text-amber-100" : "text-zinc-400"}`}>
                    {s.pathogen}
                  </div>
                </button>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
              Последовательность мишени (5' → 3')
            </h3>
            <textarea
              value={sequence}
              onChange={(e) => { setSequence(e.target.value); setPairs([]); }}
              rows={8}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono"
            />
            <div className="text-xs text-zinc-400 mt-1">Длина: {sequence.length} п.о.</div>

            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3 mt-4">
              Параметры дизайна
            </h3>
            <div className="space-y-3">
              <label className="block">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Target Tm: <b>{params.targetTm}°C</b></span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={70}
                  value={params.targetTm}
                  onChange={(e) => setParams({ ...params, targetTm: Number(e.target.value) })}
                  className="w-full accent-amber-600"
                />
              </label>
              <label className="block">
                <div className="text-xs text-zinc-500">Длина праймера: {params.minLen}–{params.maxLen} п.о.</div>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number" min={15} max={30} value={params.minLen}
                    onChange={(e) => setParams({ ...params, minLen: Number(e.target.value) })}
                    className="w-1/2 px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs"
                  />
                  <input
                    type="number" min={15} max={30} value={params.maxLen}
                    onChange={(e) => setParams({ ...params, maxLen: Number(e.target.value) })}
                    className="w-1/2 px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs"
                  />
                </div>
              </label>
              <label className="block">
                <div className="text-xs text-zinc-500">Размер ампликона: {params.minProduct}–{params.maxProduct} п.о.</div>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number" min={80} max={2000} value={params.minProduct}
                    onChange={(e) => setParams({ ...params, minProduct: Number(e.target.value) })}
                    className="w-1/2 px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs"
                  />
                  <input
                    type="number" min={80} max={3000} value={params.maxProduct}
                    onChange={(e) => setParams({ ...params, maxProduct: Number(e.target.value) })}
                    className="w-1/2 px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs"
                  />
                </div>
              </label>
              <button
                onClick={runDesign}
                disabled={running || sequence.length < 100}
                className="w-full px-4 py-2 rounded-lg bg-amber-600 text-white font-medium disabled:opacity-50 hover:bg-amber-700 transition"
              >
                {running ? "⏳ Расчёт..." : "🧪 Подобрать праймеры"}
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-6">
            {pairs.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-400">
                {running ? "Считаем..." : "Нажмите «Подобрать праймеры» чтобы увидеть результаты"}
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-bold text-amber-600">{pairs.length}</div>
                    <div>
                      <div className="text-sm font-medium">пар праймеров найдено</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        Лучшая пара: score {pairs[0]?.score}/100, ΔTm {pairs[0]?.tmDifference.toFixed(1)}°C, продукт {pairs[0]?.ampliconSize} bp
                      </div>
                    </div>
                    {!hasHfToken && (
                      <div className="ml-auto text-xs text-zinc-400 max-w-xs text-right">
                        💡 Для ML-анализа задайте HF token — кнопка 🤖 в шапке
                      </div>
                    )}
                  </div>
                </div>

                {analyzeError && (
                  <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-300">
                    {analyzeError}
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
                    Топ пар праймеров
                  </h3>
                  <div className="space-y-3">
                    {pairs.map((p, i) => (
                      <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <button
                              onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                              className="font-bold text-lg hover:text-amber-600 transition"
                            >
                              Пара #{i + 1} {expandedIdx === i ? "▾" : "▸"}
                            </button>
                            <div className="text-xs text-zinc-400">
                              Ампликон: <b>{p.ampliconSize} bp</b> • ΔTm: <b>{p.tmDifference.toFixed(1)}°C</b> • Cross-dimer ΔG: <b>{p.crossDimer} kcal/mol</b>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold" style={{ color: scoreColor(p.score) }}>
                              {p.score}
                            </div>
                            <div className="text-xs text-zinc-400">quality</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Forward */}
                          <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3 border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-green-700 dark:text-green-300">▶ FORWARD (5'→3')</span>
                              <span className="text-xs text-zinc-400">pos {p.forward.position}</span>
                            </div>
                            <div className="font-mono text-sm break-all bg-white dark:bg-zinc-900 p-2 rounded mb-2">
                              5'-{p.forward.sequence}-3'
                            </div>
                            <div className="grid grid-cols-3 gap-1 text-xs">
                              <div><span className="text-zinc-400">Tm:</span> <b>{p.forward.tm}°C</b></div>
                              <div><span className="text-zinc-400">GC:</span> <b>{p.forward.gc}%</b></div>
                              <div><span className="text-zinc-400">GC-clamp:</span> <b style={{ color: p.forward.gcClamp >= 1 && p.forward.gcClamp <= 3 ? "#16a34a" : "#dc2626" }}>{p.forward.gcClamp}</b></div>
                              <div><span className="text-zinc-400">Hairpin ΔG:</span> <b style={{ color: p.forward.hairpin < -5 ? "#dc2626" : p.forward.hairpin < -3 ? "#ca8a04" : "#16a34a" }}>{p.forward.hairpin}</b></div>
                              <div><span className="text-zinc-400">Self-dimer ΔG:</span> <b style={{ color: p.forward.selfDimer < -5 ? "#dc2626" : p.forward.selfDimer < -3 ? "#ca8a04" : "#16a34a" }}>{p.forward.selfDimer}</b></div>
                              <div><span className="text-zinc-400">3' ΔG:</span> <b>{p.forward.threeEndStability}</b></div>
                            </div>
                          </div>

                          {/* Reverse */}
                          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3 border border-red-200 dark:border-red-800">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-red-700 dark:text-red-300">◀ REVERSE (5'→3')</span>
                              <span className="text-xs text-zinc-400">pos {p.reverse.position}</span>
                            </div>
                            <div className="font-mono text-sm break-all bg-white dark:bg-zinc-900 p-2 rounded mb-2">
                              5'-{p.reverse.sequence}-3'
                            </div>
                            <div className="grid grid-cols-3 gap-1 text-xs">
                              <div><span className="text-zinc-400">Tm:</span> <b>{p.reverse.tm}°C</b></div>
                              <div><span className="text-zinc-400">GC:</span> <b>{p.reverse.gc}%</b></div>
                              <div><span className="text-zinc-400">GC-clamp:</span> <b style={{ color: p.reverse.gcClamp >= 1 && p.reverse.gcClamp <= 3 ? "#16a34a" : "#dc2626" }}>{p.reverse.gcClamp}</b></div>
                              <div><span className="text-zinc-400">Hairpin ΔG:</span> <b style={{ color: p.reverse.hairpin < -5 ? "#dc2626" : p.reverse.hairpin < -3 ? "#ca8a04" : "#16a34a" }}>{p.reverse.hairpin}</b></div>
                              <div><span className="text-zinc-400">Self-dimer ΔG:</span> <b style={{ color: p.reverse.selfDimer < -5 ? "#dc2626" : p.reverse.selfDimer < -3 ? "#ca8a04" : "#16a34a" }}>{p.reverse.selfDimer}</b></div>
                              <div><span className="text-zinc-400">3' ΔG:</span> <b>{p.reverse.threeEndStability}</b></div>
                            </div>
                          </div>
                        </div>

                        {/* Visual amplicon */}
                        <div className="mt-3 flex items-center gap-2 text-xs">
                          <span className="text-zinc-400">Ампликон:</span>
                          <div className="flex-1 h-6 rounded relative bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                            <div className="absolute left-2 top-0 bottom-0 w-3 bg-green-500 rounded-l" title={`Forward @ ${p.forward.position}`} />
                            <div className="absolute right-2 top-0 bottom-0 w-3 bg-red-500 rounded-r" title={`Reverse @ ${p.reverse.position}`} />
                            <div className="absolute inset-0 flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-xs font-mono">
                              {p.ampliconSize} bp
                            </div>
                          </div>
                        </div>

                        {/* ML Analysis */}
                        <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                          {p.llmAnalysis ? (
                            <LLMAnalysisView analysis={p.llmAnalysis} />
                          ) : (
                            <button
                              onClick={() => runLLMAnalysis(i)}
                              disabled={analyzing === i}
                              className="px-3 py-2 rounded-lg bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-medium hover:bg-purple-200 dark:hover:bg-purple-900/60 transition disabled:opacity-50"
                            >
                              {analyzing === i ? "⏳ LLM анализирует..." : "🤖 ML-анализ (Qwen 3B)"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-xs text-zinc-500 dark:text-zinc-400">
                  <b>Алгоритмы:</b><br/>
                  • <b>Tm (nearest-neighbor)</b> — SantaLucia 1998 unified parameters, 50 mM Na+, 250 nM primer.<br/>
                  • <b>Hairpin ΔG</b> — DP self-complementarity scan, ~-1.5 kcal/mol per bp.<br/>
                  • <b>Self/Cross-dimer</b> — end-aligned alignment scan, ~-1.0 kcal/mol per matched pair.<br/>
                  • <b>3'-end stability</b> — NN ΔG last 5 bp (must be moderate, not too strong).<br/>
                  • <b>GC-clamp</b> — 1-3 G/C в последних 5 nt 3'-конца (важно для специфичности).<br/>
                  • <b>ML-анализ</b> — Qwen2.5-Coder-3B-Instruct (Apache 2.0) через HuggingFace Inference API.<br/>
                  <b>⚠️</b> Перед использованием в ПЦР — проверьте специфичность BLAST'ом.
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function LLMAnalysisView({ analysis }: { analysis: PrimerLLMAnalysis }) {
  return (
    <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-bold text-purple-700 dark:text-purple-300">🤖 ML-анализ (Qwen 3B)</div>
        <div className="flex items-center gap-3 text-xs">
          <div>
            <span className="text-zinc-500">Специфичность:</span>{" "}
            <span className="font-bold" style={{ color: analysis.specificity >= 70 ? "#16a34a" : analysis.specificity >= 40 ? "#eab308" : "#dc2626" }}>
              {analysis.specificity}/100
            </span>
          </div>
          <div>
            <span className="text-zinc-500">Риск:</span>{" "}
            <span className="font-bold" style={{ color: analysis.riskLevel === "low" ? "#16a34a" : analysis.riskLevel === "moderate" ? "#eab308" : "#dc2626" }}>
              {analysis.riskLevel === "low" ? "Низкий" : analysis.riskLevel === "moderate" ? "Умеренный" : "Высокий"}
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
        {analysis.strengths.length > 0 && (
          <div>
            <div className="text-green-600 dark:text-green-400 font-medium mb-1">✅ Сильные стороны:</div>
            <ul className="list-disc list-inside space-y-0.5 text-zinc-700 dark:text-zinc-300">
              {analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}
        {analysis.concerns.length > 0 && (
          <div>
            <div className="text-amber-600 dark:text-amber-400 font-medium mb-1">⚠️ Замечания:</div>
            <ul className="list-disc list-inside space-y-0.5 text-zinc-700 dark:text-zinc-300">
              {analysis.concerns.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        )}
      </div>
      <div className="mt-2 pt-2 border-t border-purple-200 dark:border-purple-800 text-xs text-zinc-700 dark:text-zinc-300">
        <b>Рекомендация:</b> {analysis.recommendation}
      </div>
    </div>
  );
}
