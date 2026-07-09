"use client";

import { useState, useRef } from "react";
import { ToolPageLayout, LoadingPanel, EmptyPanel, ErrorAlert } from "@/components/ui";
import { SequenceSearch } from "@/components/SequenceSearch";
import { scoreVariantSet, parseVariantInput, type VariantEffectResult } from "@/lib/variant-effect";
import { SAMPLE_SEQUENCES } from "@/lib/epitopes";
import { AlertTriangle, TrendingDown, TrendingUp, Minus, X } from "lucide-react";

export default function VariantEffectPage() {
  const [sequence, setSequence] = useState(SAMPLE_SEQUENCES[0]?.seq || "");
  const [variantInput, setVariantInput] = useState("H103Y\nD225G\nG158E\nN186K");
  const [result, setResult] = useState<VariantEffectResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const run = async () => {
    if (!sequence || sequence.length < 20) { setError("Слишком короткая последовательность"); return; }
    const variants = parseVariantInput(variantInput);
    if (variants.length === 0) { setError("Нет валидных вариантов"); return; }

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError("");
    setResult(null);
    setProgress({ done: 0, total: variants.length });

    try {
      const res = await scoreVariantSet(sequence, variants, {
        signal: ctrl.signal,
        onProgress: (done, total) => setProgress({ done, total }),
      });
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

  const effectIcon = (effect: string) => {
    if (effect === "deleterious") return <TrendingDown className="h-3 w-3 text-red-500" />;
    if (effect === "beneficial") return <TrendingUp className="h-3 w-3 text-green-500" />;
    return <Minus className="h-3 w-3 text-zinc-400" />;
  };

  const effectColor = (deltaLL: number) => {
    if (deltaLL > 4) return "#dc2626";
    if (deltaLL > 2) return "#ea580c";
    if (deltaLL < -4) return "#16a34a";
    if (deltaLL < -2) return "#65a30d";
    return "#71717a";
  };

  return (
    <ToolPageLayout
      name="Variant Effect"
      icon="🧬"
      color="blue"
      description="Предсказание эффекта аминокислотных замен через ESM-2 Δ-log-likelihood. Антигенный дрейф, лекарственная резистентность, эскейп-мутации вакцины."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Входные данные</h3>

          <SequenceSearch compact onSelect={(seq) => setSequence(seq)} />

          <label className="block mt-2 mb-3">
            <span className="text-xs text-zinc-500">Дикий тип (белок)</span>
            <textarea value={sequence} onChange={(e) => setSequence(e.target.value)} rows={5}
              className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono" />
          </label>
          <div className="text-[10px] text-zinc-400 mb-3">{sequence.length} а.о.</div>

          <label className="block mb-3">
            <span className="text-xs text-zinc-500">Варианты (H103Y, D225G, по одному на строку)</span>
            <textarea value={variantInput} onChange={(e) => setVariantInput(e.target.value)} rows={5}
              className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-mono"
              placeholder="H103Y&#10;D225G" />
          </label>
          <div className="text-[10px] text-zinc-400 mb-3">
            Форматы: H103Y, 103 Y, 103H{">"}Y
          </div>

          <div className="flex gap-2">
            <button onClick={run} disabled={loading || sequence.length < 20}
              className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition">
              {loading ? `⏳ ${progress.done}/${progress.total}...` : "🧬 Анализ вариантов"}
            </button>
            {loading && <button onClick={cancel}
              className="px-3 py-2.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600">
              <X className="h-4 w-4" />
            </button>}
          </div>

          {error && <div className="mt-3"><ErrorAlert message={error} /></div>}

          <div className="mt-4 text-[10px] text-zinc-400 bg-zinc-50 dark:bg-zinc-900 rounded p-2">
            💡 Модель: ESM-2 650M (facebook/esm2_t33_650M_UR50D).<br/>
            ΔLL &gt; 2 = делеиторная (красный), &lt; -2 = выгодная (зелёный).<br/>
            Применение: антигенный дрейф, AMR, вакцинный эскейп.
          </div>
        </div>

        <div className="lg:col-span-2">
          {loading && <LoadingPanel message={`ESM-2 анализирует варианты... ${progress.done}/${progress.total}`} />}
          {!result && !loading && !error && <EmptyPanel message="Введите последовательность + варианты" />}
          {result && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-bold text-blue-900 dark:text-blue-100">Сводка</span>
                </div>
                <div className="text-xs text-blue-800 dark:text-blue-200">{result.summary}</div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="text-center">
                    <div className="text-xl font-bold text-red-500">{result.deleteriousCount}</div>
                    <div className="text-[9px] text-zinc-400">делеиторных</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-500">{result.beneficialCount}</div>
                    <div className="text-[9px] text-zinc-400">выгодных</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-zinc-500">{result.variants.length - result.deleteriousCount - result.beneficialCount}</div>
                    <div className="text-[9px] text-zinc-400">нейтральных</div>
                  </div>
                </div>
              </div>

              {/* Results table */}
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-500">
                  Варианты (отобраны по ΔLL)
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-zinc-500">
                      <th className="text-left py-2 px-3">Мутация</th>
                      <th className="text-center py-2 px-3">ΔLL</th>
                      <th className="text-center py-2 px-3">P(wt)</th>
                      <th className="text-center py-2 px-3">P(mut)</th>
                      <th className="text-center py-2 px-3">Эффект</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.variants.map((v, i) => (
                      <tr key={i} className="border-b border-zinc-100 dark:border-zinc-900">
                        <td className="py-2 px-3">
                          <span className="font-mono font-bold">
                            {v.wildType}{v.position}{v.mutant}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center tabular-nums font-bold" style={{ color: effectColor(v.deltaLL) }}>
                          {v.deltaLL > 0 ? "+" : ""}{v.deltaLL.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-center tabular-nums text-zinc-400">{(v.wtProb * 100).toFixed(1)}%</td>
                        <td className="py-2 px-3 text-center tabular-nums text-zinc-400">{(v.mutProb * 100).toFixed(1)}%</td>
                        <td className="py-2 px-3 text-center">
                          <span className="inline-flex items-center gap-1" style={{ color: effectColor(v.deltaLL) }}>
                            {effectIcon(v.effect)}
                            {v.effect === "deleterious" ? "Делеиторная" : v.effect === "beneficial" ? "Выгодная" : "Нейтральная"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ΔLL bar chart */}
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                <span className="text-xs font-semibold text-zinc-500 mb-2 block">Δ-log-likelihood</span>
                <div className="space-y-1">
                  {result.variants.map((v, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px]">
                      <span className="font-mono w-20 shrink-0">{v.wildType}{v.position}{v.mutant}</span>
                      <div className="flex-1 relative h-4 bg-zinc-100 dark:bg-zinc-800 rounded">
                        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-zinc-300 dark:bg-zinc-600" />
                        <div
                          className="absolute top-0 bottom-0 rounded"
                          style={{
                            backgroundColor: effectColor(v.deltaLL),
                            left: v.deltaLL >= 0 ? "50%" : `${50 + (v.deltaLL / 10) * 50}%`,
                            width: `${Math.min(Math.abs(v.deltaLL) / 10 * 50, 50)}%`,
                          }}
                        />
                      </div>
                      <span className="w-12 text-right tabular-nums" style={{ color: effectColor(v.deltaLL) }}>
                        {v.deltaLL > 0 ? "+" : ""}{v.deltaLL.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[9px] text-zinc-400 mt-2 px-20">
                  <span>← Выгодная</span>
                  <span>Нейтральная</span>
                  <span>Делеиторная →</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageLayout>
  );
}
