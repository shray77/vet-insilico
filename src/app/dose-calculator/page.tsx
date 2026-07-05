"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import HubHeader from "@/components/HubHeader";
import { AVAILABLE_SPECIES_DOSE, getDrugsForSpecies, getDoseRates, calculateDose, DOSE_DATABASE } from "@/lib/dose";

export default function DoseCalculatorPage() {
  const [species, setSpecies] = useState(AVAILABLE_SPECIES_DOSE[0]);
  const [drug, setDrug] = useState(getDrugsForSpecies(AVAILABLE_SPECIES_DOSE[0])[0]);
  const [weight, setWeight] = useState(50);
  const [concentration, setConcentration] = useState(100);
  const [ageGroup, setAgeGroup] = useState<"neonate" | "young" | "adult">("adult");
  const [pricePerMl, setPricePerMl] = useState(0);

  const availableDrugs = useMemo(() => getDrugsForSpecies(species), [species]);
  const doseRates = useMemo(() => getDoseRates(drug, species), [drug, species]);

  const results = useMemo(() => {
    return doseRates.map(dr => calculateDose(dr, weight, { concentration, pricePerMl: pricePerMl || undefined, ageGroup }));
  }, [doseRates, weight, concentration, pricePerMl, ageGroup]);

  const loadSpecies = (sp: string) => {
    setSpecies(sp);
    const drugs = getDrugsForSpecies(sp);
    setDrug(drugs[0]);
  };

  return (
    <div className="min-h-screen">
      <HubHeader />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-teal-500">Хаб</Link>
          <span className="mx-1">/</span>
          <span>Antibiotic Dose Calculator</span>
        </div>
        <div className="rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 p-4 mb-6">
          <h2 className="font-semibold text-cyan-900 dark:text-cyan-100 mb-1">💊 Antibiotic Dose Calculator (ветеринарный)</h2>
          <p className="text-sm text-cyan-800 dark:text-cyan-200">
            Калькулятор дозировки антибиотиков для 6 видов животных. База: {DOSE_DATABASE.length} схем дозирования.
            Расчёт по весу, коррекция на возраст, концентрацию препарата, стоимость курса.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Параметры</h3>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-zinc-500">Вид животного</span>
                <select value={species} onChange={(e) => loadSpecies(e.target.value)}
                  className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm">
                  {AVAILABLE_SPECIES_DOSE.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500">Препарат</span>
                <select value={drug} onChange={(e) => setDrug(e.target.value)}
                  className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm">
                  {availableDrugs.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500">Вес животного: <b>{weight} кг</b></span>
                <input type="range" min={0.5} max={600} step={0.5} value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full accent-cyan-600 mt-1" />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500">Возрастная группа</span>
                <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value as any)}
                  className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm">
                  <option value="adult">Взрослое животное</option>
                  <option value="young">Молодое (-15%)</option>
                  <option value="neonate">Новорождённое (-30%)</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500">Концентрация препарата: <b>{concentration} мг/мл</b></span>
                <input type="number" min={1} max={1000} value={concentration}
                  onChange={(e) => setConcentration(Number(e.target.value))}
                  className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500">Цена за мл (₽, опционально)</span>
                <input type="number" min={0} step={0.1} value={pricePerMl}
                  onChange={(e) => setPricePerMl(Number(e.target.value))}
                  className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm" />
              </label>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            {results.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-400">Нет данных для этого препарата/вида</div>
            ) : (
              <>
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-bold text-cyan-600">{results.length}</div>
                    <div>
                      <div className="text-sm font-medium">схем дозирования для {drug} ({species})</div>
                      <div className="text-xs text-zinc-500">База: Plumb's Veterinary Drug Handbook + РФ реестр</div>
                    </div>
                  </div>
                </div>
                {results.map((r, i) => (
                  <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-lg">{r.drug}</div>
                        <div className="text-xs text-zinc-400">{r.species} • {r.route} • каждые {r.intervalHours}ч • {r.durationDays} дн</div>
                      </div>
                      {r.warning && (
                        <span className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300">⚠️ {r.warning}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 p-2 text-center">
                        <div className="text-xs text-zinc-400">Разовая доза</div>
                        <div className="font-bold text-cyan-600">{r.dosePerAdministration} мг</div>
                        {r.doseVolume > 0 && <div className="text-[10px] text-zinc-400">= {r.doseVolume} мл</div>}
                      </div>
                      <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 p-2 text-center">
                        <div className="text-xs text-zinc-400">В день</div>
                        <div className="font-bold text-cyan-600">{r.totalDailyDose} мг</div>
                      </div>
                      <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 p-2 text-center">
                        <div className="text-xs text-zinc-400">Введений</div>
                        <div className="font-bold text-cyan-600">{r.numberOfAdministrations}</div>
                      </div>
                      <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 p-2 text-center">
                        <div className="text-xs text-zinc-400">Курс всего</div>
                        <div className="font-bold text-cyan-600">{r.totalCourseDose} мг</div>
                      </div>
                    </div>
                    {r.estimatedCost && (
                      <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                        💰 Стоимость курса: <b>{r.estimatedCost.toFixed(1)} ₽</b>
                      </div>
                    )}
                    {r.notes && (
                      <div className="mt-2 p-2 rounded text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200">
                        📋 {r.notes}
                      </div>
                    )}
                    {r.contraindications && (
                      <div className="mt-1 p-2 rounded text-xs bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200">
                        ⚠️ {r.contraindications}
                      </div>
                    )}
                  </div>
                ))}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-xs text-zinc-500 dark:text-zinc-400">
                  <b>Источники:</b> Plumb's Veterinary Drug Handbook, Российский реестр ветпрепаратов, SWAB/SVA guidelines.<br/>
                  <b>⚠️</b> Калькулятор только для оценки. Всегда сверяйтесь с инструкцией производителя и консультируйтесь с ветврачом.
                  Учитывайте период ожидания (withdrawal time) для продуктивных животных.
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
