"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import HubHeader from "@/components/HubHeader";
import Viewer3D from "@/components/Viewer3D";
import { PATHOGENS } from "@/data/pathogens";
import { DRUGS } from "@/data/drugs";
import { virtualScreening, getTopResults, type DockingResult } from "@/lib/docking";
import { analyzeWithLLM, getHfToken } from "@/lib/hf";

type Tab = "screening" | "learn";

export default function DrugRepurposingPage() {
  const [tab, setTab] = useState<Tab>("screening");
  const [selectedPathogen, setSelectedPathogen] = useState<string>("");
  const [results, setResults] = useState<DockingResult[]>([]);
  const [running, setRunning] = useState(false);
  const [lipinskiOnly, setLipinskiOnly] = useState(true);
  const [selectedResult, setSelectedResult] = useState<DockingResult | null>(null);

  const pathogen = useMemo(
    () => PATHOGENS.find((p) => p.id === selectedPathogen),
    [selectedPathogen],
  );

  const runScreening = () => {
    if (!pathogen) return;
    setRunning(true);
    setResults([]);
    setTimeout(() => {
      const all = virtualScreening(DRUGS, pathogen.targets);
      setResults(all);
      setRunning(false);
    }, 400);
  };

  const topResults = useMemo(
    () => getTopResults(results, 50, lipinskiOnly),
    [results, lipinskiOnly],
  );

  const exportCSV = () => {
    if (!pathogen || topResults.length === 0) return;
    const headers = [
      "rank", "drug_name", "inn", "pharm_group", "mechanism",
      "target", "pdb_id", "score", "shape", "electrostatic", "hydrophobic",
      "dg_kcal_mol", "lipinski_pass", "lipinski_violations",
      "selectivity", "mw", "logp", "hbd", "hba", "charge", "ru_registered",
    ];
    const rows = topResults.map((r, i) => [
      i + 1,
      r.drug.name,
      r.drug.inn,
      r.drug.pharm_group,
      r.drug.mechanism || "",
      r.target.name_ru,
      r.target.pdb_id || "",
      r.score,
      r.shapeScore,
      r.electrostaticScore,
      r.hydrophobicScore,
      r.bindingAffinity,
      r.lipinskiPass ? "pass" : "fail",
      r.lipinskiViolations,
      r.selectivityIndex,
      r.drug.mw,
      r.drug.logp,
      r.drug.hbd,
      r.drug.hba,
      r.drug.charge,
      r.drug.ru_registered ? "yes" : "no",
    ]);
    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((c) => {
        const s = String(c);
        // Escape quotes and wrap if needed
        return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(",")),
    ].join("\n");
    // BOM for Excel UTF-8
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vet-insilico-screening-${pathogen.id}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const scoreColor = (s: number) =>
    s >= 75 ? "#16a34a" : s >= 50 ? "#ca8a04" : s >= 30 ? "#ea580c" : "#dc2626";

  const activityIcon: Record<string, string> = {
    antiviral: "🦠", antibacterial: "🧫", antiparasitic: "🔬", antiinflammatory: "💊", unknown: "❓",
  };

  return (
    <div className="min-h-screen">
      <HubHeader />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-teal-500">Хаб</Link>
          <span className="mx-1">/</span>
          <span>Drug Repurposing</span>
        </div>

        <div className="flex gap-1 mb-6 border-b border-zinc-200 dark:border-zinc-800">
          {(["screening", "learn"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
                tab === t
                  ? "border-teal-500 text-teal-600 dark:text-teal-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              {t === "screening" ? "🔬 Скрининг" : "📚 Как это работает"}
            </button>
          ))}
        </div>

        {tab === "screening" && (
          <div className="space-y-6">
            <div className="rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 p-4">
              <h2 className="font-semibold text-teal-900 dark:text-teal-100 mb-1">
                In Silico Drug Repurposing
              </h2>
              <p className="text-sm text-teal-800 dark:text-teal-200">
                Подберём существующие препараты, которые могут связаться с белком патогена и заблокировать его.
                Выбираем патоген → запускаем скрининг → смотрим топ кандидатов с оценкой сродства.
              </p>
            </div>

            <section>
              <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
                Шаг 1 — Выберите патоген
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {PATHOGENS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPathogen(p.id); setResults([]); }}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      selectedPathogen === p.id
                        ? "border-teal-500 bg-teal-50 dark:bg-teal-950/30"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-teal-300"
                    }`}
                  >
                    <div className="font-semibold text-sm">{p.name_ru}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      {p.type === "virus" ? "🦠 Вирус" : "🧫 Бактерия"} • {p.targets.length} мишеней
                    </div>
                    {p.priority_ru === 1 && (
                      <div className="text-xs text-red-500 mt-1 font-medium">⚡ Приоритет РФ</div>
                    )}
                  </button>
                ))}
              </div>
            </section>

            {pathogen && (
              <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-zinc-400">Геном:</span> {pathogen.genome}</div>
                  <div><span className="text-zinc-400">Статус:</span> {pathogen.rf_status}</div>
                  <div className="col-span-2"><span className="text-zinc-400">Классы:</span> {pathogen.known_drug_classes.join(", ")}</div>
                </div>
                <div className="space-y-2">
                  {pathogen.targets.map((t) => (
                    <div key={t.id} className="flex items-start gap-2 text-sm">
                      <span className="text-teal-500 mt-0.5">🎯</span>
                      <div className="flex-1">
                        <span className="font-medium">{t.name_ru}</span>
                        <span className="text-zinc-400 text-xs ml-2">{t.mw_kda} кДа</span>
                        {t.pdb_id && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            PDB: {t.pdb_id}
                          </span>
                        )}
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t.function_ru}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {pathogen && (
              <section className="flex flex-wrap items-center gap-4">
                <button
                  onClick={runScreening}
                  disabled={running}
                  className="px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold disabled:opacity-50 hover:bg-teal-700 transition shadow-lg shadow-teal-600/20"
                >
                  {running ? "⏳ Скрининг..." : `🚀 Скрининг ${DRUGS.length} препаратов`}
                </button>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lipinskiOnly}
                    onChange={(e) => setLipinskiOnly(e.target.checked)}
                    className="w-4 h-4 rounded accent-teal-600"
                  />
                  <span>Только Lipinski-совместимые</span>
                  <span className="text-xs text-zinc-400 cursor-help" title="Правило Липинского: MW≤500, LogP≤5, HBD≤5, HBA≤10. Фильтр для пероральной биодоступности.">
                    (?)
                  </span>
                </label>
              </section>
            )}

            {topResults.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                    Шаг 3 — Топ кандидатов ({topResults.length})
                  </h3>
                  <button
                    onClick={exportCSV}
                    className="px-3 py-1.5 rounded-lg bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 text-xs font-medium hover:bg-teal-200 dark:hover:bg-teal-900/60 transition"
                  >
                    📥 Скачать CSV
                  </button>
                </div>
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-zinc-100 dark:bg-zinc-900 text-left text-xs uppercase text-zinc-500">
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">Препарат</th>
                          <th className="px-3 py-2 hidden md:table-cell">Мишень</th>
                          <th className="px-3 py-2 text-center">Score</th>
                          <th className="px-3 py-2 hidden md:table-cell">Тип</th>
                          <th className="px-3 py-2 text-center hidden md:table-cell">ΔG</th>
                          <th className="px-3 py-2 text-center hidden lg:table-cell">Lip</th>
                          <th className="px-3 py-2 text-center hidden lg:table-cell">3D</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topResults.map((r, i) => (
                          <tr
                            key={`${r.drug.id}-${r.target.id}-${i}`}
                            className="border-t border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer transition"
                            onClick={() => setSelectedResult(r)}
                          >
                            <td className="px-3 py-2 text-zinc-400">{i + 1}</td>
                            <td className="px-3 py-2 font-medium">{r.drug.name}</td>
                            <td className="px-3 py-2 text-xs text-zinc-400 hidden md:table-cell">{r.target.name_ru}</td>
                            <td className="px-3 py-2 text-center">
                              <span className="inline-flex items-center justify-center w-10 h-6 rounded-full text-xs font-bold text-white" style={{ backgroundColor: scoreColor(r.score) }}>
                                {r.score}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs hidden md:table-cell">{activityIcon[r.drug.activity]}</td>
                            <td className="px-3 py-2 text-center text-xs hidden md:table-cell">{r.bindingAffinity}</td>
                            <td className="px-3 py-2 text-center hidden lg:table-cell">{r.lipinskiPass ? "✅" : "⚠️"}</td>
                            <td className="px-3 py-2 text-center hidden lg:table-cell">
                              {r.target.pdb_id && <span className="text-xs">🧬</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {tab === "learn" && (
          <div className="prose prose-zinc dark:prose-invert max-w-none space-y-6">
            <h2 className="text-xl font-bold">Как работает in silico скрининг</h2>

            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4">
              <h3 className="font-semibold mb-2">💊 Зачем это нужно?</h3>
              <p className="text-sm">
                Разработка нового лекарства занимает 10-15 лет и стоит миллиарды.
                <b> Drug repurposing</b> — берём уже существующие лекарства и проверяем,
                могут ли они работать против новой болезни. Это быстрее и дешевле.
              </p>
              <p className="text-sm mt-2">
                В ветеринарии это особенно актуально: для многих патогенов (АЧС, ящур)
                нет специфического лечения. Мы проверяем — может ли уже существующий
                препарат связаться с ключевым белком вируса.
              </p>
            </div>

            <div className="rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 p-4">
              <h3 className="font-semibold mb-2">🧮 Как считается Score (0-100)?</h3>
              <p className="text-sm mb-2">Три фактора, каждый 0-100:</p>
              <div className="space-y-2 text-sm">
                <div><b>1. Shape complementarity (35%)</b> — помещается ли молекула в карман белка? Оптимально когда радиус молекулы = 60-90% от радиуса кармана.</div>
                <div><b>2. Electrostatic match (30%)</b> — совместимы ли заряды? Противоположные заряды притягиваются (+ и -), одинаковые — отталкиваются.</div>
                <div><b>3. Hydrophobic match (35%)</b> — гидрофобные молекулы любят гидрофобные карманы. Гидрофильные — гидрофильные. Плюс водородные связи для гидрофильных.</div>
              </div>
              <p className="text-sm mt-2">Итого: Score = 0.35×Shape + 0.30×Electrostatic + 0.35×Hydrophobic. Штраф -5 за каждое нарушение правила Липинского.</p>
            </div>

            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4">
              <h3 className="font-semibold mb-2">📏 Правило Липинского (Rule of Five)</h3>
              <p className="text-sm">Фильтр для пероральной биодоступности. Препарат "проходит" если:</p>
              <ul className="text-sm mt-1 list-disc list-inside space-y-0.5">
                <li>Молекулярная масса ≤ 500 Да</li>
                <li>LogP (липофильность) ≤ 5</li>
                <li>Водородных доноров ≤ 5</li>
                <li>Водородных акцепторов ≤ 10</li>
                <li>Вращаемых связей ≤ 12 (правило Вебера)</li>
              </ul>
            </div>

            <div className="rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 p-4">
              <h3 className="font-semibold mb-2">🧬 3D визуализация</h3>
              <p className="text-sm">
                Кликните на строку результата — откроется диалог с детальным score breakdown и (если есть PDB ID) 3D структурой белка через 3Dmol.js. Покрутите мышью, лиганды выделены пурпурным.
              </p>
            </div>

            <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4">
              <h3 className="font-semibold mb-2">⚠️ Важно!</h3>
              <p className="text-sm">Это <b>упрощённая модель</b>, не полный molecular dynamics. Результаты — гипотезы для экспериментальной проверки (in vitro / in vivo). Не являются ветеринарной рекомендацией.</p>
            </div>
          </div>
        )}
      </main>

      {selectedResult && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setSelectedResult(null)}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto thin-scroll" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">{selectedResult.drug.name}</h3>
                <p className="text-sm text-zinc-400">МНН: {selectedResult.drug.inn}</p>
              </div>
              <button onClick={() => setSelectedResult(null)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-xl">✕</button>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-zinc-200 dark:text-zinc-800" />
                  <circle cx="40" cy="40" r="34" fill="none" stroke={scoreColor(selectedResult.score)} strokeWidth="6" strokeDasharray={`${(selectedResult.score / 100) * 213.6} 213.6`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xl font-bold" style={{ color: scoreColor(selectedResult.score) }}>
                  {selectedResult.score}
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs text-zinc-400">Общая оценка сродства</div>
                <div className="font-semibold" style={{ color: scoreColor(selectedResult.score) }}>
                  {selectedResult.score >= 75 ? "Отличный кандидат" : selectedResult.score >= 50 ? "Перспективный" : selectedResult.score >= 30 ? "Слабый" : "Маловероятно"}
                </div>
                <div className="text-xs text-zinc-400 mt-1">ΔG = {selectedResult.bindingAffinity} kcal/mol</div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {[
                { label: "📐 Форма (shape)", val: selectedResult.shapeScore, desc: "Помещается ли в карман" },
                { label: "⚡ Заряд (electrostatic)", val: selectedResult.electrostaticScore, desc: "Совместимость зарядов" },
                { label: "💧 Гидрофобность", val: selectedResult.hydrophobicScore, desc: "Сродство растворитель-карман" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between text-sm mb-0.5">
                    <span>{s.label}</span>
                    <span className="font-medium">{s.val}/100</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${s.val}%`, backgroundColor: scoreColor(s.val) }} />
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">{s.desc}</div>
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-zinc-400">Фармгруппа:</span><span className="text-right">{selectedResult.drug.pharm_group}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Механизм:</span><span className="text-right text-xs">{selectedResult.drug.mechanism || "—"}</span></div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                <div className="flex justify-between"><span className="text-zinc-400">MW:</span><span>{selectedResult.drug.mw} Да</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">LogP:</span><span>{selectedResult.drug.logp}</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">HBD/HBA:</span><span>{selectedResult.drug.hbd}/{selectedResult.drug.hba}</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">Заряд:</span><span>{selectedResult.drug.charge > 0 ? "+" : selectedResult.drug.charge < 0 ? "−" : "0"}</span></div>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-zinc-400">Lipinski:</span>
                <span>{selectedResult.lipinskiPass ? "✅ Совместим" : `⚠️ ${selectedResult.lipinskiViolations} нарушений`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Селективность:</span>
                <span>{selectedResult.selectivityIndex}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Реестр РФ:</span>
                <span>{selectedResult.drug.ru_registered ? "✅ Да" : "❌ Нет"}</span>
              </div>
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 mt-3">
              <div className="text-sm font-medium mb-2">🎯 Мишень: {selectedResult.target.name_ru}</div>
              <p className="text-xs text-zinc-400 mb-3">{selectedResult.target.function_ru}</p>
              {selectedResult.target.pdb_id && (
                <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">🧬 3D структура {selectedResult.target.pdb_id.toUpperCase()}</span>
                    <a
                      href={`https://www.rcsb.org/structure/${selectedResult.target.pdb_id.toUpperCase()}`}
                      target="_blank"
                      rel="noopener"
                      className="text-xs text-blue-500 hover:underline"
                    >
                      RCSB ↗
                    </a>
                  </div>
                  <Viewer3D
                    pdbId={selectedResult.target.pdb_id}
                    height={350}
                    caption="Загружается из RCSB. Покрутите мышью — лиганды выделены пурпурным."
                  />
                </div>
              )}
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 mt-3">
              <DrugLLMAnalysis result={selectedResult} />
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 mt-3 text-xs text-zinc-400">
              ⚠️ Упрощённая модель. Требуется in vitro / in vivo валидация.
            </div>
          </div>
        </div>
      )}

      <footer className="max-w-6xl mx-auto px-4 py-6 border-t border-zinc-200 dark:border-zinc-800 mt-8 text-center text-xs text-zinc-400">
        VetInSilico Hub • Drug Repurposing • ML-powered
      </footer>
    </div>
  );
}

