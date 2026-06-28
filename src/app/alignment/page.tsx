"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import HubHeader from "@/components/HubHeader";
import {
  needlemanWunsch,
  smithWaterman,
  ALIGNMENT_SAMPLES,
  type SeqType,
  type AlignmentResult,
} from "@/lib/alignment";

export default function AlignmentPage() {
  const [seqA, setSeqA] = useState(ALIGNMENT_SAMPLES[0].seqs.a);
  const [seqB, setSeqB] = useState(ALIGNMENT_SAMPLES[0].seqs.b);
  const [seqType, setSeqType] = useState<SeqType>(ALIGNMENT_SAMPLES[0].seqs.type);
  const [selectedSample, setSelectedSample] = useState(0);
  const [algorithm, setAlgorithm] = useState<"needleman-wunsch" | "smith-waterman">("needleman-wunsch");
  const [gapPenalty, setGapPenalty] = useState(-8);

  const loadSample = (idx: number) => {
    setSelectedSample(idx);
    setSeqA(ALIGNMENT_SAMPLES[idx].seqs.a);
    setSeqB(ALIGNMENT_SAMPLES[idx].seqs.b);
    setSeqType(ALIGNMENT_SAMPLES[idx].seqs.type);
  };

  const result: AlignmentResult | null = useMemo(() => {
    if (!seqA || !seqB || seqA.length < 2 || seqB.length < 2) return null;
    try {
      return algorithm === "needleman-wunsch"
        ? needlemanWunsch(seqA, seqB, seqType, gapPenalty)
        : smithWaterman(seqA, seqB, seqType, gapPenalty);
    } catch {
      return null;
    }
  }, [seqA, seqB, seqType, algorithm, gapPenalty]);

  // Wrap long alignment at 60 chars per block
  const blocks: { a: string; m: string; b: string; pos: number }[] = [];
  if (result) {
    const blockSize = 60;
    for (let i = 0; i < result.alignedA.length; i += blockSize) {
      blocks.push({
        a: result.alignedA.slice(i, i + blockSize),
        m: result.matchLine.slice(i, i + blockSize),
        b: result.alignedB.slice(i, i + blockSize),
        pos: i + 1,
      });
    }
  }

  // Stats bar color
  const identityColor = (id: number) =>
    id >= 90 ? "#16a34a" : id >= 70 ? "#84cc16" : id >= 50 ? "#eab308" : id >= 30 ? "#f97316" : "#dc2626";

  return (
    <div className="min-h-screen">
      <HubHeader />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-teal-500">Хаб</Link>
          <span className="mx-1">/</span>
          <span>Sequence Alignment</span>
        </div>

        <div className="rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 p-4 mb-6">
          <h2 className="font-semibold text-cyan-900 dark:text-cyan-100 mb-1">
            🔗 Sequence Alignment — Needleman-Wunsch + Smith-Waterman
          </h2>
          <p className="text-sm text-cyan-800 dark:text-cyan-200">
            Попарное выравнивание последовательностей. Глобальное (NW, для гомологичных	seqов) или локальное (SW, для поиска консервативных доменов).
            Скоринг: BLOSUM62 (белки) или match/mismatch (ДНК).
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input */}
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
              Образцы
            </h3>
            <div className="space-y-2 mb-4">
              {ALIGNMENT_SAMPLES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => loadSample(i)}
                  className={`w-full text-left p-3 rounded-lg text-sm transition border ${
                    selectedSample === i
                      ? "bg-cyan-600 text-white border-cyan-600"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-cyan-300 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <div className="font-medium">{s.name}</div>
                  <div className={`text-xs ${selectedSample === i ? "text-cyan-100" : "text-zinc-400"}`}>
                    {s.pathogen} • {s.seqs.type}
                  </div>
                </button>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3 mt-4">
              Алгоритм
            </h3>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setAlgorithm("needleman-wunsch")}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition ${
                  algorithm === "needleman-wunsch"
                    ? "bg-cyan-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
                }`}
              >
                🌐 Needleman-Wunsch<br/><span className="text-[10px] opacity-75">global</span>
              </button>
              <button
                onClick={() => setAlgorithm("smith-waterman")}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition ${
                  algorithm === "smith-waterman"
                    ? "bg-cyan-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
                }`}
              >
                🔍 Smith-Waterman<br/><span className="text-[10px] opacity-75">local</span>
              </button>
            </div>

            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
              Тип последовательности
            </h3>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSeqType("protein")}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  seqType === "protein"
                    ? "bg-teal-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200"
                }`}
              >
                Белок (BLOSUM62)
              </button>
              <button
                onClick={() => setSeqType("dna")}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  seqType === "dna"
                    ? "bg-teal-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200"
                }`}
              >
                ДНК (+2/-1)
              </button>
            </div>

            <label className="block mb-4">
              <span className="text-xs text-zinc-500">Gap penalty: <b>{gapPenalty}</b></span>
              <input
                type="range"
                min={-20}
                max={-2}
                value={gapPenalty}
                onChange={(e) => setGapPenalty(Number(e.target.value))}
                className="w-full accent-cyan-600 mt-1"
              />
            </label>

            <label className="block mb-3">
              <span className="text-xs text-zinc-500">Sequence A ({seqA.length} симв.)</span>
              <textarea
                value={seqA}
                onChange={(e) => setSeqA(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono"
              />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-500">Sequence B ({seqB.length} симв.)</span>
              <textarea
                value={seqB}
                onChange={(e) => setSeqB(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono"
              />
            </label>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-6">
            {!result ? (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-400">
                Введите две последовательности
              </div>
            ) : (
              <>
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                    <div className="text-xs text-zinc-400">Score</div>
                    <div className="text-xl font-bold text-cyan-600">{result.score}</div>
                  </div>
                  <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                    <div className="text-xs text-zinc-400">Identity</div>
                    <div className="text-xl font-bold" style={{ color: identityColor(result.identity) }}>
                      {result.identity}%
                    </div>
                  </div>
                  <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                    <div className="text-xs text-zinc-400">Similarity</div>
                    <div className="text-xl font-bold text-teal-600">{result.similarity}%</div>
                  </div>
                  <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                    <div className="text-xs text-zinc-400">Gaps</div>
                    <div className="text-xl font-bold text-amber-600">{result.gaps}</div>
                  </div>
                  <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                    <div className="text-xs text-zinc-400">Length</div>
                    <div className="text-xl font-bold text-zinc-600 dark:text-zinc-300">{result.length}</div>
                  </div>
                </div>

                {/* Alignment */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
                    Выравнивание ({result.algorithm === "needleman-wunsch" ? "глобальное" : "локальное"})
                  </h3>
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900 overflow-x-auto thin-scroll">
                    <pre className="text-xs font-mono leading-5">
                      {blocks.map((b, i) => (
                        <div key={i} className="mb-3">
                          <div>
                            <span className="text-zinc-400 mr-2 select-none">{String(b.pos).padStart(5, " ")}</span>
                            <span className="text-teal-600 dark:text-teal-400">{b.a}</span>
                          </div>
                          <div>
                            <span className="text-zinc-400 mr-2 select-none">{"     "}</span>
                            <span className="text-zinc-500">{b.m}</span>
                          </div>
                          <div>
                            <span className="text-zinc-400 mr-2 select-none">{String(b.pos).padStart(5, " ")}</span>
                            <span className="text-purple-600 dark:text-purple-400">{b.b}</span>
                          </div>
                        </div>
                      ))}
                    </pre>
                  </div>
                  <div className="text-xs text-zinc-400 mt-2 flex flex-wrap gap-3">
                    <span><b className="text-teal-600">|</b> совпадение</span>
                    <span><b className="text-zinc-500">:</b> похожие (BLOSUM62 &gt; 0)</span>
                    <span><b className="text-zinc-400">.</b> различие</span>
                    <span><b className="text-zinc-300">_</b> gap</span>
                  </div>
                </div>

                {/* Algorithm details */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-xs text-zinc-500 dark:text-zinc-400">
                  <b>Алгоритм:</b>{" "}
                  {algorithm === "needleman-wunsch"
                    ? "Needleman-Wunsch (1970) — глобальное выравнивание через DP. Сложность O(mn). Оптимально для гомологичных последовательностей."
                    : "Smith-Waterman (1981) — локальное выравнивание через DP. Оптимально для поиска консервативных доменов в расходящихся последовательностях."}
                  <br/>
                  <b>Матрица скоринга:</b> {seqType === "protein" ? "BLOSUM62 (Henikoff 1992)" : "+2 за совпадение, −1 за различие"}.
                  <b> Gap penalty:</b> {gapPenalty} (линейный).
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
