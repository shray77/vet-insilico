"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import HubHeader from "@/components/HubHeader";
import { analyzePlasmid, PLASMID_SAMPLES, RESTRICTION_ENZYMES } from "@/lib/plasmid";

export default function PlasmidMapPage() {
  const [sampleIdx, setSampleIdx] = useState(0);
  const [sequence, setSequence] = useState(PLASMID_SAMPLES[0].seq);
  const [selectedEnzymes, setSelectedEnzymes] = useState<string[]>(["EcoRI", "BamHI", "HindIII", "PstI", "SmaI"]);

  const result = useMemo(() => {
    if (!sequence || sequence.length < 30) return null;
    return analyzePlasmid(sequence, selectedEnzymes);
  }, [sequence, selectedEnzymes.join(",")]);

  const loadSample = (idx: number) => {
    setSampleIdx(idx);
    setSequence(PLASMID_SAMPLES[idx].seq);
  };

  const toggleEnzyme = (name: string) => {
    setSelectedEnzymes(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  return (
    <div className="min-h-screen">
      <HubHeader />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-teal-500">Хаб</Link>
          <span className="mx-1">/</span>
          <span>Plasmid Map Designer</span>
        </div>
        <div className="rounded-xl bg-stone-50 dark:bg-stone-950/30 border border-stone-200 dark:border-stone-800 p-4 mb-6">
          <h2 className="font-semibold text-stone-900 dark:text-stone-100 mb-1">🧫 Plasmid Map Designer — ORF + restriction sites</h2>
          <p className="text-sm text-stone-800 dark:text-stone-200">
            Анализ плазмидных последовательностей: поиск ORF (ATG/GTG/TTG → stop на обеих цепях),
            сайты рестриктаз, GC content. Визуализация circular map.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Образцы</h3>
            <div className="space-y-2 mb-4">
              {PLASMID_SAMPLES.map((s, i) => (
                <button key={i} onClick={() => loadSample(i)}
                  className={`w-full text-left p-3 rounded-lg text-sm transition border ${
                    sampleIdx === i ? "bg-stone-700 text-white border-stone-700"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-stone-300 text-zinc-700 dark:text-zinc-300"
                  }`}>
                  <div className="font-medium">{s.name}</div>
                  <div className={`text-xs ${sampleIdx === i ? "text-stone-200" : "text-zinc-400"}`}>{s.desc}</div>
                </button>
              ))}
            </div>
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Ферменты</h3>
            <div className="max-h-48 overflow-y-auto thin-scroll border border-zinc-200 dark:border-zinc-800 rounded-lg">
              {RESTRICTION_ENZYMES.filter(e => e.recognition.length >= 4 && e.recognition.length <= 6).map(e => (
                <label key={e.name} className="flex items-center gap-2 px-2 py-1 text-xs border-b border-zinc-100 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <input type="checkbox" checked={selectedEnzymes.includes(e.name)} onChange={() => toggleEnzyme(e.name)} className="w-3 h-3 accent-stone-600" />
                  <span className="font-mono font-bold w-12">{e.name}</span>
                  <span className="font-mono text-zinc-500 flex-1">{e.recognition}</span>
                </label>
              ))}
            </div>
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3 mt-4">Последовательность</h3>
            <textarea value={sequence} onChange={(e) => setSequence(e.target.value)} rows={5}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono" />
          </div>
          <div className="lg:col-span-2 space-y-6">
            {!result ? (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-400">Введите последовательность</div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                    <div className="text-xs text-zinc-400">Длина</div>
                    <div className="text-xl font-bold text-stone-600 dark:text-stone-300">{result.length} bp</div>
                  </div>
                  <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                    <div className="text-xs text-zinc-400">GC%</div>
                    <div className="text-xl font-bold text-stone-600 dark:text-stone-300">{result.gc}%</div>
                  </div>
                  <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                    <div className="text-xs text-zinc-400">ORF</div>
                    <div className="text-xl font-bold text-stone-600 dark:text-stone-300">{result.orfs.length}</div>
                  </div>
                  <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                    <div className="text-xs text-zinc-400">Cut sites</div>
                    <div className="text-xl font-bold text-stone-600 dark:text-stone-300">{result.cutSites.length}</div>
                  </div>
                </div>

                {/* Circular plasmid map */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Circular map</h3>
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900 overflow-x-auto">
                    <svg width="400" height="400" viewBox="0 0 400 400" className="max-w-full">
                      {/* Outer circle */}
                      <circle cx="200" cy="200" r="160" fill="none" stroke="#a8a29e" strokeWidth="2" />
                      {/* Cut site marks */}
                      {result.cutSites.map((site, i) => {
                        const angle = (site.position / result.length) * 360 - 90;
                        const rad = (angle * Math.PI) / 180;
                        const x1 = 200 + 155 * Math.cos(rad);
                        const y1 = 200 + 155 * Math.sin(rad);
                        const x2 = 200 + 175 * Math.cos(rad);
                        const y2 = 200 + 175 * Math.sin(rad);
                        const labelX = 200 + 190 * Math.cos(rad);
                        const labelY = 200 + 190 * Math.sin(rad);
                        const color = ["#dc2626", "#0ea5e9", "#16a34a", "#a855f7", "#f97316", "#eab308"][i % 6];
                        return (
                          <g key={i}>
                            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2" />
                            <text x={labelX} y={labelY} fontSize="8" fill={color} textAnchor="middle" dy="3">{site.enzyme}</text>
                          </g>
                        );
                      })}
                      {/* ORF arcs */}
                      {result.orfs.slice(0, 5).map((orf, i) => {
                        const startAngle = (orf.start / result.length) * 360 - 90;
                        const endAngle = (orf.end / result.length) * 360 - 90;
                        const r = 130 - i * 15;
                        const startRad = (startAngle * Math.PI) / 180;
                        const endRad = (endAngle * Math.PI) / 180;
                        const x1 = 200 + r * Math.cos(startRad);
                        const y1 = 200 + r * Math.sin(startRad);
                        const x2 = 200 + r * Math.cos(endRad);
                        const y2 = 200 + r * Math.sin(endRad);
                        const largeArc = endAngle - startAngle > 180 ? 1 : 0;
                        const color = orf.strand === "+" ? "#16a34a" : "#dc2626";
                        return (
                          <path key={i} d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
                            fill="none" stroke={color} strokeWidth="4" opacity="0.6" />
                        );
                      })}
                      {/* Center text */}
                      <text x="200" y="195" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#71717a">{result.length} bp</text>
                      <text x="200" y="210" textAnchor="middle" fontSize="9" fill="#a8a29e">GC: {result.gc}%</text>
                    </svg>
                  </div>
                </div>

                {/* ORFs */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Open Reading Frames (top 10)</h3>
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-zinc-100 dark:bg-zinc-900 text-left text-zinc-500">
                          <th className="px-2 py-1.5">#</th>
                          <th className="px-2 py-1.5">Start</th>
                          <th className="px-2 py-1.5">End</th>
                          <th className="px-2 py-1.5">Len (bp)</th>
                          <th className="px-2 py-1.5">Strand</th>
                          <th className="px-2 py-1.5">Protein (first 30 aa)</th>
                          <th className="px-2 py-1.5">GC%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.orfs.slice(0, 10).map((orf, i) => (
                          <tr key={i} className="border-t border-zinc-200 dark:border-zinc-800">
                            <td className="px-2 py-1.5 text-zinc-400">{i + 1}</td>
                            <td className="px-2 py-1.5 font-mono">{orf.start}</td>
                            <td className="px-2 py-1.5 font-mono">{orf.end}</td>
                            <td className="px-2 py-1.5">{orf.length}</td>
                            <td className="px-2 py-1.5"><span className={orf.strand === "+" ? "text-green-500" : "text-red-500"}>{orf.strand}</span></td>
                            <td className="px-2 py-1.5 font-mono text-[10px]">{orf.protein.slice(0, 30)}{orf.protein.length > 30 ? "..." : ""}</td>
                            <td className="px-2 py-1.5">{orf.gc}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Cut sites */}
                {result.cutSites.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Restriction sites ({result.cutSites.length})</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {result.cutSites.map((s, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300 font-mono">
                          {s.enzyme} @{s.position}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
