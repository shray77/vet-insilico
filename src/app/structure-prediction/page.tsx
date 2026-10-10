"use client";

import { useState, useRef } from "react";
import { ToolPageLayout, LoadingPanel, EmptyPanel, ErrorAlert, CopyButton } from "@/components/ui";
import { SequenceSearch } from "@/components/SequenceSearch";
import Viewer3D from "@/components/Viewer3D";
import { predictStructure, plddtColor, qualityLabel, type StructurePrediction } from "@/lib/esmfold";
import { SAMPLE_SEQUENCES } from "@/lib/epitopes";
import { Dna, Download, X, Clock } from "lucide-react";

export default function StructurePredictionPage() {
  const [sequence, setSequence] = useState(SAMPLE_SEQUENCES[0]?.seq?.slice(0, 200) || "");
  const [sampleIdx, setSampleIdx] = useState(0);
  const [result, setResult] = useState<StructurePrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPdb, setShowPdb] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const run = async () => {
    if (!sequence || sequence.length < 30) {
      setError("Минимум 30 аминокислот");
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await predictStructure(sequence, ctrl.signal);
      setResult(res);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const cancel = () => { abortRef.current?.abort(); setLoading(false); };

  const qualityColor = (q: string) => q === "high" ? "#0053D6" : q === "medium" ? "#FFDB13" : "#FF7D45";

  // Download PDB as file
  const downloadPdb = () => {
    if (!result) return;
    const blob = new Blob([result.pdb], { type: "chemical/x-pdb" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `predicted_${sequence.length}aa.pdb`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ToolPageLayout
      name="Structure Prediction"
      icon="🧬"
      color="blue"
      description="Предсказание 3D-структуры белка через ESMFold (Meta AI). Введите последовательность → получите PDB + pLDDT confidence. Бесплатно на HF."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input */}
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Входные данные</h3>

          <div className="mb-4">
            <span className="text-xs text-zinc-500 block mb-1.5">Примеры:</span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_SEQUENCES.slice(0, 4).map((s, i) => (
                <button key={i} onClick={() => { setSampleIdx(i); setSequence(s.seq.slice(0, 300)); }}
                  className={`px-2 py-1 rounded-md text-xs border transition-colors ${
                    i === sampleIdx ? "bg-blue-500 text-white border-blue-500" : "border-zinc-200 dark:border-zinc-700 hover:bg-accent"
                  }`}>{s.name}</button>
              ))}
            </div>
          </div>

          <SequenceSearch compact onSelect={(seq) => setSequence(seq)} />

          <label className="block mt-2 mb-3">
            <span className="text-xs text-zinc-500">Белковая последовательность (30-1000 а.о.)</span>
            <textarea value={sequence} onChange={(e) => setSequence(e.target.value)} rows={6}
              className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono" />
          </label>
          <div className="text-[10px] text-zinc-400 mb-3">{sequence.replace(/[^A-Z]/gi, "").length} а.о.</div>

          <div className="flex gap-2">
            <button onClick={run} disabled={loading || sequence.length < 30}
              className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
              {loading ? <><Clock className="h-4 w-4 animate-spin" /> ESMFold...</> : <><Dna className="h-4 w-4" /> Предсказать</>}
            </button>
            {loading && <button onClick={cancel}
              className="px-3 py-2.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600">
              <X className="h-4 w-4" />
            </button>}
          </div>

          {error && <div className="mt-3"><ErrorAlert message={error} /></div>}

          <div className="mt-4 text-[10px] text-zinc-400 bg-zinc-50 dark:bg-zinc-900 rounded p-2">
            <div className="font-semibold mb-1">ESMFold (Meta AI):</div>
            <div>• End-to-end structure prediction (без MSA)</div>
            <div>• 30-120 сек на белок</div>
            <div>• pLDDT: 90+=высокая, 70-89=средняя, {">"}50=низкая</div>
            <div>• Бесплатно (HF Space, CPU tier)</div>
            <div>• 💡 Требуется HF token (🤖 в шапке)</div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          {loading && <LoadingPanel message="ESMFold предсказывает 3D-структуру... (30-120 сек)" />}
          {!result && !loading && !error && <EmptyPanel message="Введите последовательность для предсказания структуры" />}
          {result && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-2">
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-center">
                  <div className="text-xl font-bold text-blue-600">{result.length}</div>
                  <div className="text-[10px] text-zinc-400">аминокислот</div>
                </div>
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 text-center">
                  <div className="text-xl font-bold" style={{ color: qualityColor(result.quality) }}>
                    {result.meanPlddt.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-zinc-400">pLDDT</div>
                </div>
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 text-center">
                  <div className="text-sm font-bold" style={{ color: qualityColor(result.quality) }}>
                    {qualityLabel(result.quality)}
                  </div>
                  <div className="text-[10px] text-zinc-400">качество</div>
                </div>
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 text-center">
                  <div className="text-xl font-bold tabular-nums">{result.elapsed}s</div>
                  <div className="text-[10px] text-zinc-400">время</div>
                </div>
              </div>

              {/* 3D Viewer */}
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="bg-zinc-50 dark:bg-zinc-900 px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-500">3D структура (ESMFold)</span>
                  <div className="flex gap-2">
                    <button onClick={downloadPdb}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-zinc-200 dark:border-zinc-700 hover:bg-accent">
                      <Download className="h-3 w-3" /> PDB
                    </button>
                    <CopyButton text={result.pdb} label="" />
                  </div>
                </div>
                <Viewer3D pdbId="ESMFOLD" pdbString={result.pdb} style="cartoon" height={400}
                  caption="Cartoon — цвет по спектру. Переключите стиль для детализации." />
              </div>

              {/* pLDDT per-residue chart */}
              {result.plddt.length > 0 && (
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-500">pLDDT по остаткам</span>
                    <div className="flex items-center gap-2 text-[9px] text-zinc-400">
                      <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#0053D6" }} /> {">"}90</span>
                      <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#65CBF3" }} /> 70-89</span>
                      <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#FFDB13" }} /> 50-69</span>
                      <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#FF7D45" }} /> {">"}50</span>
                    </div>
                  </div>
                  {/* pLDDT bar chart */}
                  <div className="flex items-end gap-px h-20 overflow-x-auto thin-scroll">
                    {result.plddt.map((p, i) => (
                      <div
                        key={i}
                        className="flex-1 min-w-[2px] rounded-t"
                        style={{
                          height: `${p}%`,
                          backgroundColor: plddtColor(p),
                        }}
                        title={`Residue ${i + 1}: pLDDT ${p.toFixed(1)}`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[9px] text-zinc-400 mt-1">
                    <span>1</span>
                    <span>{Math.floor(result.length / 2)}</span>
                    <span>{result.length}</span>
                  </div>
                </div>
              )}

              {/* PDB text (collapsible) */}
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-500">PDB файл ({result.pdb.length} символов)</span>
                  <button onClick={() => setShowPdb(!showPdb)}
                    className="px-2 py-1 rounded text-xs border border-zinc-200 dark:border-zinc-700 hover:bg-accent">
                    {showPdb ? "Скрыть" : "Показать"}
                  </button>
                </div>
                {showPdb && (
                  <pre className="text-[10px] font-mono bg-zinc-50 dark:bg-zinc-900 p-2 rounded max-h-60 overflow-auto whitespace-pre">
                    {result.pdb.slice(0, 2000)}{result.pdb.length > 2000 && "\n... (обрезано)"}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageLayout>
  );
}
