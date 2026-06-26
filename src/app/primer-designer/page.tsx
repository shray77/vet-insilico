"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import HubHeader from "@/components/HubHeader";
import { designPrimers, PRIMER_SAMPLE_TARGETS, type PrimerPair } from "@/lib/primer";

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

  const runDesign = () => {
    setRunning(true);
    setPairs([]);
    setTimeout(() => {
      const result = designPrimers({
        sequence,
        targetTm: params.targetTm,
        minProduct: params.minProduct,
        maxProduct: params.maxProduct,
        minLen: params.minLen,
        maxLen: params.maxLen,
        topN: 10,
      });
      setPairs(result);
      setRunning(false);
    }, 300);
  };

  const loadSample = (idx: number) => {
    setSelectedSample(idx);
    setSequence(PRIMER_SAMPLE_TARGETS[idx].seq);
    setPairs([]);
  };

  const scoreColor = (s: number) =>
    s >= 80 ? "#16a34a" : s >= 60 ? "#84cc16" : s >= 40 ? "#eab308" : "#dc2626";

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
            🔬 PCR Primer Designer
          </h2>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Дизайн пар праймеров для ПЦР-детекции патогенов. Считаем Tm (nearest-neighbor SantaLucia),
            GC%, hairpin ΔG, 3'-end stability, GC-clamp, размер ампликона.
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
                  <span className="text-zinc-500">Target Tm (°C): <b>{params.targetTm}</b></span>
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
                    type="number"
                    min={15}
                    max={30}
                    value={params.minLen}
                    onChange={(e) => setParams({ ...params, minLen: Number(e.target.value) })}
                    className="w-1/2 px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs"
                  />
                  <input
                    type="number"
                    min={15}
                    max={30}
                    value={params.maxLen}
                    onChange={(e) => setParams({ ...params, maxLen: Number(e.target.value) })}
                    className="w-1/2 px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs"
                  />
                </div>
              </label>
              <label className="block">
                <div className="text-xs text-zinc-500">Размер ампликона: {params.minProduct}–{params.maxProduct} п.о.</div>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    min={80}
                    max={2000}
                    value={params.minProduct}
                    onChange={(e) => setParams({ ...params, minProduct: Number(e.target.value) })}
                    className="w-1/2 px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs"
                  />
                  <input
                    type="number"
                    min={80}
                    max={3000}
                    value={params.maxProduct}
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
                        Лучшая пара: score {pairs[0]?.score}/100, Tm Δ {pairs[0]?.tmDifference.toFixed(1)}°C, продукт {pairs[0]?.ampliconSize} bp
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
                    Топ пар праймеров
                  </h3>
                  <div className="space-y-3">
                    {pairs.map((p, i) => (
                      <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-bold text-lg">Пара #{i + 1}</div>
                            <div className="text-xs text-zinc-400">
                              Ампликон: <b>{p.ampliconSize} bp</b> • ΔTm: <b>{p.tmDifference.toFixed(1)}°C</b> • Compatibility: <b>{p.pairCompatibility.toFixed(1)} kcal/mol</b>
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
                              <div><span className="text-zinc-400">Len:</span> <b>{p.forward.length}</b></div>
                              <div className="col-span-3"><span className="text-zinc-400">Hairpin ΔG:</span> <b style={{ color: p.forward.hairpin < -5 ? "#dc2626" : p.forward.hairpin < -3 ? "#ca8a04" : "#16a34a" }}>{p.forward.hairpin} kcal/mol</b></div>
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
                              <div><span className="text-zinc-400">Len:</span> <b>{p.reverse.length}</b></div>
                              <div className="col-span-3"><span className="text-zinc-400">Hairpin ΔG:</span> <b style={{ color: p.reverse.hairpin < -5 ? "#dc2626" : p.reverse.hairpin < -3 ? "#ca8a04" : "#16a34a" }}>{p.reverse.hairpin} kcal/mol</b></div>
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
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-xs text-zinc-500 dark:text-zinc-400">
                  <b>Алгоритмы:</b><br/>
                  • <b>Tm (nearest-neighbor)</b> — SantaLucia 1998 unified parameters, 50 mM соль, 250 нМ праймера.<br/>
                  • <b>Hairpin ΔG</b> — упрощённая вторичная структура (Nussinov-style). Чем меньше по модулю, тем лучше.<br/>
                  • <b>GC-clamp</b> — 1-3 G/C в последних 5 нуклеотидах 3'-конца (важно для специфичности).<br/>
                  • <b>Pair compatibility</b> — оценка 3'-end димер-риска между forward и reverse.<br/>
                  • <b>Score</b> — интегральная оценка (Tm match, GC, длина, hairpin, GC-clamp, pair compat).<br/>
                  <b>⚠️</b> Перед использованием в ПЦР — проверьте специфичность (BLAST) и кросс-реактивность.
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
