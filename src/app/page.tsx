"use client";

import { useState, useMemo } from "react";
import { PATHOGENS, type Pathogen } from "@/data/pathogens";
import { DRUGS, type Drug } from "@/data/drugs";
import { virtualScreening, getTopResults, type DockingResult } from "@/lib/docking";

export default function Home() {
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

    // Simulate async (gives UI time to update)
    setTimeout(() => {
      const all = virtualScreening(DRUGS, pathogen.targets);
      setResults(all);
      setRunning(false);
    }, 100);
  };

  const topResults = useMemo(
    () => getTopResults(results, 50, lipinskiOnly),
    [results, lipinskiOnly],
  );

  const scoreColor = (score: number) => {
    if (score >= 75) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    if (score >= 30) return "text-orange-600";
    return "text-red-600";
  };

  const activityLabel: Record<string, string> = {
    antiviral: "🦠 Противовирусное",
    antibacterial: "🧫 Антибактериальное",
    antiparasitic: "🔬 Противопаразитарное",
    antiinflammatory: "💊 Противовоспалительное",
    unknown: "❓ Неизвестно",
  };

  return (
    <main className="min-h-screen max-w-6xl mx-auto p-4 md:p-6">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          🧬 VetInSilico
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          In silico drug repurposing — скрининг {DRUGS.length} препаратов против ветеринарных патогенов. Все вычисления в браузере.
        </p>
      </header>

      {/* Step 1: Select pathogen */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">1. Выберите патоген</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {PATHOGENS.map((p) => (
            <button
              key={p.id}
              onClick={() => { setSelectedPathogen(p.id); setResults([]); }}
              className={`text-left p-3 rounded-lg border transition-all ${
                selectedPathogen === p.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="font-medium text-sm">{p.name_ru}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {p.type === "virus" ? "Вирус" : p.type === "bacterium" ? "Бактерия" : "Паразит"} • {p.targets.length} мишеней
              </div>
              {p.priority_ru === 1 && (
                <div className="text-xs text-red-500 mt-1">⚡ Приоритет РФ</div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Pathogen details */}
      {pathogen && (
        <section className="mb-6 p-4 rounded-lg bg-muted/30 border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
            <div><span className="text-muted-foreground">Тип:</span> {pathogen.type === "virus" ? "Вирус" : "Бактерия"}</div>
            <div><span className="text-muted-foreground">Геном:</span> {pathogen.genome}</div>
            <div><span className="text-muted-foreground">Статус РФ:</span> {pathogen.rf_status}</div>
            <div><span className="text-muted-foreground">Известные классы:</span> {pathogen.known_drug_classes.join(", ")}</div>
          </div>
          <div className="space-y-2">
            {pathogen.targets.map((t) => (
              <div key={t.id} className="text-sm">
                <span className="font-medium">🎯 {t.name_ru}</span>
                <span className="text-muted-foreground"> ({t.mw_kda} кДа, {t.pockets.length} карман(ов))</span>
                {t.pdb_id && <span className="text-xs ml-1 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">PDB: {t.pdb_id}</span>}
                <p className="text-xs text-muted-foreground mt-0.5">{t.function_ru}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Step 2: Run screening */}
      {pathogen && (
        <section className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={runScreening}
              disabled={running}
              className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 hover:opacity-90 transition"
            >
              {running ? "⏳ Скрининг..." : `🚀 Запустить скрининг (${DRUGS.length} препаратов)`}
            </button>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={lipinskiOnly}
                onChange={(e) => setLipinskiOnly(e.target.checked)}
                className="rounded"
              />
              Только Lipinski-совместимые
            </label>
          </div>
        </section>
      )}

      {/* Results */}
      {topResults.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">
            3. Результаты скрининга ({topResults.length} препаратов)
          </h2>
          <div className="overflow-x-auto thin-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Препарат</th>
                  <th className="py-2 pr-3">Мишень</th>
                  <th className="py-2 pr-3 text-center">Score</th>
                  <th className="py-2 pr-3 text-center hidden md:table-cell">Форма</th>
                  <th className="py-2 pr-3 hidden md:table-cell">Активность</th>
                  <th className="py-2 pr-3 text-center hidden md:table-cell">ΔG</th>
                  <th className="py-2 pr-3 text-center hidden lg:table-cell">Lip.</th>
                  <th className="py-2 pr-3 text-center hidden lg:table-cell">Сел.</th>
                </tr>
              </thead>
              <tbody>
                {topResults.map((r, i) => (
                  <tr
                    key={`${r.drug.id}-${r.target.id}-${i}`}
                    className="border-b hover:bg-muted/30 cursor-pointer transition"
                    onClick={() => setSelectedResult(r)}
                  >
                    <td className="py-2 pr-3 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 pr-3 font-medium">{r.drug.name}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{r.target.name_ru}</td>
                    <td className={`py-2 pr-3 text-center font-bold ${scoreColor(r.score)}`}>{r.score}</td>
                    <td className="py-2 pr-3 text-xs hidden md:table-cell">{r.drug.form}</td>
                    <td className="py-2 pr-3 text-xs hidden md:table-cell">{activityLabel[r.drug.activity]}</td>
                    <td className="py-2 pr-3 text-center text-xs hidden md:table-cell">{r.bindingAffinity}</td>
                    <td className="py-2 pr-3 text-center hidden lg:table-cell">
                      {r.lipinskiPass ? "✅" : `⚠️ ${r.lipinskiViolations}`}
                    </td>
                    <td className="py-2 pr-3 text-center text-xs hidden lg:table-cell">{r.selectivityIndex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Detail dialog */}
      {selectedResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedResult(null)}>
          <div className="bg-background rounded-xl border max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">{selectedResult.drug.name}</h3>
                <p className="text-sm text-muted-foreground">МНН: {selectedResult.drug.inn}</p>
              </div>
              <button onClick={() => setSelectedResult(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded bg-muted/30">
                  <div className="text-xs text-muted-foreground">Общий score</div>
                  <div className={`text-xl font-bold ${scoreColor(selectedResult.score)}`}>{selectedResult.score}/100</div>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <div className="text-xs text-muted-foreground">ΔG (kcal/mol)</div>
                  <div className="text-xl font-bold">{selectedResult.bindingAffinity}</div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Shape complementarity:</span><span className="font-medium">{selectedResult.shapeScore}/100</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Electrostatic match:</span><span className="font-medium">{selectedResult.electrostaticScore}/100</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Hydrophobic match:</span><span className="font-medium">{selectedResult.hydrophobicScore}/100</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Selectivity index:</span><span className="font-medium">{selectedResult.selectivityIndex}/100</span></div>
              </div>

              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Фармгруппа:</span><span>{selectedResult.drug.pharm_group}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Механизм:</span><span className="text-right">{selectedResult.drug.mechanism || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Мол. масса:</span><span>{selectedResult.drug.mw} Да</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">LogP:</span><span>{selectedResult.drug.logp}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">H-bond D/A:</span><span>{selectedResult.drug.hbd}/{selectedResult.drug.hba}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Lipinski:</span><span>{selectedResult.lipinskiPass ? "✅ Совместим" : `⚠️ ${selectedResult.lipinskiViolations} нарушений`}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">В реестре РФ:</span><span>{selectedResult.drug.ru_registered ? "✅ Да" : "❌ Нет"}</span></div>
              </div>

              <div className="border-t pt-2">
                <div className="text-xs text-muted-foreground">Мишень: {selectedResult.target.name_ru}</div>
                <div className="text-xs text-muted-foreground">PDB: {selectedResult.target.pdb_id || "—"}</div>
                <div className="text-xs mt-1">{selectedResult.target.function_ru}</div>
              </div>

              <div className="border-t pt-2 text-xs text-muted-foreground">
                ⚠️ Результаты упрощённой модели. Не являются медицинской рекомендацией.
                Требуется экспериментальная валидация (in vitro / in vivo).
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-12 pt-4 border-t text-xs text-muted-foreground text-center">
        VetInSilico — упрощённая модель in silico скрининга. Не заменяет эксперимент.
        Данные: RCSB PDB, российский реестр ветпрепаратов. Zero-cost, zero-backend.
      </footer>
    </main>
  );
}
