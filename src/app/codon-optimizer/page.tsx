"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import HubHeader from "@/components/HubHeader";
import { optimizeCodons, AVAILABLE_SPECIES, CODON_OPTIMIZATION_SAMPLES } from "@/lib/codon";

export default function CodonOptimizerPage() {
  const [sampleIdx, setSampleIdx] = useState(0);
  const [inputDNA, setInputDNA] = useState(CODON_OPTIMIZATION_SAMPLES[0].seq);
  const [species, setSpecies] = useState(CODON_OPTIMIZATION_SAMPLES[0].species);
  const [avoidRS, setAvoidRS] = useState(true);
  const [avoidHP, setAvoidHP] = useState(true);

  const result = useMemo(() => {
    if (!inputDNA || inputDNA.length < 6) return null;
    try {
      return optimizeCodons(inputDNA, species, { avoidRestrictionSites: avoidRS, avoidHairpins: avoidHP });
    } catch (e: any) {
      return null;
    }
  }, [inputDNA, species, avoidRS, avoidHP]);

  const loadSample = (idx: number) => {
    setSampleIdx(idx);
    setInputDNA(CODON_OPTIMIZATION_SAMPLES[idx].seq);
    setSpecies(CODON_OPTIMIZATION_SAMPLES[idx].species);
  };

  return (
    <div className="min-h-screen">
      <HubHeader />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-teal-500">Хаб</Link>
          <span className="mx-1">/</span>
          <span>Codon Optimization</span>
        </div>
        <div className="rounded-xl bg-fuchsia-50 dark:bg-fuchsia-950/30 border border-fuchsia-200 dark:border-fuchsia-800 p-4 mb-6">
          <h2 className="font-semibold text-fuchsia-900 dark:text-fuchsia-100 mb-1">🔤 Codon Optimization Tool</h2>
          <p className="text-sm text-fuchsia-800 dark:text-fuchsia-200">
            Оптимизация кодонов под экспрессию в организме-хозяине. Таблицы Kazusa для свиньи, КРС, курицы, E. coli.
            CAI (Codon Adaptation Index), избегание сайтов рестриктаз и шпилек.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Образцы</h3>
            <div className="space-y-2 mb-4">
              {CODON_OPTIMIZATION_SAMPLES.map((s, i) => (
                <button key={i} onClick={() => loadSample(i)}
                  className={`w-full text-left p-3 rounded-lg text-sm transition border ${
                    sampleIdx === i ? "bg-fuchsia-600 text-white border-fuchsia-600"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-fuchsia-300 text-zinc-700 dark:text-zinc-300"
                  }`}>
                  <div className="font-medium">{s.name}</div>
                  <div className={`text-xs ${sampleIdx === i ? "text-fuchsia-100" : "text-zinc-400"}`}>{s.species}</div>
                </button>
              ))}
            </div>
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Целевой организм</h3>
            <select value={species} onChange={(e) => setSpecies(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm mb-4">
              {AVAILABLE_SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="space-y-2 mb-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={avoidRS} onChange={(e) => setAvoidRS(e.target.checked)}
                  className="w-4 h-4 accent-fuchsia-600" />
                <span>Избегать сайты рестриктаз</span>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={avoidHP} onChange={(e) => setAvoidHP(e.target.checked)}
                  className="w-4 h-4 accent-fuchsia-600" />
                <span>Избегать шпильки (hairpins)</span>
              </label>
            </div>
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Входная ДНК (CDS)</h3>
            <textarea value={inputDNA} onChange={(e) => setInputDNA(e.target.value)} rows={6}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono" />
            <div className="text-xs text-zinc-400 mt-1">Длина: {inputDNA.length} bp</div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            {!result ? (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-400">Введите ДНК последовательность</div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                    <div className="text-xs text-zinc-400">CAI</div>
                    <div className="text-xl font-bold text-fuchsia-600">{result.cai}</div>
                  </div>
                  <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                    <div className="text-xs text-zinc-400">GC%</div>
                    <div className="text-xl font-bold text-fuchsia-600">{result.gc}%</div>
                  </div>
                  <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                    <div className="text-xs text-zinc-400">Rest. sites</div>
                    <div className="text-xl font-bold text-amber-600">{result.restrictionSitesAvoided.length}</div>
                  </div>
                  <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                    <div className="text-xs text-zinc-400">Hairpins</div>
                    <div className="text-xl font-bold text-amber-600">{result.hairpins}</div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Оптимизированная ДНК</h3>
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900 overflow-x-auto">
                    <pre className="text-xs font-mono break-all whitespace-pre-wrap">{result.optimizedDNA}</pre>
                  </div>
                  <button onClick={() => navigator.clipboard?.writeText(result.optimizedDNA)}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-300 text-xs font-medium hover:bg-fuchsia-200 transition">
                    📋 Копировать
                  </button>
                </div>
                {result.restrictionSitesAvoided.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Избегаемые сайты рестриктаз</h3>
                    <div className="flex flex-wrap gap-2">
                      {result.restrictionSitesAvoided.map(s => (
                        <span key={s} className="text-xs px-2 py-1 rounded bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-mono">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-xs text-zinc-500 dark:text-zinc-400">
                  <b>Алгоритм:</b><br/>
                  • Таблицы Kazusa для каждого вида (частота кодонов на 1000)<br/>
                  • Для каждой аминокислоты выбирается наиболее частый кодон<br/>
                  • Если создаёт сайт рестриктазы — берётся следующий по частоте<br/>
                  • CAI = геометрическое среднее относительных частот, 1.0 = идеально<br/>
                  • GC 40-60% оптимально для стабильности и экспрессии<br/>
                  <b>⚠️</b> Проверьте результат in silico (BLAST, Bauccle) перед синтезом.
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
