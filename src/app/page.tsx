"use client";

import { useState, useMemo, useEffect } from "react";
import { PATHOGENS } from "@/data/pathogens";
import { DRUGS } from "@/data/drugs";
import { virtualScreening, getTopResults, type DockingResult } from "@/lib/docking";

type Tab = "screening" | "learn" | "about";

export default function Home() {
  const [tab, setTab] = useState<Tab>("screening");
  const [dark, setDark] = useState(true);
  const [selectedPathogen, setSelectedPathogen] = useState<string>("");
  const [results, setResults] = useState<DockingResult[]>([]);
  const [running, setRunning] = useState(false);
  const [lipinskiOnly, setLipinskiOnly] = useState(true);
  const [selectedResult, setSelectedResult] = useState<DockingResult | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

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
    }, 200);
  };

  const topResults = useMemo(
    () => getTopResults(results, 50, lipinskiOnly),
    [results, lipinskiOnly],
  );

  const scoreColor = (s: number) =>
    s >= 75 ? "#16a34a" : s >= 50 ? "#ca8a04" : s >= 30 ? "#ea580c" : "#dc2626";

  const activityIcon: Record<string, string> = {
    antiviral: "🦠", antibacterial: "🧫", antiparasitic: "🔬", antiinflammatory: "💊", unknown: "❓",
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <div className="flex items-center gap-2 font-bold text-lg">
            🧬 <span className="hidden sm:inline">VetInSilico</span>
          </div>
          <nav className="flex gap-1 ml-auto">
            {(["screening", "learn", "about"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  tab === t
                    ? "bg-teal-600 text-white"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {t === "screening" ? "🔬 Скрининг" : t === "learn" ? "📚 Как это работает" : "ℹ️ О проекте"}
              </button>
            ))}
          </nav>
          <button
            onClick={() => setDark(!dark)}
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            aria-label="Тема"
          >
            {dark ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* ─── SCREENING TAB ─── */}
        {tab === "screening" && (
          <div className="space-y-6">
            {/* Intro banner */}
            <div className="rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 p-4">
              <h2 className="font-semibold text-teal-900 dark:text-teal-100 mb-1">
                In Silico Drug Repurposing
              </h2>
              <p className="text-sm text-teal-800 dark:text-teal-200">
                Подберём существующие препараты, которые могут связаться с белком патогена и заблокировать его.
                Выбираем патоген → запускаем скрининг → смотрим топ кандидатов с оценкой сродства.
              </p>
            </div>

            {/* Step 1: Pathogen grid */}
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

            {/* Pathogen details */}
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
                          <a
                            href={`https://www.rcsb.org/structure/${t.pdb_id}`}
                            target="_blank"
                            rel="noopener"
                            className="ml-2 text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:underline"
                          >
                            PDB: {t.pdb_id} ↗
                          </a>
                        )}
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t.function_ru}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Step 2: Run */}
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

            {/* Step 3: Results */}
            {topResults.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
                  Шаг 3 — Топ кандидатов ({topResults.length})
                </h3>
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

        {/* ─── LEARN TAB ─── */}
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
                <div>
                  <b>1. Shape complementarity (35%)</b> — помещается ли молекула в карман белка?
                  Оптимально когда радиус молекулы = 60-90% от радиуса кармана.
                </div>
                <div>
                  <b>2. Electrostatic match (30%)</b> — совместимы ли заряды?
                  Противоположные заряды притягиваются (+ и -), одинаковые — отталкиваются.
                </div>
                <div>
                  <b>3. Hydrophobic match (35%)</b> — гидрофобные молекулы любят гидрофобные карманы.
                  Гидрофильные — гидрофильные. Плюс водородные связи для гидрофильных.
                </div>
              </div>
              <p className="text-sm mt-2">
                Итого: Score = 0.35×Shape + 0.30×Electrostatic + 0.35×Hydrophobic.
                Штраф -5 за каждое нарушение правила Липинского.
              </p>
            </div>

            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4">
              <h3 className="font-semibold mb-2">📏 Правило Липинского (Rule of Five)</h3>
              <p className="text-sm">Фильтр для пероральной биодоступности. Препарат "проходит" если:</p>
              <ul className="text-sm mt-1 list-disc list-inside space-y-0.5">
                <li>Молекулярная масса ≤ 500 Да (мы ослабили до 600 — ветпрепараты крупнее)</li>
                <li>LogP (липофильность) ≤ 5</li>
                <li>Водородных доноров ≤ 5</li>
                <li>Водородных акцепторов ≤ 10</li>
                <li>Вращаемых связей ≤ 12 (правило Вебера)</li>
              </ul>
            </div>

            <div className="rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 p-4">
              <h3 className="font-semibold mb-2">⚡ ΔG — свободная энергия связывания</h3>
              <p className="text-sm">
                Чем более отрицательная — тем сильнее связывается.
                Приближённая формула: ΔG ≈ -0.1 × Score (kcal/mol).
                Норма для лекарства: ΔG &lt; -7 kcal/mol.
              </p>
            </div>

            <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4">
              <h3 className="font-semibold mb-2">⚠️ Важно!</h3>
              <p className="text-sm">
                Это <b>упрощённая модель</b>, не полный molecular dynamics.
                Результаты — гипотезы для экспериментальной проверки (in vitro / in vivo).
                Не являются ветеринарной рекомендацией.
              </p>
            </div>
          </div>
        )}

        {/* ─── ABOUT TAB ─── */}
        {tab === "about" && (
          <div className="prose prose-zinc dark:prose-invert max-w-none space-y-4">
            <h2 className="text-xl font-bold">О проекте VetInSilico</h2>
            <p className="text-sm">
              In silico drug repurposing для ветеринарных патогенов.
              Все вычисления в браузере — без сервера, без API, zero-cost.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                <div className="text-2xl font-bold text-teal-600">6</div>
                <div className="text-xs text-zinc-400">патогенов</div>
              </div>
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                <div className="text-2xl font-bold text-teal-600">10</div>
                <div className="text-xs text-zinc-400">белков-мишеней</div>
              </div>
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                <div className="text-2xl font-bold text-teal-600">60</div>
                <div className="text-xs text-zinc-400">препаратов</div>
              </div>
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                <div className="text-2xl font-bold text-teal-600">0₽</div>
                <div className="text-xs text-zinc-400">стоимость</div>
              </div>
            </div>
            <h3 className="font-semibold mt-4">Источники данных</h3>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>RCSB PDB — структуры белков (public domain)</li>
              <li>Российский реестр ветеринарных препаратов</li>
              <li>DrugBank Open Data — молекулярные свойства</li>
              <li>WOAH Terrestrial Manual — профиль болезней</li>
            </ul>
            <h3 className="font-semibold mt-4">Стек технологий</h3>
            <p className="text-sm">Next.js 16 (static export) • Tailwind CSS • TypeScript • GitHub Pages</p>
          </div>
        )}
      </main>

      {/* Detail dialog */}
      {selectedResult && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setSelectedResult(null)}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">{selectedResult.drug.name}</h3>
                <p className="text-sm text-zinc-400">МНН: {selectedResult.drug.inn}</p>
              </div>
              <button onClick={() => setSelectedResult(null)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-xl">✕</button>
            </div>

            {/* Score gauge */}
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

            {/* Score breakdown */}
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

            {/* Drug properties */}
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

            {/* Target info */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 mt-3">
              <div className="text-sm font-medium mb-1">🎯 Мишень: {selectedResult.target.name_ru}</div>
              {selectedResult.target.pdb_id && (
                <a
                  href={`https://www.rcsb.org/3d-view/${selectedResult.target.pdb_id}`}
                  target="_blank"
                  rel="noopener"
                  className="text-xs text-blue-500 hover:underline"
                >
                  Посмотреть 3D структуру на RCSB PDB ↗
                </a>
              )}
              <p className="text-xs text-zinc-400 mt-1">{selectedResult.target.function_ru}</p>
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 mt-3 text-xs text-zinc-400">
              ⚠️ Упрощённая модель. Требуется in vitro / in vivo валидация.
            </div>
          </div>
        </div>
      )}

      <footer className="max-w-6xl mx-auto px-4 py-6 border-t border-zinc-200 dark:border-zinc-800 mt-8 text-center text-xs text-zinc-400">
        VetInSilico • In silico drug repurposing • Zero-cost • Browser-only
      </footer>
    </div>
  );
}
