"use client";

import { useState, useMemo } from "react";
import { ToolPageLayout, EmptyPanel, ErrorAlert, CopyButton } from "@/components/ui";
import { SequenceSearch } from "@/components/SequenceSearch";
import { analyzeOutbreak, type OutbreakIsolate, type SurveillanceReport } from "@/lib/outbreak-surveillance";
import { PHYLO_SAMPLES } from "@/lib/phylo";
import { AlertTriangle, CheckCircle2, Clock, GitBranch, Microscope, Plus, X } from "lucide-react";

export default function OutbreakSurveillancePage() {
  const [isolates, setIsolates] = useState<OutbreakIsolate[]>(
    PHYLO_SAMPLES[0]?.sequences.map((s, i) => ({
      name: s.name,
      sequence: s.seq,
      date: `2024-${String(i + 1).padStart(2, "0")}-15`,
      location: i < 2 ? "Белгород" : i < 4 ? "Воронеж" : "Тамбов",
    })) || [],
  );
  const [seqType, setSeqType] = useState<"protein" | "dna">("dna");
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [newSeq, setNewSeq] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newLoc, setNewLoc] = useState("");

  const report = useMemo(() => {
    if (isolates.length < 2) return null;
    setError("");
    try {
      return analyzeOutbreak(isolates, { seqType });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [isolates, seqType]);

  const addIsolate = () => {
    if (!newSeq || newSeq.length < 10) return;
    setIsolates([...isolates, {
      name: newName || `Изолят ${isolates.length + 1}`,
      sequence: newSeq,
      date: newDate || undefined,
      location: newLoc || undefined,
    }]);
    setNewName(""); setNewSeq(""); setNewDate(""); setNewLoc("");
  };

  const removeIsolate = (idx: number) => {
    setIsolates(isolates.filter((_, i) => i !== idx));
  };

  return (
    <ToolPageLayout
      name="Outbreak Surveillance"
      icon="🦠"
      color="orange"
      description="Комбинированный анализ вспышки: филогения + молекулярные часы + AMR. Загрузите полевые изоляты → получите дерево, оценку TMRCA, статус резистентности."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input */}
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Изоляты ({isolates.length})</h3>

          {/* Isolate list */}
          <div className="space-y-2 mb-4 max-h-60 overflow-y-auto thin-scroll">
            {isolates.map((iso, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{iso.name}</div>
                  <div className="text-[10px] text-zinc-400">
                    {iso.date} · {iso.location} · {iso.sequence.length} bp
                  </div>
                </div>
                <button onClick={() => removeIsolate(i)} className="text-red-400 hover:text-red-600 shrink-0">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Add new isolate */}
          <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-3 space-y-2">
            <div className="text-xs font-semibold text-zinc-500">Добавить изолят</div>
            <SequenceSearch compact onSelect={(seq) => setNewSeq(seq)} />
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Название"
              className="w-full px-2 py-1.5 text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900" />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={newDate} onChange={(e) => setNewDate(e.target.value)} placeholder="Дата (2024-03)"
                className="px-2 py-1.5 text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900" />
              <input type="text" value={newLoc} onChange={(e) => setNewLoc(e.target.value)} placeholder="Локация"
                className="px-2 py-1.5 text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900" />
            </div>
            <textarea value={newSeq} onChange={(e) => setNewSeq(e.target.value)} placeholder="ATGCATGC..." rows={3}
              className="w-full px-2 py-1.5 text-xs font-mono rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900" />
            <button onClick={addIsolate} disabled={!newSeq || newSeq.length < 10}
              className="w-full px-3 py-1.5 rounded text-xs bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 flex items-center justify-center gap-1">
              <Plus className="h-3 w-3" /> Добавить
            </button>
          </div>

          <label className="block mt-3">
            <span className="text-xs text-zinc-500">Тип последовательности</span>
            <select value={seqType} onChange={(e) => setSeqType(e.target.value as "protein" | "dna")}
              className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm">
              <option value="dna">ДНК ( Kimura 2P )</option>
              <option value="protein">Белок ( p-distance )</option>
            </select>
          </label>

          {error && <div className="mt-3"><ErrorAlert message={error} /></div>}
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          {!report && !error && <EmptyPanel message="Добавьте минимум 2 изолята для анализа" />}

          {report && (
            <div className="space-y-4">
              {/* Summary banner */}
              <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 p-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-bold text-orange-900 dark:text-orange-100">Сводка анализа вспышки</span>
                </div>
                {report.summary.map((s, i) => (
                  <div key={i} className="text-xs text-orange-800 dark:text-orange-200 flex items-start gap-1.5">
                    <span className="shrink-0">•</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-2">
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 text-center">
                  <div className="text-xl font-bold">{report.isolates.length}</div>
                  <div className="text-[10px] text-zinc-400">изолятов</div>
                </div>
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 text-center">
                  <div className="text-xl font-bold text-orange-600">{report.tmrcaEstimate !== null ? `${report.tmrcaEstimate.toFixed(1)}y` : "—"}</div>
                  <div className="text-[10px] text-zinc-400">TMRCA</div>
                </div>
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 text-center">
                  <div className="text-xl font-bold text-red-500">{report.resistantCount}</div>
                  <div className="text-[10px] text-zinc-400">AMR+</div>
                </div>
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 text-center">
                  <div className="text-xl font-bold">{report.pairwise.length}</div>
                  <div className="text-[10px] text-zinc-400">пар</div>
                </div>
              </div>

              {/* Phylogenetic tree (Newick) */}
              {report.newickTree && (
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-500 flex items-center gap-1">
                      <GitBranch className="h-3.5 w-3.5" /> Филогенетическое дерево (Newick)
                    </span>
                    <CopyButton text={report.newickTree} label="" />
                  </div>
                  <pre className="text-[10px] font-mono bg-zinc-50 dark:bg-zinc-900 p-2 rounded max-h-32 overflow-auto whitespace-pre-wrap break-all">
                    {report.newickTree}
                  </pre>
                  <div className="text-[10px] text-zinc-400 mt-1">
                    💡 Вставьте в iTOL (https://itol.embl.de) или FigTree для визуализации
                  </div>
                </div>
              )}

              {/* Pairwise distances */}
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                <span className="text-xs font-semibold text-zinc-500 mb-2 block flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Попарные расстояния и дивергенция
                </span>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-zinc-500">
                      <th className="text-left py-1">Пара</th>
                      <th className="text-center py-1">Identity</th>
                      <th className="text-center py-1">Distance</th>
                      <th className="text-center py-1">Дивергенция (лет)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.pairwise.slice(0, 15).map((p, i) => (
                      <tr key={i} className="border-b border-zinc-100 dark:border-zinc-900">
                        <td className="py-1 text-[11px]">{p.a} ↔ {p.b}</td>
                        <td className="text-center tabular-nums" style={{ color: p.identity >= 95 ? "#16a34a" : p.identity >= 80 ? "#eab308" : "#dc2626" }}>
                          {p.identity.toFixed(1)}%
                        </td>
                        <td className="text-center tabular-nums text-zinc-500">{p.distance.toFixed(4)}</td>
                        <td className="text-center tabular-nums text-zinc-500">{p.divergenceYears.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* AMR status per isolate */}
              {report.resistantCount > 0 && (
                <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-4">
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2 block flex items-center gap-1">
                    <Microscope className="h-3.5 w-3.5" /> AMR статус по изолятам
                  </span>
                  <div className="space-y-1">
                    {report.isolates.filter((iso) => iso.amr && iso.amr.resistanceGenes.length > 0).map((iso, i) => (
                      <div key={i} className="text-xs flex items-start gap-2">
                        <AlertTriangle className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium">{iso.name}:</span>{" "}
                          {iso.amr?.resistanceGenes.join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.resistantCount === 0 && (
                <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 p-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-green-700 dark:text-green-300">
                    Мутации антимикробной резистентности не обнаружены
                  </span>
                </div>
              )}

              {/* Isolate table */}
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                <span className="text-xs font-semibold text-zinc-500 mb-2 block">Изоляты</span>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-zinc-500">
                      <th className="text-left py-1">Название</th>
                      <th className="text-left py-1">Дата</th>
                      <th className="text-left py-1">Локация</th>
                      <th className="text-center py-1">Длина</th>
                      <th className="text-center py-1">AMR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.isolates.map((iso, i) => (
                      <tr key={i} className="border-b border-zinc-100 dark:border-zinc-900">
                        <td className="py-1 font-medium">{iso.name}</td>
                        <td className="py-1 text-zinc-500">{iso.date}</td>
                        <td className="py-1 text-zinc-500">{iso.location}</td>
                        <td className="py-1 text-center tabular-nums">{iso.length}</td>
                        <td className="py-1 text-center">
                          {iso.amr && iso.amr.resistanceGenes.length > 0 ? (
                            <span className="text-red-500 font-bold">{iso.amr.resistanceGenes.length}</span>
                          ) : (
                            <span className="text-green-500">✓</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageLayout>
  );
}
