"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import HubHeader from "@/components/HubHeader";
import { predictAMR, getAffectedDrugs, AMR_SAMPLES } from "@/lib/amr";
import { DRUGS } from "@/data/drugs";

export default function AMRPage() {
  const [seqIdx, setSeqIdx] = useState(0);
  const [sequence, setSequence] = useState(AMR_SAMPLES[0].seq);

  const result = useMemo(() => {
    if (!sequence || sequence.length < 20) return null;
    return predictAMR(sequence);
  }, [sequence]);

  const affectedDrugs = useMemo(() => {
    if (!result) return [];
    return getAffectedDrugs(result, DRUGS);
  }, [result]);

  const loadSample = (idx: number) => {
    setSeqIdx(idx);
    setSequence(AMR_SAMPLES[idx].seq);
  };

  const levelColor = (lvl: string) =>
    lvl === "susceptible" ? "#16a34a" : lvl === "intermediate" ? "#eab308" : "#dc2626";
  const levelLabel = (lvl: string) =>
    lvl === "susceptible" ? "Чувствителен" : lvl === "intermediate" ? "Промежуточный" : "Резистентен";

  return (
    <div className="min-h-screen">
      <HubHeader />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-teal-500">Хаб</Link>
          <span className="mx-1">/</span>
          <span>Antimicrobial Resistance Predictor</span>
        </div>

        <div className="rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 p-4 mb-6">
          <h2 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
            🦠 Antimicrobial Resistance Predictor
          </h2>
          <p className="text-sm text-orange-800 dark:text-orange-200">
            По последовательности гена-мишени (GyrA, RpoB, PBP, 16S rRNA) предсказываем резистентность к классам антибиотиков.
            Rule-based поиск известных мутаций (CARD/ResFinder) + motif search для резистентных генов (blaTEM, ermB, tetM...).
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input */}
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
              Образцы
            </h3>
            <div className="space-y-2 mb-4">
              {AMR_SAMPLES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => loadSample(i)}
                  className={`w-full text-left p-3 rounded-lg text-sm transition border ${
                    seqIdx === i
                      ? "bg-orange-600 text-white border-orange-600"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-orange-300 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <div className="font-medium">{s.name}</div>
                  <div className={`text-xs ${seqIdx === i ? "text-orange-100" : "text-zinc-400"}`}>
                    {s.description}
                  </div>
                </button>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3 mt-4">
              Последовательность гена-мишени
            </h3>
            <textarea
              value={sequence}
              onChange={(e) => setSequence(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono"
              placeholder="MKTAYIAKQRQ..."
            />
            <div className="text-xs text-zinc-400 mt-1">Длина: {sequence.length} симв.</div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-6">
            {!result ? (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-400">
                Введите последовательность
              </div>
            ) : (
              <>
                {/* Overall score */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
                  <div className="flex items-center gap-4">
                    <div className="relative w-24 h-24">
                      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-zinc-200 dark:text-zinc-800" />
                        <circle cx="40" cy="40" r="34" fill="none" stroke={result.overallScore < 25 ? "#16a34a" : result.overallScore < 60 ? "#eab308" : "#dc2626"} strokeWidth="6" strokeDasharray={`${(result.overallScore / 100) * 213.6} 213.6`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
                        {result.overallScore}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Overall resistance score</div>
                      <div className="text-xl font-bold">
                        {result.overallScore < 25 ? "Чувствителен" : result.overallScore < 60 ? "Частичная резистентность" : "Резистентен"}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        Найдено хитов: {result.hits.length} • генов резистентности: {result.resistanceGenes.length}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Per-class scores */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
                    По классам антибиотиков
                  </h3>
                  {result.classScores.length === 0 ? (
                    <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-3 text-xs text-green-700 dark:text-green-300">
                      ✅ Классы с известной резистентностью не обнаружены
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {result.classScores.map((c, i) => (
                        <div key={i} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-900">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{c.drugClass}</span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: levelColor(c.level) }}>
                              {levelLabel(c.level)} ({c.score}/100)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${c.score}%`, backgroundColor: levelColor(c.level) }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Detected hits */}
                {result.hits.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
                      🔬 Детектированные детерминанты ({result.hits.length})
                    </h3>
                    <div className="space-y-2">
                      {result.hits.map((h, i) => (
                        <div key={i} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-900">
                          <div className="flex items-start justify-between mb-1">
                            <div>
                              <span className="font-medium text-sm">{h.drugClass}</span>
                              <span className="text-xs text-zinc-400 ml-2">
                                pos {h.position} • {h.wildType}→{h.mutant}
                              </span>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `rgba(220, 38, 38, ${0.15 + h.confidence/200})`, color: h.confidence > 70 ? "white" : "#dc2626" }}>
                              conf {h.confidence}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">{h.mechanism}</p>
                          <div className="text-[10px] text-zinc-400 mt-1">
                            Affected: {h.drugExamples.join(", ")} • {h.source}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Affected drugs from our DB */}
                {affectedDrugs.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
                      💊 Препараты из базы VetInSilico ({affectedDrugs.length})
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {affectedDrugs.slice(0, 30).map((d) => (
                        <span key={d.id} className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                          {d.name}
                        </span>
                      ))}
                      {affectedDrugs.length > 30 && (
                        <span className="text-xs text-zinc-400">+ {affectedDrugs.length - 30} ещё</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Recommendation */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900">
                  <h3 className="font-semibold mb-2">📋 Рекомендация</h3>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">{result.recommendation}</p>
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-xs text-zinc-500 dark:text-zinc-400">
                  <b>Алгоритм:</b><br/>
                  • Rule-based поиск известных мутаций (CARD/ResFinder subset) — для GyrA, RpoB, PBP, 23S rRNA, FolP.<br/>
                  • Motif search для резистентных генов: blaTEM, blaSHV, blaCTX-M, tetM, ermB, aac(3)-IV, qnrA.<br/>
                  • Confidence 75-95% для каноничных мутаций.<br/>
                  <b>⚠️</b> Упрощённая база (~10 генов + ~7 motifs). Реальная AMR-прогнозизация требует WGS + CARD/ResFinder + фенотипическую валидацию.
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
