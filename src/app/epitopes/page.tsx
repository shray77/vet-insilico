"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import HubHeader from "@/components/HubHeader";
import { analyzeSequence, SAMPLE_SEQUENCES } from "@/lib/epitopes";

export default function EpitopesPage() {
  const [sequence, setSequence] = useState(SAMPLE_SEQUENCES[0].seq);
  const [selectedSample, setSelectedSample] = useState(0);
  const [minScore, setMinScore] = useState(40);

  const result = useMemo(() => {
    if (!sequence || sequence.length < 20) return null;
    return analyzeSequence(sequence);
  }, [sequence]);

  const loadSample = (idx: number) => {
    setSelectedSample(idx);
    setSequence(SAMPLE_SEQUENCES[idx].seq);
  };

  // Color scale for epitope scores
  const scoreColor = (s: number) =>
    s >= 75 ? "#16a34a" : s >= 60 ? "#84cc16" : s >= 45 ? "#eab308" : s >= 30 ? "#f97316" : "#dc2626";

  // IC50 quality
  const ic50Quality = (ic50: number) =>
    ic50 < 50 ? { label: "High", color: "#16a34a" }
    : ic50 < 500 ? { label: "Moderate", color: "#84cc16" }
    : ic50 < 1000 ? { label: "Low", color: "#eab308" }
    : { label: "Very Low", color: "#dc2626" };

  return (
    <div className="min-h-screen">
      <HubHeader />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-teal-500">Хаб</Link>
          <span className="mx-1">/</span>
          <span>Vaccine Epitopes</span>
        </div>

        <div className="rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 p-4 mb-6">
          <h2 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
            💉 Vaccine Epitope Predictor
          </h2>
          <p className="text-sm text-purple-800 dark:text-purple-200">
            Из аминокислотной последовательности белка находим B-клеточные (линейные) и T-клеточные (MHC-I) эпитопы.
            Готовый кандидат для пептидной вакцины. Алгоритмы: Hopp-Woods, Chou-Fasman, Karplus-Schulz, Emini.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input */}
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
              Образцы (demo)
            </h3>
            <div className="space-y-2 mb-4">
              {SAMPLE_SEQUENCES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => loadSample(i)}
                  className={`w-full text-left p-3 rounded-lg text-sm transition border ${
                    selectedSample === i
                      ? "bg-purple-600 text-white border-purple-600"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-purple-300 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <div className="font-medium">{s.name}</div>
                  <div className={`text-xs ${selectedSample === i ? "text-purple-100" : "text-zinc-400"}`}>
                    {s.pathogen}
                  </div>
                </button>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
              Последовательность (FASTA plain)
            </h3>
            <textarea
              value={sequence}
              onChange={(e) => setSequence(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono"
              placeholder="MKNHKQYDHL..."
            />
            <div className="text-xs text-zinc-400 mt-1">
              Длина: {sequence.length} а.о.
            </div>

            <label className="block mt-4">
              <span className="text-xs text-zinc-500">Мин. score B-эпитопов: {minScore}</span>
              <input
                type="range"
                min={0}
                max={80}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-full accent-purple-600 mt-1"
              />
            </label>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-6">
            {!result ? (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-400">
                Введите последовательность (мин. 20 аминокислот)
              </div>
            ) : (
              <>
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                    <div className="text-2xl font-bold text-purple-600">{result.length}</div>
                    <div className="text-xs text-zinc-400">длина</div>
                  </div>
                  <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                    <div className="text-2xl font-bold text-purple-600">{result.bCellEpitopes.length}</div>
                    <div className="text-xs text-zinc-400">B-эпитопов</div>
                  </div>
                  <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                    <div className="text-2xl font-bold text-purple-600">{result.tCellEpitopes.length}</div>
                    <div className="text-xs text-zinc-400">T-эпитопов</div>
                  </div>
                  <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                    <div className="text-2xl font-bold text-purple-600">{Math.round(result.antigenicity * 100)}%</div>
                    <div className="text-xs text-zinc-400">антигенность</div>
                  </div>
                </div>

                {/* B-cell epitopes */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
                    🟢 B-клеточные эпитопы (линейные) — топ {result.bCellEpitopes.filter(e => e.score >= minScore).length}
                  </h3>
                  <div className="space-y-2">
                    {result.bCellEpitopes
                      .filter((e) => e.score >= minScore)
                      .map((e, i) => (
                        <div key={i} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-900">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-mono text-sm font-medium break-all">
                                {e.sequence}
                              </div>
                              <div className="text-xs text-zinc-400 mt-1">
                                Позиция {e.start}–{e.end} • длина {e.end - e.start + 1} а.о.
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold" style={{ color: scoreColor(e.score) }}>
                                {e.score}
                              </div>
                              <div className="text-xs text-zinc-400">score</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            <div>
                              <div className="text-zinc-400">Hydro</div>
                              <div className="font-mono">{e.hydrophilicity}</div>
                            </div>
                            <div>
                              <div className="text-zinc-400">Flex</div>
                              <div className="font-mono">{e.flexibility}</div>
                            </div>
                            <div>
                              <div className="text-zinc-400">Surface</div>
                              <div className="font-mono">{e.surfaceAccessibility}</div>
                            </div>
                            <div>
                              <div className="text-zinc-400">β-turn</div>
                              <div className="font-mono">{e.betaTurn}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    {result.bCellEpitopes.filter((e) => e.score >= minScore).length === 0 && (
                      <div className="text-xs text-zinc-400 text-center py-4">
                        Нет эпитопов с score ≥ {minScore}. Снизьте порог.
                      </div>
                    )}
                  </div>
                </div>

                {/* T-cell epitopes */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
                    🔵 T-клеточные эпитопы (MHC-I, HLA-A*02:01) — топ {result.tCellEpitopes.length}
                  </h3>
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-zinc-100 dark:bg-zinc-900 text-left text-xs uppercase text-zinc-500">
                            <th className="px-3 py-2">#</th>
                            <th className="px-3 py-2">9-мер</th>
                            <th className="px-3 py-2 text-center">Позиция</th>
                            <th className="px-3 py-2 text-center">IC50 (nM)</th>
                            <th className="px-3 py-2 text-center hidden md:table-cell">Качество</th>
                            <th className="px-3 py-2 text-center hidden md:table-cell">Анкоры</th>
                            <th className="px-3 py-2 text-center">Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.tCellEpitopes.map((e, i) => {
                            const q = ic50Quality(e.ic50_estimate);
                            return (
                              <tr key={i} className="border-t border-zinc-200 dark:border-zinc-800">
                                <td className="px-3 py-2 text-zinc-400">{i + 1}</td>
                                <td className="px-3 py-2 font-mono font-medium">
                                  {e.sequence.slice(0, 1)}
                                  <span className="text-amber-500">{e.sequence.slice(1, 2)}</span>
                                  {e.sequence.slice(2, 8)}
                                  <span className="text-amber-500">{e.sequence.slice(8, 9)}</span>
                                </td>
                                <td className="px-3 py-2 text-center text-xs text-zinc-400">{e.start}</td>
                                <td className="px-3 py-2 text-center font-mono" style={{ color: q.color }}>{e.ic50_estimate}</td>
                                <td className="px-3 py-2 text-center text-xs hidden md:table-cell" style={{ color: q.color }}>{q.label}</td>
                                <td className="px-3 py-2 text-center text-xs hidden md:table-cell">
                                  {e.anchorMatch === 2 ? "✅ P2+P9" : e.anchorMatch === 1 ? "⚠️ 1/2" : "❌ 0/2"}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className="inline-flex items-center justify-center w-10 h-6 rounded-full text-xs font-bold text-white" style={{ backgroundColor: scoreColor(e.score) }}>
                                    {e.score}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400 mt-2">
                    <b>Анкоры</b> выделены жёлтым в последовательности (P2 и P9 для HLA-A*02:01).
                    <b> IC50 &lt; 50 nM</b> = высокий аффинитет, &lt; 500 nM = умеренный.
                  </div>
                </div>

                {/* Educational notes */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-xs text-zinc-500 dark:text-zinc-400">
                  <b>Как это работает:</b><br/>
                  • <b>B-эпитопы</b> — участки белка, распознаваемые антителами. Используем композицию из 4 шкал:
                  гидрофильность (Hopp-Woods 1981), гибкость (Karplus-Schulz 1985), поверхностная доступность (Emini 1985),
                  β-изгибы (Chou-Fasman 1978).<br/>
                  • <b>T-эпитопы</b> — 9-мерные пептиды, представляющиеся MHC-I. Критичны позиции P2 (Leu/Met/Ile/Val)
                  и P9 (Val/Leu/Ile). Алгоритм аппроксимирует BIMAS PSSM для HLA-A*02:01.<br/>
                  • <b>⚠️</b> Готовый кандидат для пептидной вакцины требует валидации (binding assay, T-cell assay in vitro).
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
