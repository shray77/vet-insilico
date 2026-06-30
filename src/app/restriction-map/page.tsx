"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import HubHeader from "@/components/HubHeader";
import {
  computeFragments,
  findCuttingEnzymes,
  RESTRICTION_ENZYMES,
  RESTRICTION_SAMPLES,
  type RestrictionEnzyme,
} from "@/lib/restriction";

export default function RestrictionMapPage() {
  const [sampleIdx, setSampleIdx] = useState(0);
  const [sequence, setSequence] = useState(RESTRICTION_SAMPLES[0].seq);
  const [selectedEnzymes, setSelectedEnzymes] = useState<string[]>([]);

  const availableEnzymes = RESTRICTION_ENZYMES;
  const selectedEnzObjs = RESTRICTION_ENZYMES.filter((e) => selectedEnzymes.includes(e.name));

  // Auto-detect which enzymes actually cut this sequence
  const cuttingEnzymes = useMemo(() => {
    if (!sequence || sequence.length < 10) return [];
    return findCuttingEnzymes(sequence);
  }, [sequence]);

  // Auto-select all cutting enzymes on sequence change (if user hasn't manually selected)
  const [userTouched, setUserTouched] = useState(false);
  useEffect(() => {
    if (!userTouched && cuttingEnzymes.length > 0) {
      setSelectedEnzymes(cuttingEnzymes.slice(0, 10).map((c) => c.enzyme.name));
    }
  }, [cuttingEnzymes, userTouched]);

  const result = useMemo(() => {
    if (!sequence || sequence.length < 10) return null;
    return computeFragments(sequence, selectedEnzObjs);
  }, [sequence, selectedEnzymes.join(",")]);

  const loadSample = (idx: number) => {
    setSampleIdx(idx);
    setSequence(RESTRICTION_SAMPLES[idx].seq);
    setUserTouched(false);
    setSelectedEnzymes([]);
  };

  const toggleEnzyme = (name: string) => {
    setUserTouched(true);
    setSelectedEnzymes((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const loadAll = () => { setUserTouched(true); setSelectedEnzymes(RESTRICTION_ENZYMES.map((e) => e.name)); };
  const loadNone = () => { setUserTouched(true); setSelectedEnzymes([]); };
  const loadFrequent = () => { setUserTouched(true); setSelectedEnzymes(RESTRICTION_ENZYMES.filter((e) => e.recognition.length <= 5).map((e) => e.name)); };
  const loadRare = () => { setUserTouched(true); setSelectedEnzymes(RESTRICTION_ENZYMES.filter((e) => e.recognition.length >= 6).map((e) => e.name)); };
  const loadCutting = () => { setUserTouched(true); setSelectedEnzymes(cuttingEnzymes.map((c) => c.enzyme.name)); };

  return (
    <div className="min-h-screen">
      <HubHeader />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-teal-500">Хаб</Link>
          <span className="mx-1">/</span>
          <span>Restriction Map</span>
        </div>

        <div className="rounded-xl bg-lime-50 dark:bg-lime-950/30 border border-lime-200 dark:border-lime-800 p-4 mb-6">
          <h2 className="font-semibold text-lime-900 dark:text-lime-100 mb-1">
            ✂️ Restriction Map — карта сайтов рестриктаз
          </h2>
          <p className="text-sm text-lime-800 dark:text-lime-200">
            Находим сайты разрезания для 30+ рестриктаз (EcoRI, BamHI, HindIII, SmaI...) в ДНК-последовательности.
            Считаем позиции разрезов, размеры фрагментов, симулируем гель-электрофорез.
            Поддержка IUPAC-кодов (N, R, Y, S, W, K, M...).
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input */}
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
              Образцы
            </h3>
            <div className="space-y-2 mb-4">
              {RESTRICTION_SAMPLES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => loadSample(i)}
                  className={`w-full text-left p-3 rounded-lg text-sm transition border ${
                    sampleIdx === i
                      ? "bg-lime-600 text-white border-lime-600"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-lime-300 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <div className="font-medium">{s.name}</div>
                  <div className={`text-xs ${sampleIdx === i ? "text-lime-100" : "text-zinc-400"}`}>
                    {s.pathogen} • {s.seq.length} bp
                  </div>
                </button>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3 mt-4">
              Последовательность (5'→3')
            </h3>
            <textarea
              value={sequence}
              onChange={(e) => setSequence(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono"
            />
            <div className="text-xs text-zinc-400 mt-1">Длина: {sequence.length} bp</div>

            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3 mt-4">
              Ферменты ({selectedEnzymes.length}/{availableEnzymes.length})
              {cuttingEnzymes.length > 0 && (
                <span className="ml-2 text-[10px] text-lime-600 dark:text-lime-400">
                  🔪 {cuttingEnzymes.length} режут эту последовательность
                </span>
              )}
            </h3>
            <div className="flex flex-wrap gap-1 mb-2 text-xs">
              <button onClick={loadCutting} className="px-2 py-1 rounded bg-lime-100 dark:bg-lime-950/40 text-lime-700 dark:text-lime-300 hover:bg-lime-200 font-medium">
                ✂️ Только режущие ({cuttingEnzymes.length})
              </button>
              <button onClick={loadAll} className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200">Все</button>
              <button onClick={loadNone} className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200">Очистить</button>
              <button onClick={loadFrequent} className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200">Частые (4-5)</button>
              <button onClick={loadRare} className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200">Редкие (6+)</button>
            </div>
            <div className="max-h-72 overflow-y-auto thin-scroll border border-zinc-200 dark:border-zinc-800 rounded-lg">
              {availableEnzymes.map((e) => {
                const cutInfo = cuttingEnzymes.find((c) => c.enzyme.name === e.name);
                return (
                  <label
                    key={e.name}
                    className={`flex items-center gap-2 px-2 py-1.5 text-xs border-b border-zinc-100 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 ${
                      selectedEnzymes.includes(e.name) ? "bg-lime-50 dark:bg-lime-950/30" : ""
                    } ${cutInfo ? "border-l-2 border-l-lime-400" : "opacity-60"}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEnzymes.includes(e.name)}
                      onChange={() => toggleEnzyme(e.name)}
                      className="w-3 h-3 accent-lime-600"
                    />
                    <span className="font-mono font-bold w-16">{e.name}</span>
                    <span className="font-mono text-zinc-500 flex-1">{e.recognition}</span>
                    {cutInfo ? (
                      <span className="text-[10px] text-lime-600 dark:text-lime-400 font-bold">×{cutInfo.sites}</span>
                    ) : (
                      <span className="text-[10px] text-zinc-400">{e.recognition.length}bp</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-6">
            {!result ? (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-400">
                Введите последовательность
              </div>
            ) : (
              <>
                {/* Summary */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-gradient-to-r from-lime-50 to-green-50 dark:from-lime-950/30 dark:to-green-950/30">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-bold text-lime-600">{result.cutSites.length}</div>
                    <div>
                      <div className="text-sm font-medium">сайтов разрезания</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {result.perEnzyme.length} фермент(ов) с активностью • {result.length} bp всего
                      </div>
                    </div>
                  </div>
                </div>

                {/* Linear map */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
                    Линейная карта разрезов
                  </h3>
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900 overflow-x-auto">
                    <svg width="100%" height="120" viewBox={`0 0 1000 120`} preserveAspectRatio="xMidYMid meet">
                      {/* DNA line */}
                      <line x1={20} y1={60} x2={980} y2={60} stroke="#52525b" strokeWidth={2} />
                      {/* Position markers */}
                      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                        <g key={f}>
                          <line x1={20 + 960*f} y1={55} x2={20 + 960*f} y2={65} stroke="#52525b" />
                          <text x={20 + 960*f} y={80} textAnchor="middle" fontSize={9} fill="#71717a">
                            {Math.round(f * result.length)}
                          </text>
                        </g>
                      ))}
                      {/* Cut sites */}
                      {result.cutSites.map((site, i) => {
                        const x = 20 + (site.position / result.length) * 960;
                        const color = ["#dc2626", "#0ea5e9", "#16a34a", "#a855f7", "#f97316", "#eab308"][i % 6];
                        return (
                          <g key={i}>
                            <line x1={x} y1={20} x2={x} y2={60} stroke={color} strokeWidth={1.5} />
                            <circle cx={x} cy={20} r={3} fill={color} />
                            <text x={x} y={14} textAnchor="middle" fontSize={9} fill={color} fontWeight="bold">
                              {site.enzyme}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {/* Per-enzyme summary */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
                    По ферментам
                  </h3>
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-zinc-100 dark:bg-zinc-900 text-left text-xs uppercase text-zinc-500">
                          <th className="px-3 py-2">Фермент</th>
                          <th className="px-3 py-2 text-center">Сайтов</th>
                          <th className="px-3 py-2 text-center">Фрагментов</th>
                          <th className="px-3 py-2 text-center">Макс (bp)</th>
                          <th className="px-3 py-2 text-center">Мин (bp)</th>
                          <th className="px-3 py-2 text-center hidden md:table-cell">Тип</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.perEnzyme.map((p) => {
                          const enz = RESTRICTION_ENZYMES.find((e) => e.name === p.enzyme)!;
                          return (
                            <tr key={p.enzyme} className="border-t border-zinc-200 dark:border-zinc-800">
                              <td className="px-3 py-2 font-mono font-bold">{p.enzyme}</td>
                              <td className="px-3 py-2 text-center">{p.sites}</td>
                              <td className="px-3 py-2 text-center">{p.fragments}</td>
                              <td className="px-3 py-2 text-center">{p.largestFragment}</td>
                              <td className="px-3 py-2 text-center">{p.smallestFragment}</td>
                              <td className="px-3 py-2 text-center text-xs hidden md:table-cell">
                                {enz.cutType === "blunt" ? "blunt" : enz.cutType === "5-overhang" ? "5' sticky" : "3' sticky"}
                              </td>
                            </tr>
                          );
                        })}
                        {result.perEnzyme.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-3 py-6 text-center text-zinc-400 text-sm">
                              Выберите ферменты чтобы увидеть сайты разрезания
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Virtual gel */}
                {result.fragments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
                      🧪 Виртуальный гель-электрофорез
                    </h3>
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-900 overflow-x-auto">
                      <div className="flex gap-3 min-w-max">
                        {/* Ladder */}
                        <GelColumn label="Ladder" bands={[10000, 5000, 3000, 2000, 1500, 1000, 500, 250, 100]} seqLen={result.length} color="#71717a" />
                        {result.fragments.map((f) => (
                          <GelColumn key={f.enzyme} label={f.enzyme} bands={f.sizes} seqLen={result.length} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Detailed cut sites */}
                {result.cutSites.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
                      Все сайты ({result.cutSites.length})
                    </h3>
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden max-h-72 overflow-y-auto thin-scroll">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900">
                          <tr className="text-left text-zinc-500">
                            <th className="px-2 py-1.5">Фермент</th>
                            <th className="px-2 py-1.5 text-right">Позиция</th>
                            <th className="px-2 py-1.5 text-right">Top cut</th>
                            <th className="px-2 py-1.5 text-right">Bottom cut</th>
                            <th className="px-2 py-1.5 hidden md:table-cell">Seq</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.cutSites.map((s, i) => (
                            <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                              <td className="px-2 py-1.5 font-mono font-bold">{s.enzyme}</td>
                              <td className="px-2 py-1.5 text-right">{s.position}</td>
                              <td className="px-2 py-1.5 text-right">{s.topCut}</td>
                              <td className="px-2 py-1.5 text-right">{s.bottomCut}</td>
                              <td className="px-2 py-1.5 font-mono text-zinc-400 hidden md:table-cell">{s.matchSeq}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-xs text-zinc-500 dark:text-zinc-400">
                  <b>Алгоритм:</b><br/>
                  • Sliding window search по последовательности для каждого фермента.<br/>
                  • IUPAC-коды: N=any, R=A/G, Y=C/T, S=G/C, W=A/T, K=G/T, M=A/C, B=C/G/T, D=A/G/T, H=A/C/T, V=A/C/G.<br/>
                  • Палиндрные сайты — только top strand. Не-палиндромные (SfiI, HinfI, DdeI) — оба направления.<br/>
                  • Фрагменты: расстояние между последовательными top-strand разрезами.<br/>
                  • Гель-электрофорез: log-scale, фрагменты мигрируют сверху вниз.<br/>
                  <b>⚠️</b> Метилирование (Dam, Dcm) НЕ учитывается. Реальные эксперименты требуют проверки метилирования.
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function GelColumn({ label, bands, seqLen, color = "#a3e635" }: { label: string; bands: number[]; seqLen: number; color?: string }) {
  // log-scale: bigger fragments at top
  const sortedBands = [...bands].sort((a, b) => b - a);
  const maxSize = Math.max(...bands, seqLen);
  const H = 280;
  return (
    <div className="flex flex-col items-center">
      <div className="text-xs font-mono text-zinc-300 mb-1 text-center truncate w-16">{label}</div>
      <div className="relative bg-black rounded" style={{ width: 32, height: H }}>
        {sortedBands.map((size, i) => {
          // log migration: top = big, bottom = small
          const pos = H - 20 - (Math.log(size / maxSize + 1) / Math.log(2)) * 10;
          return (
            <div
              key={i}
              className="absolute left-1 right-1 rounded-sm"
              style={{
                top: `${Math.max(5, pos)}px`,
                height: 3,
                background: color,
                opacity: 0.8 + Math.min(0.2, size / maxSize),
              }}
              title={`${size} bp`}
            />
          );
        })}
      </div>
      <div className="text-[9px] text-zinc-500 mt-1">{bands.length} bands</div>
    </div>
  );
}
