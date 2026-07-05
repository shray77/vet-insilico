"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import HubHeader from "@/components/HubHeader";
import { findGuides, CRISPR_SAMPLES } from "@/lib/crispr";

export default function CrisprPage() {
  const [sampleIdx, setSampleIdx] = useState(0);
  const [sequence, setSequence] = useState(CRISPR_SAMPLES[0].seq);
  const [minScore, setMinScore] = useState(20);

  const results = useMemo(() => {
    if (!sequence || sequence.length < 23) return [];
    return findGuides(sequence);
  }, [sequence]);

  const loadSample = (idx: number) => {
    setSampleIdx(idx);
    setSequence(CRISPR_SAMPLES[idx].seq);
  };

  const filtered = results.filter(g => g.onTargetScore >= minScore);

  const scoreColor = (s: number) => s >= 75 ? "#16a34a" : s >= 50 ? "#eab308" : "#dc2626";
  const specColor = (s: number) => s >= 80 ? "#16a34a" : s >= 50 ? "#eab308" : "#dc2626";

  return (
    <div className="min-h-screen">
      <HubHeader />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-teal-500">Хаб</Link>
          <span className="mx-1">/</span>
          <span>CRISPR gRNA Designer</span>
        </div>
        <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 p-4 mb-6">
          <h2 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-1">🧬 CRISPR gRNA Designer — SpCas9</h2>
          <p className="text-sm text-indigo-800 dark:text-indigo-200">
            Поиск guide RNA (20-mer + NGG PAM) на обеих цепях. On-target score (Doench 2016 упрощённо),
            off-target проверка против геномов хозяев, GC content, hairpin ΔG.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Образцы генов-мишеней</h3>
            <div className="space-y-2 mb-4">
              {CRISPR_SAMPLES.map((s, i) => (
                <button key={i} onClick={() => loadSample(i)}
                  className={`w-full text-left p-3 rounded-lg text-sm transition border ${
                    sampleIdx === i ? "bg-indigo-600 text-white border-indigo-600"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-indigo-300 text-zinc-700 dark:text-zinc-300"
                  }`}>
                  <div className="font-medium">{s.name}</div>
                  <div className={`text-xs ${sampleIdx === i ? "text-indigo-100" : "text-zinc-400"}`}>{s.gene} • {s.species}</div>
                </button>
              ))}
            </div>
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Последовательность мишени</h3>
            <textarea value={sequence} onChange={(e) => setSequence(e.target.value)} rows={6}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono" />
            <div className="text-xs text-zinc-400 mt-1">Длина: {sequence.length} bp</div>
            <label className="block mt-4">
              <span className="text-xs text-zinc-500">Мин. on-target score: <b>{minScore}</b></span>
              <input type="range" min={0} max={100} value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-full accent-indigo-600 mt-1" />
            </label>
          </div>
          <div className="lg:col-span-2 space-y-6">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-400">
                {sequence.length < 23 ? "Последовательность слишком короткая (мин. 23 bp для 20-mer + PAM)" : "Нет гайдов с score ≥ " + minScore}
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-bold text-indigo-600">{filtered.length}</div>
                    <div>
                      <div className="text-sm font-medium">gRNA кандидатов найдено</div>
                      <div className="text-xs text-zinc-500">Лучшая: score {filtered[0]?.onTargetScore}, specificity {filtered[0]?.specificity}</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {filtered.slice(0, 15).map((g, i) => (
                    <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-mono text-sm font-bold">
                            <span className="text-indigo-600 dark:text-indigo-400">5'-{g.sequence}-3'</span>
                            <span className="ml-2 text-amber-500 font-bold">PAM: {g.pam}</span>
                          </div>
                          <div className="text-xs text-zinc-400 mt-1">
                            Позиция {g.position} • цепь {g.strand} • GC {g.gc}% • {g.startsWithG ? "✓ начинается с G" : "⚠ без G на 5'"} • hairpin ΔG={g.hairpin}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold" style={{ color: scoreColor(g.onTargetScore) }}>{g.onTargetScore}</div>
                          <div className="text-[10px] text-zinc-400">on-target</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div className="text-xs">
                          <span className="text-zinc-500">Специфичность: </span>
                          <b style={{ color: specColor(g.specificity) }}>{g.specificity}/100</b>
                          {g.offTargets.length > 0 && (
                            <span className="text-zinc-400 ml-2">({g.offTargets.length} off-target)</span>
                          )}
                        </div>
                        <div className="text-xs">
                          {g.offTargets.length === 0 ? (
                            <span className="text-green-500">✓ Нет off-target в геномах хозяев</span>
                          ) : (
                            <span className="text-amber-500">⚠ {g.offTargets.length} совпадений</span>
                          )}
                        </div>
                      </div>
                      {g.offTargets.length > 0 && (
                        <div className="mt-2 text-[10px] text-zinc-400">
                          {g.offTargets.slice(0, 3).map((h, j) => (
                            <span key={j} className="mr-2">{h.commonName} (mm={h.mismatches})</span>
                          ))}
                          {g.offTargets.length > 3 && <span>+{g.offTargets.length - 3} ещё</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-xs text-zinc-500 dark:text-zinc-400">
                  <b>Алгоритм:</b><br/>
                  • PAM: NGG для SpCas9 (поиск на обеих цепях)<br/>
                  • On-target score: упрощённый Doench 2016 (позиционные веса + GC + poly-T check)<br/>
                  • Off-target: 12-mer seed (PAM-проксимальный) против геномов свинья/КРС/человек<br/>
                  • Hairpin: DP self-complementarity, ΔG ≤ -3 = проблема<br/>
                  <b>⚠️</b> Перед экспериментом — проверьте через CRISPOR или Cas-OFFinder.
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
