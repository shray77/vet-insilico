"use client";

import { useState, useMemo } from "react";
import { ToolPageLayout, EmptyPanel, ErrorAlert, CopyButton } from "@/components/ui";
import { designVaccine, type VaccineConstruct } from "@/lib/vaccine-designer";
import { SAMPLE_SEQUENCES } from "@/lib/epitopes";

const SPECIES = [
  { value: "none", label: "Без кодон-оптимизации" },
  { value: "pig", label: "Свинья (Sus scrofa)" },
  { value: "cattle", label: "КРС (Bos taurus)" },
  { value: "chicken", label: "Курица (Gallus gallus)" },
  { value: "ecoli", label: "E. coli (для наработки)" },
];

export default function VaccineDesignerPage() {
  const [sequence, setSequence] = useState(SAMPLE_SEQUENCES[0]?.seq || "");
  const [sampleIdx, setSampleIdx] = useState(0);
  const [maxB, setMaxB] = useState(5);
  const [maxT, setMaxT] = useState(5);
  const [species, setSpecies] = useState("none");
  const [addRS, setAddRS] = useState(true);
  const [addSignal, setAddSignal] = useState(true);
  const [addHisTag, setAddHisTag] = useState(true);
  const [error, setError] = useState("");

  const result = useMemo(() => {
    if (!sequence || sequence.length < 30) return null;
    setError("");
    try {
      return designVaccine(sequence, {
        maxBEpitopes: maxB,
        maxTEpitopes: maxT,
        mhcAlleles: ["HLA-A*02:01"],
        includeSignalPeptide: addSignal,
        includeHisTag: addHisTag,
        codonOptimizeFor: species === "none" ? undefined : species,
        addRestrictionSites: addRS,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [sequence, maxB, maxT, species, addRS, addSignal, addHisTag]);

  const loadSample = (idx: number) => {
    setSampleIdx(idx);
    setSequence(SAMPLE_SEQUENCES[idx].seq);
  };

  return (
    <ToolPageLayout
      name="Vaccine Designer"
      icon="💉"
      color="emerald"
      description="Multi-epitope vaccine construct designer: B+T epitope prediction, linker assembly, codon optimization, GenBank export."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Параметры</h3>
          <div className="mb-4">
            <span className="text-xs text-zinc-500 block mb-1.5">Примеры:</span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_SEQUENCES.map((s, i) => (
                <button key={i} onClick={() => loadSample(i)}
                  className={`px-2 py-1 rounded-md text-xs border transition-colors ${
                    i === sampleIdx ? "bg-emerald-500 text-white border-emerald-500" : "border-zinc-200 dark:border-zinc-700 hover:bg-accent"
                  }`}>{s.name}</button>
              ))}
            </div>
          </div>
          <label className="block mb-4">
            <span className="text-xs text-zinc-500">Белок патогена</span>
            <textarea value={sequence} onChange={(e) => setSequence(e.target.value)} rows={6}
              className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-mono" />
          </label>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-zinc-500">Макс. B-эпитопов</span>
              <input type="number" value={maxB} min={1} max={20} onChange={(e) => setMaxB(Number(e.target.value))}
                className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-500">Макс. T-эпитопов</span>
              <input type="number" value={maxT} min={1} max={20} onChange={(e) => setMaxT(Number(e.target.value))}
                className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm" />
            </label>
          </div>
          <label className="block mb-4">
            <span className="text-xs text-zinc-500">Кодон-оптимизация</span>
            <select value={species} onChange={(e) => setSpecies(e.target.value)}
              className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm">
              {SPECIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <div className="space-y-2 mb-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={addSignal} onChange={(e) => setAddSignal(e.target.checked)} className="rounded" />
              <span>Сигнальный пептид (tPA)</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={addHisTag} onChange={(e) => setAddHisTag(e.target.checked)} className="rounded" />
              <span>His-тег (6xHis)</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={addRS} onChange={(e) => setAddRS(e.target.checked)} className="rounded" />
              <span>Избегать сайты рестрикции</span>
            </label>
          </div>
          {error && <ErrorAlert message={error} />}
        </div>

        <div className="lg:col-span-2">
          {!result && !error && <EmptyPanel message="Введите белковую последовательность патогена" />}
          {result && <ConstructView construct={result} />}
        </div>
      </div>
    </ToolPageLayout>
  );
}

function ConstructView({ construct }: { construct: VaccineConstruct }) {
  const [showGenBank, setShowGenBank] = useState(false);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 text-center">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{construct.length}</div>
          <div className="text-[10px] text-muted-foreground">аминокислот</div>
        </div>
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{construct.bCellCount}</div>
          <div className="text-[10px] text-muted-foreground">B-эпитопов</div>
        </div>
        <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 p-3 text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{construct.tCellCount}</div>
          <div className="text-[10px] text-muted-foreground">T-эпитопов</div>
        </div>
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-center">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{construct.molecularWeight.toFixed(1)}</div>
          <div className="text-[10px] text-muted-foreground">кДа</div>
        </div>
      </div>
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-zinc-500">Карта конструкции</span>
          <CopyButton text={construct.proteinSequence} label="Белок" />
        </div>
        <div className="flex flex-wrap items-center gap-0.5 mb-3">
          {construct.epitopes.map((ep, i) => (
            <div key={i} className="flex items-center gap-0.5">
              <div className="text-[8px] font-mono px-1 py-0.5 rounded text-white"
                style={{ backgroundColor: ep.type === "B-cell" ? "#3b82f6" : "#a855f7" }}
                title={`${ep.type}, score=${ep.score.toFixed(1)}`}>
                {ep.sequence.length > 6 ? ep.sequence.slice(0, 4) + ".." : ep.sequence}
              </div>
              {i < construct.epitopes.length - 1 && (
                <div className="text-[8px] text-zinc-400">{construct.linker}</div>
              )}
            </div>
          ))}
        </div>
        <div className="text-xs font-mono break-all bg-zinc-50 dark:bg-zinc-900 p-2 rounded max-h-32 overflow-y-auto">
          {construct.proteinSequence}
        </div>
      </div>
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
        <span className="text-xs font-semibold text-zinc-500 mb-2 block">Эпитопы</span>
        <table className="w-full text-xs">
          <thead><tr className="border-b text-zinc-500">
            <th className="text-left py-1">#</th><th className="text-left py-1">Тип</th>
            <th className="text-left py-1">Последовательность</th>
            <th className="text-center py-1">Score</th><th className="text-center py-1">Поз.</th>
          </tr></thead>
          <tbody>
            {construct.epitopes.map((ep, i) => (
              <tr key={i} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-1 text-zinc-400">{i + 1}</td>
                <td className="py-1"><span className="px-1.5 py-0.5 rounded text-[9px] text-white"
                  style={{ backgroundColor: ep.type === "B-cell" ? "#3b82f6" : "#a855f7" }}>
                  {ep.type === "B-cell" ? "B" : "T"}</span></td>
                <td className="py-1 font-mono">{ep.sequence}</td>
                <td className="py-1 text-center tabular-nums">{ep.score.toFixed(1)}</td>
                <td className="py-1 text-center text-zinc-400">{ep.start}-{ep.end}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {construct.codonOptimized && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-500">ДНК ({construct.codonOptimized.optimizedDNA.length} bp)</span>
            <CopyButton text={construct.codonOptimized.optimizedDNA} label="ДНК" />
          </div>
          <div className="text-xs font-mono break-all bg-zinc-50 dark:bg-zinc-900 p-2 rounded max-h-40 overflow-y-auto">
            {construct.codonOptimized.optimizedDNA}
          </div>
        </div>
      )}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-zinc-500">GenBank</span>
          <div className="flex gap-2">
            <button onClick={() => setShowGenBank(!showGenBank)}
              className="px-2 py-1 rounded-md text-xs border border-zinc-200 dark:border-zinc-700 hover:bg-accent">
              {showGenBank ? "Скрыть" : "Показать"}
            </button>
            <CopyButton text={construct.genBank || ""} label="GenBank" />
          </div>
        </div>
        {showGenBank && (
          <pre className="text-[10px] font-mono bg-zinc-50 dark:bg-zinc-900 p-2 rounded max-h-60 overflow-auto whitespace-pre">
            {construct.genBank}
          </pre>
        )}
      </div>
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
        <span className="text-xs font-semibold text-zinc-500 mb-2 block">Метрики</span>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between"><span className="text-zinc-500">Naturalness:</span><span className="font-medium tabular-nums">{(construct.naturalness * 100).toFixed(1)}%</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Linker:</span><span className="font-mono">{construct.linker}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Всего эпитопов:</span><span className="font-medium">{construct.epitopes.length}</span></div>
        </div>
      </div>
    </div>
  );
}
