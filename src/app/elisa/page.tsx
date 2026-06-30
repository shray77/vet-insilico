"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import HubHeader from "@/components/HubHeader";
import { analyzeELISA } from "@/lib/elisa";

export default function ELISAPage() {
  const [negInput, setNegInput] = useState("0.105\n0.098\n0.112\n0.087\n0.103\n0.095\n0.118\n0.091\n0.100\n0.109");
  const [posInput, setPosInput] = useState("0.456\n0.523\n0.389\n0.612\n0.445\n0.501\n0.578\n0.412");
  const [method, setMethod] = useState<"2SD" | "3SD">("2SD");

  const result = useMemo(() => {
    const negatives = negInput.split(/[\n,\s]+/).map(Number).filter(n => !isNaN(n));
    const positives = posInput.trim() ? posInput.split(/[\n,\s]+/).map(Number).filter(n => !isNaN(n)) : undefined;
    if (negatives.length < 2) return null;
    return analyzeELISA(negatives, positives, method);
  }, [negInput, posInput, method]);

  return (
    <div className="min-h-screen">
      <HubHeader />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-teal-500">Хаб</Link>
          <span className="mx-1">/</span>
          <span>ELISA Cut-off Calculator</span>
        </div>
        <div className="rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 p-4 mb-6">
          <h2 className="font-semibold text-teal-900 dark:text-teal-100 mb-1">📊 ELISA Cut-off Calculator</h2>
          <p className="text-sm text-teal-800 dark:text-teal-200">
            Статистический анализ OD значений ELISA. Cut-off = mean + 2SD (или 3SD).
            ROC curve, AUC, sensitivity/specificity если есть positive controls.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Входные данные (OD значения)</h3>
            <label className="block mb-4">
              <span className="text-xs text-zinc-500">Negative controls ({negInput.split(/[\n,\s]+/).filter(Boolean).length} знач.)</span>
              <textarea value={negInput} onChange={(e) => setNegInput(e.target.value)} rows={6}
                className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono"
                placeholder="0.105&#10;0.098&#10;..." />
            </label>
            <label className="block mb-4">
              <span className="text-xs text-zinc-500">Positive controls (опционально, {posInput.trim() ? posInput.split(/[\n,\s]+/).filter(Boolean).length : 0} знач.)</span>
              <textarea value={posInput} onChange={(e) => setPosInput(e.target.value)} rows={4}
                className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono"
                placeholder="0.456&#10;0.523&#10;..." />
            </label>
            <label className="block mb-4">
              <span className="text-xs text-zinc-500">Метод cut-off</span>
              <select value={method} onChange={(e) => setMethod(e.target.value as any)}
                className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm">
                <option value="2SD">Mean + 2SD (95% CI) — рекомендуется</option>
                <option value="3SD">Mean + 3SD (99.7% CI) — более строгий</option>
              </select>
            </label>
          </div>
          <div className="lg:col-span-2 space-y-6">
            {!result ? (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-400">Введите минимум 2 negative control значения</div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                    <div className="text-xs text-zinc-400">Mean (neg)</div>
                    <div className="text-xl font-bold text-teal-600">{result.meanNeg}</div>
                  </div>
                  <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                    <div className="text-xs text-zinc-400">SD (neg)</div>
                    <div className="text-xl font-bold text-teal-600">{result.sdNeg}</div>
                  </div>
                  <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                    <div className="text-xs text-zinc-400">CV%</div>
                    <div className="text-xl font-bold text-amber-600">{result.cvPercent}%</div>
                  </div>
                  <div className="rounded-lg bg-teal-100 dark:bg-teal-950/40 p-3 text-center border-2 border-teal-400">
                    <div className="text-xs text-teal-600 dark:text-teal-300">Cut-off</div>
                    <div className="text-xl font-bold text-teal-700 dark:text-teal-200">{result.recommendedCutoff}</div>
                  </div>
                </div>

                {result.sensitivity !== undefined && result.specificity !== undefined && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 text-center">
                      <div className="text-xs text-zinc-400">Sensitivity</div>
                      <div className="text-xl font-bold text-green-600">{result.sensitivity}%</div>
                    </div>
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-center">
                      <div className="text-xs text-zinc-400">Specificity</div>
                      <div className="text-xl font-bold text-blue-600">{result.specificity}%</div>
                    </div>
                    <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 p-3 text-center">
                      <div className="text-xs text-zinc-400">AUC</div>
                      <div className="text-xl font-bold text-purple-600">{result.auc}</div>
                    </div>
                  </div>
                )}

                {/* ROC curve */}
                {result.rocPoints && result.rocPoints.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">ROC curve (AUC = {result.auc})</h3>
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900">
                      <svg width="300" height="300" viewBox="0 0 300 300" className="max-w-full">
                        <line x1="30" y1="270" x2="280" y2="270" stroke="#52525b" strokeWidth="1" />
                        <line x1="30" y1="20" x2="30" y2="270" stroke="#52525b" strokeWidth="1" />
                        <line x1="30" y1="270" x2="280" y2="20" stroke="#a8a29e" strokeWidth="1" strokeDasharray="3,3" />
                        <text x="155" y="290" textAnchor="middle" fontSize="10" fill="#71717a">1 - Specificity (FPR)</text>
                        <text x="12" y="145" textAnchor="middle" fontSize="10" fill="#71717a" transform="rotate(-90 12 145)">Sensitivity (TPR)</text>
                        <path d={`M 30 270 ${result.rocPoints.map(p => `L ${30 + p.fpr * 250} ${270 - p.tpr * 250}`).join(" ")}`}
                          fill="none" stroke="#0d9488" strokeWidth="2" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Classification */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Классификация при cut-off = {result.recommendedCutoff}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 text-center">
                      <div className="text-xs text-red-600">Positive</div>
                      <div className="text-xl font-bold text-red-600">{result.classifiedPositive}</div>
                    </div>
                    <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 text-center">
                      <div className="text-xs text-green-600">Negative</div>
                      <div className="text-xl font-bold text-green-600">{result.classifiedNegative}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-xs text-zinc-500 dark:text-zinc-400">
                  <b>Метод:</b><br/>
                  • Cut-off = mean(negatives) + k × SD(negatives), k=2 (95% CI) или k=3 (99.7% CI)<br/>
                  • CV% (Coefficient of Variation) = SD/mean × 100. Хорошо если &lt; 15%<br/>
                  • ROC: sweep через все возможные cut-off → sensitivity vs 1-specificity<br/>
                  • AUC: trapezoidal rule. 0.5 = random, 1.0 = perfect. &gt;0.9 = отличный тест<br/>
                  <b>⚠️</b> Минимум 8-10 negative controls для надёжной оценки. Для публикации — подтвердить на независимой выборке.
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