function DrugLLMAnalysis({ result }: { result: DockingResult }) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    if (!getHfToken()) {
      setError("Задайте HF token — кнопка 🤖 в шапке");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const prompt = `You are a veterinary pharmacology expert. Analyze this drug-target pair for repurposing potential.

DRUG: ${result.drug.name} (INN: ${result.drug.inn})
Pharm group: ${result.drug.pharm_group}
Mechanism: ${result.drug.mechanism || "unknown"}
MW=${result.drug.mw} Da, LogP=${result.drug.logp}, charge=${result.drug.charge}, RU registered=${result.drug.ru_registered}

TARGET: ${result.target.name_ru} (PDB: ${result.target.pdb_id || "n/a"})
Function: ${result.target.function_ru}

DOCKING SCORE: ${result.score}/100 (shape=${result.shapeScore}, electrostatic=${result.electrostaticScore}, hydrophobic=${result.hydrophobicScore})
ΔG=${result.bindingAffinity} kcal/mol, Lipinski=${result.lipinskiPass ? "pass" : "fail"}, selectivity=${result.selectivityIndex}/100

Respond ONLY as JSON:
{"repurposingPotential": "<low|moderate|high>", "confidenceScore": <0-100>, "rationale": "<one short sentence>", "keyRisks": ["...", "..."], "nextSteps": ["...", "..."]}`;
      const r = await analyzeWithLLM<any>(
        "You are a veterinary pharmacology expert. ОТВЕЧАЙ НА РУССКОМ. Все текстовые поля в JSON (rationale, keyRisks, nextSteps) должны быть на русском языке. Respond ONLY with valid JSON, no markdown.",
        prompt,
        { maxTokens: 250, temperature: 0.3 },
      );
      setAnalysis(r);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-xs text-zinc-400">
        ⏳ LLM анализирует кандидата...
      </div>
    );
  }

  if (error && !analysis) {
    return (
      <div>
        <button
          onClick={run}
          className="px-3 py-2 rounded-lg bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-medium hover:bg-purple-200 transition"
        >
          🤖 ML-анализ кандидата (Qwen 3B)
        </button>
        {error && <div className="mt-2 text-xs text-red-500">⚠️ {error}</div>}
      </div>
    );
  }

  if (!analysis) {
    return (
      <button
        onClick={run}
        className="px-3 py-2 rounded-lg bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-medium hover:bg-purple-200 transition"
      >
        🤖 ML-анализ кандидата (Qwen 3B)
      </button>
    );
  }

  const potColor = analysis.repurposingPotential === "high" ? "#16a34a"
    : analysis.repurposingPotential === "moderate" ? "#eab308" : "#dc2626";

  return (
    <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-bold text-purple-700 dark:text-purple-300">🤖 ML-анализ (Qwen 3B)</div>
        <div className="flex gap-3 text-xs">
          <span>
            Потенциал:{" "}
            <b style={{ color: potColor }}>
              {analysis.repurposingPotential === "high" ? "Высокий" : analysis.repurposingPotential === "moderate" ? "Умеренный" : "Низкий"}
            </b>
          </span>
          <span>
            Уверенность: <b>{analysis.confidenceScore}/100</b>
          </span>
        </div>
      </div>
      <div className="text-xs text-zinc-700 dark:text-zinc-300 mb-2 italic">{analysis.rationale}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
        {Array.isArray(analysis.keyRisks) && analysis.keyRisks.length > 0 && (
          <div>
            <div className="text-red-600 dark:text-red-400 font-medium mb-1">⚠️ Риски:</div>
            <ul className="list-disc list-inside space-y-0.5 text-zinc-700 dark:text-zinc-300">
              {analysis.keyRisks.slice(0, 3).map((r: string, i: number) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}
        {Array.isArray(analysis.nextSteps) && analysis.nextSteps.length > 0 && (
          <div>
            <div className="text-green-600 dark:text-green-400 font-medium mb-1">✅ Следующие шаги:</div>
            <ul className="list-disc list-inside space-y-0.5 text-zinc-700 dark:text-zinc-300">
              {analysis.nextSteps.slice(0, 3).map((s: string, i: number) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
