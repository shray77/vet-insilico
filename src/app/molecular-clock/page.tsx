"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import HubHeader from "@/components/HubHeader";
import { calculateDivergenceTime, CLOCK_RATES, MOLECULAR_CLOCK_SAMPLES } from "@/lib/molecular-clock";

export default function MolecularClockPage() {
  const [sampleIdx, setSampleIdx] = useState(0);
  const [distance, setDistance] = useState(0.012);
  const [clockRateIdx, setClockRateIdx] = useState(0);
  const [ci, setCi] = useState(0.002);

  const clockRate = CLOCK_RATES[clockRateIdx];
  const result = useMemo(() => calculateDivergenceTime(distance, clockRate.rate, ci), [distance, clockRate, ci]);

  const loadSample = (idx: number) => {
    setSampleIdx(idx);
    const sample = MOLECULAR_CLOCK_SAMPLES[idx];
    if (sample.pairs[0]) {
      setDistance(sample.pairs[0].distance);
      // Find matching clock rate
      const rateIdx = CLOCK_RATES.findIndex(r => r.gene === sample.gene);
      if (rateIdx >= 0) setClockRateIdx(rateIdx);
    }
  };

  return (
    <div className="min-h-screen">
      <HubHeader />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-teal-500">Хаб</Link>
          <span className="mx-1">/</span>
          <span>Molecular Clock Calculator</span>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 p-4 mb-6">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">⏱️ Molecular Clock Calculator</h2>
          <p className="text-sm text-slate-800 dark:text-slate-200">
            Оценка времени расхождения по генетическому расстоянию. Формула: T = d / (2r).
            12 опубликованных clock rates для ветеринарии (ASFV, Influenza, Rabies, FMDV, BVDV, Brucella, mtDNA...).
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Образцы</h3>
            <div className="space-y-2 mb-4">
              {MOLECULAR_CLOCK_SAMPLES.map((s, i) => (
                <button key={i} onClick={() => loadSample(i)}
                  className={`w-full text-left p-3 rounded-lg text-sm transition border ${
                    sampleIdx === i ? "bg-slate-700 text-white border-slate-700"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-slate-300 text-zinc-700 dark:text-zinc-300"
                  }`}>
                  <div className="font-medium">{s.name}</div>
                  <div className={`text-xs ${sampleIdx === i ? "text-slate-200" : "text-zinc-400"}`}>{s.gene}</div>
                </button>
              ))}
            </div>
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Параметры</h3>
            <label className="block mb-3">
              <span className="text-xs text-zinc-500">Генетическое расстояние: <b>{distance}</b> subs/site</span>
              <input type="number" step="0.001" min="0" value={distance} onChange={(e) => setDistance(Number(e.target.value))}
                className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm" />
            </label>
            <label className="block mb-3">
              <span className="text-xs text-zinc-500">Clock rate (ген/организм)</span>
              <select value={clockRateIdx} onChange={(e) => setClockRateIdx(Number(e.target.value))}
                className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm">
                {CLOCK_RATES.map((r, i) => (
                  <option key={i} value={i}>{r.gene} ({r.organism}) — {r.rate.toExponential(1)}</option>
                ))}
              </select>
            </label>
            <label className="block mb-3">
              <span className="text-xs text-zinc-500">SE расстояния (для CI): <b>{ci}</b></span>
              <input type="number" step="0.001" min="0" value={ci} onChange={(e) => setCi(Number(e.target.value))}
                className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm" />
            </label>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-6 text-center">
              <div className="text-xs text-slate-500 mb-1">Время расхождения</div>
              <div className="text-4xl font-bold text-slate-700 dark:text-slate-200">{result.humanReadable}</div>
              <div className="text-sm text-slate-500 mt-2">{result.divergenceTimeYears.toLocaleString()} лет</div>
              <div className="text-xs text-slate-400 mt-1">
                95% CI: {result.lowerBoundYears.toLocaleString()} — {result.upperBoundYears.toLocaleString()} лет
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3">
                <div className="text-xs text-zinc-400">Формула</div>
                <div className="font-mono text-lg">{result.method}</div>
              </div>
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3">
                <div className="text-xs text-zinc-400">Clock rate</div>
                <div className="font-mono text-lg">{result.clockRate.toExponential(2)}</div>
              </div>
            </div>

            <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3">
              <div className="text-xs text-zinc-500 mb-1">Источник clock rate:</div>
              <div className="text-sm">{clockRate.gene} — {clockRate.organism}</div>
              <div className="text-xs text-zinc-400">{clockRate.source}</div>
            </div>

            {MOLECULAR_CLOCK_SAMPLES[sampleIdx].pairs.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Все пары из образца</h3>
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-zinc-100 dark:bg-zinc-900 text-left text-zinc-500">
                        <th className="px-3 py-2">Штамм 1</th>
                        <th className="px-3 py-2">Штамм 2</th>
                        <th className="px-3 py-2 text-right">Distance</th>
                        <th className="px-3 py-2 text-right">Years (изолят)</th>
                        <th className="px-3 py-2 text-right">Years (clock)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOLECULAR_CLOCK_SAMPLES[sampleIdx].pairs.map((p, i) => {
                        const calc = calculateDivergenceTime(p.distance, clockRate.rate);
                        return (
                          <tr key={i} className="border-t border-zinc-200 dark:border-zinc-800">
                            <td className="px-3 py-2">{p.strain1}</td>
                            <td className="px-3 py-2">{p.strain2}</td>
                            <td className="px-3 py-2 text-right font-mono">{p.distance}</td>
                            <td className="px-3 py-2 text-right">{p.yearDiff > 0 ? p.yearDiff : "—"}</td>
                            <td className="px-3 py-2 text-right font-mono">{calc.divergenceTimeYears.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-xs text-zinc-500 dark:text-zinc-400">
              <b>Алгоритм:</b><br/>
              • T = d / (2r), где d = genetic distance (subs/site), r = clock rate (subs/site/year)<br/>
              • Фактор 2: обе линии накапливают мутации независимо<br/>
              • Clock rates варьируются на порядки: mtDNA (10⁻⁸) → HIV (10⁻²)<br/>
              • 95% CI: ±1.96 × SE / (2r)<br/>
              <b>⚠️</b> Молекулярные часы приблизительны. Реальная скорость может зависеть от давления отбора, поколения времени,environmental factors.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
