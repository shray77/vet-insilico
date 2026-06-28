"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import HubHeader from "@/components/HubHeader";
import { DRUGS } from "@/data/drugs";
import { predictADMET, ADMET_LABELS_RU, LEVEL_COLOR, type AdmetLevel } from "@/lib/admet";
import { predictADMETML, getHfToken, type ADMETMLResult } from "@/lib/hf";

export default function AdmetPage() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>(DRUGS[0].id);
  const [mlResult, setMlResult] = useState<ADMETMLResult | null>(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlError, setMlError] = useState("");

  const filteredDrugs = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return DRUGS.slice(0, 50);
    return DRUGS.filter(
      (d) => d.name.toLowerCase().includes(q) || d.inn.toLowerCase().includes(q),
    ).slice(0, 50);
  }, [query]);

  const drug = useMemo(
    () => DRUGS.find((d) => d.id === selectedId) || DRUGS[0],
    [selectedId],
  );

  const result = useMemo(() => predictADMET(drug), [drug]);

  // Reset ML when drug changes
  useMemo(() => {
    setMlResult(null);
    setMlError("");
  }, [selectedId]);

  const runML = async () => {
    if (!drug.smiles) {
      setMlError("У этого препарата нет SMILES — ML-анализ недоступен");
      return;
    }
    if (!getHfToken()) {
      setMlError("Задайте HF token — кнопка 🤖 в шапке");
      return;
    }
    setMlLoading(true);
    setMlError("");
    setMlResult(null);
    try {
      const r = await predictADMETML(drug.smiles, drug.name);
      setMlResult(r);
    } catch (e: any) {
      setMlError(e.message || "ML error");
    } finally {
      setMlLoading(false);
    }
  };

  const levelLabel = (l: AdmetLevel) =>
    l === "low" ? "Низкий" : l === "moderate" ? "Умеренный" : "Высокий";

  const levelBg = (l: AdmetLevel) =>
    l === "low" ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300"
    : l === "moderate" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300"
    : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300";

  // Items for the property grid
  const items: { key: string; value: number; level: AdmetLevel; suffix?: string; invert?: boolean }[] = [
    { key: "oralBioavailability", value: result.oralBioavailability, level: result.oralBioavailabilityLevel, suffix: "%" },
    { key: "bbbPermeability", value: result.bbbPermeability, level: result.bbbPermeabilityLevel, invert: true },
    { key: "caco2", value: result.caco2, level: result.caco2Level, suffix: " ×10⁻⁶ см/с" },
    { key: "ppb", value: result.ppb, level: result.ppbLevel, suffix: "%" },
    { key: "vd", value: result.vd, level: result.vdLevel, suffix: " л/кг" },
    { key: "logS", value: result.logS, level: result.solubilityLevel, suffix: " моль/л" },
    { key: "hergRisk", value: result.hergRisk, level: result.hergRiskLevel, invert: true },
    { key: "amesRisk", value: result.amesRisk, level: result.amesRiskLevel, invert: true },
    { key: "hepatotoxicityRisk", value: result.hepatotoxicityRisk, level: result.hepatotoxicityRiskLevel, invert: true },
    { key: "skinSensitization", value: result.skinSensitization, level: result.skinSensitizationLevel, invert: true },
    { key: "bioaccumulation", value: result.bioaccumulation, level: result.bioaccumulationLevel, invert: true },
  ];

  return (
    <div className="min-h-screen">
      <HubHeader />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-teal-500">Хаб</Link>
          <span className="mx-1">/</span>
          <span>ADMET Predictor</span>
        </div>

        <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 mb-6">
          <h2 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
            💊 ADMET Predictor — фармакокинетика и токсичность
          </h2>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Выбираем препарат → получаем 12 параметров: всасывание, распределение, метаболизм,
            выведение, токсичность. Все расчёты по молекулярным дескрипторам (rule-based эвристики).
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Drug search & list */}
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
              Поиск препарата
            </h3>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Название или МНН..."
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm mb-3"
            />
            <div className="space-y-1 max-h-[600px] overflow-y-auto thin-scroll">
              {filteredDrugs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  className={`w-full text-left p-2 rounded-lg text-sm transition ${
                    selectedId === d.id
                      ? "bg-blue-600 text-white"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <div className="font-medium">{d.name}</div>
                  <div className={`text-xs ${selectedId === d.id ? "text-blue-100" : "text-zinc-400"}`}>
                    {d.pharm_group}
                  </div>
                </button>
              ))}
              {filteredDrugs.length === 0 && (
                <div className="text-xs text-zinc-400 text-center py-4">Не найдено</div>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Drug card */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold">{drug.name}</h3>
                  <p className="text-xs text-zinc-400">МНН: {drug.inn}</p>
                </div>
                <div className="text-right text-xs">
                  <div className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800">{drug.pharm_group}</div>
                  <div className="mt-1 text-zinc-400">{drug.form}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                <div className="text-center"><div className="text-zinc-400">MW</div><div className="font-medium">{drug.mw}</div></div>
                <div className="text-center"><div className="text-zinc-400">LogP</div><div className="font-medium">{drug.logp}</div></div>
                <div className="text-center"><div className="text-zinc-400">HBD</div><div className="font-medium">{drug.hbd}</div></div>
                <div className="text-center"><div className="text-zinc-400">HBA</div><div className="font-medium">{drug.hba}</div></div>
                <div className="text-center"><div className="text-zinc-400">RB</div><div className="font-medium">{drug.rotatable_bonds}</div></div>
                <div className="text-center"><div className="text-zinc-400">Заряд</div><div className="font-medium">{drug.charge > 0 ? "+" : drug.charge < 0 ? "−" : "0"}</div></div>
              </div>
              <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400 italic">
                Механизм: {drug.mechanism || "—"}
              </div>
            </div>

            {/* Drug-likeness summary */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-950/30 dark:to-teal-950/30">
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-zinc-200 dark:text-zinc-800" />
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#0ea5e9" strokeWidth="6" strokeDasharray={`${(result.drugLikeness / 100) * 213.6} 213.6`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-blue-500">
                    {result.drugLikeness}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400">Drug-likeness Score</div>
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {result.drugLikeness >= 70 ? "Отличный кандидат" : result.drugLikeness >= 50 ? "Хороший" : result.drugLikeness >= 30 ? "Сомнительный" : "Плохой кандидат"}
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Интегральная оценка на основе Lipinski, Veber и токс-алертов
                  </div>
                </div>
              </div>
            </div>

            {/* Alerts */}
            {result.alerts.length > 0 && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
                <div className="font-semibold text-amber-700 dark:text-amber-300 text-sm mb-2">
                  ⚠️ Алерты ({result.alerts.length})
                </div>
                <ul className="text-xs space-y-1 list-disc list-inside text-amber-800 dark:text-amber-200">
                  {result.alerts.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}

            {/* Property grid */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
                Полный ADMET-профиль
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((item) => (
                  <div key={item.key} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-900">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {ADMET_LABELS_RU[item.key]}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${levelBg(item.level)}`}>
                        {levelLabel(item.level)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-bold" style={{ color: LEVEL_COLOR[item.level] }}>
                        {item.value}{item.suffix}
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.abs(item.value) * (item.suffix === "%" ? 1 : 100))}%`,
                          backgroundColor: LEVEL_COLOR[item.level],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Metabolism / clearance */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900">
              <h3 className="text-sm font-semibold mb-3">⚗️ Метаболизм и клиренс</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-zinc-400 mb-1">Печёночный клиренс</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${result.hepaticExtraction * 100}%` }} />
                    </div>
                    <span className="text-xs font-mono">{Math.round(result.hepaticExtraction * 100)}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400 mb-1">Почечный клиренс</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${result.renalClearance * 100}%` }} />
                    </div>
                    <span className="text-xs font-mono">{Math.round(result.renalClearance * 100)}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400 mb-1">Субстрат CYP3A4</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${result.cyp3a4Substrate * 100}%` }} />
                    </div>
                    <span className="text-xs font-mono">{Math.round(result.cyp3a4Substrate * 100)}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400 mb-1">Ингибитор CYP3A4</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${result.cyp3a4Inhibitor * 100}%` }} />
                    </div>
                    <span className="text-xs font-mono">{Math.round(result.cyp3a4Inhibitor * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Path B: ML ADMET via LLM on SMILES */}
            <div className="rounded-xl border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/20 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                  🧬 ML ADMET (Path B, Qwen-Coder-3B через SMILES)
                </h3>
                {drug.smiles ? (
                  <code className="text-[10px] font-mono text-purple-600 dark:text-purple-400 break-all max-w-[200px]">
                    {drug.smiles.length > 30 ? drug.smiles.slice(0, 30) + "..." : drug.smiles}
                  </code>
                ) : (
                  <span className="text-[10px] text-zinc-400">нет SMILES</span>
                )}
              </div>

              {!mlResult && !mlLoading && (
                <div>
                  <p className="text-xs text-purple-800 dark:text-purple-200 mb-3">
                    Запускает LLM (Qwen-Coder-3B, 3B params) на SMILES-структуре препарата.
                    Модель видела миллионы SMILES в pretraining и может распознавать структурные алерты
                    (токсофоры, реактивные группы). Это приближение ADMETlab 3.0 (которая использует GNN).
                  </p>
                  <button
                    onClick={runML}
                    disabled={!drug.smiles}
                    className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition"
                  >
                    🧬 ML анализ через SMILES
                  </button>
                  {!drug.smiles && (
                    <div className="text-xs text-amber-500 mt-2">
                      ⚠️ Для этого препарата нет SMILES в базе (только {DRUGS.filter(d => d.smiles).length} из {DRUGS.length} препаратов имеют SMILES)
                    </div>
                  )}
                </div>
              )}

              {mlLoading && (
                <div className="text-sm text-purple-700 dark:text-purple-300">
                  ⏳ LLM анализирует SMILES...
                </div>
              )}

              {mlError && (
                <div className="text-xs text-red-500 mt-2 p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  ⚠️ {mlError}
                </div>
              )}

              {mlResult && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs">
                      <span className="text-zinc-500">Overall risk:</span>{" "}
                      <span className={`font-bold px-2 py-0.5 rounded-full text-white ${
                        mlResult.overallRisk === "low" ? "bg-green-500"
                        : mlResult.overallRisk === "moderate" ? "bg-yellow-500" : "bg-red-500"
                      }`}>
                        {mlResult.overallRisk === "low" ? "Низкий" : mlResult.overallRisk === "moderate" ? "Умеренный" : "Высокий"}
                      </span>
                    </div>
                    <div className="text-xs">
                      <span className="text-zinc-500">Drug-likeness (ML):</span>{" "}
                      <b className="text-purple-600">{mlResult.drugLikenessScore}/100</b>
                    </div>
                  </div>

                  <div className="text-xs italic text-zinc-600 dark:text-zinc-300 p-2 rounded bg-white dark:bg-zinc-900">
                    💭 {mlResult.rationale}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {[
                      { label: "AMES мутаген.", v: mlResult.ames.positive, conf: mlResult.ames.confidence },
                      { label: "hERG блокер", v: mlResult.herg.blocker, conf: mlResult.herg.confidence },
                      { label: "Гепатотокс.", v: mlResult.hepatotoxic.positive, conf: mlResult.hepatotoxic.confidence },
                      { label: "Канцероген.", v: mlResult.carcinogenic.positive, conf: mlResult.carcinogenic.confidence },
                      { label: "Эндокрин. диср.", v: mlResult.endocrineDisruptor.positive, conf: mlResult.endocrineDisruptor.confidence },
                      { label: "Респир. токс.", v: mlResult.respiratoryToxicity.positive, conf: mlResult.respiratoryToxicity.confidence },
                    ].map((item, i) => (
                      <div key={i} className="rounded-lg bg-white dark:bg-zinc-900 p-2 border border-zinc-200 dark:border-zinc-800">
                        <div className="text-[10px] text-zinc-500">{item.label}</div>
                        <div className="flex items-center gap-1">
                          <span className={`text-sm font-bold ${item.v ? "text-red-500" : "text-green-500"}`}>
                            {item.v ? "⚠️ Да" : "✓ Нет"}
                          </span>
                        </div>
                        <div className="text-[9px] text-zinc-400">conf: {(item.conf * 100).toFixed(0)}%</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded bg-white dark:bg-zinc-900 p-2 text-center">
                      <div className="text-zinc-400 text-[10px]">BCF</div>
                      <div className="font-bold text-purple-600">{mlResult.bioconcentrationFactor}</div>
                    </div>
                    <div className="rounded bg-white dark:bg-zinc-900 p-2 text-center">
                      <div className="text-zinc-400 text-[10px]">TPSA</div>
                      <div className="font-bold text-purple-600">{mlResult.tpsa} Å²</div>
                    </div>
                    <div className="rounded bg-white dark:bg-zinc-900 p-2 text-center">
                      <div className="text-zinc-400 text-[10px]">Rot. bonds</div>
                      <div className="font-bold text-purple-600">{mlResult.rotatableBonds}</div>
                    </div>
                  </div>

                  {mlResult.alerts.length > 0 && (
                    <div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mb-1">⚠️ Структурные алерты:</div>
                      <ul className="text-xs list-disc list-inside space-y-0.5 text-zinc-700 dark:text-zinc-300">
                        {mlResult.alerts.map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={() => setMlResult(null)}
                    className="text-xs text-zinc-400 hover:text-zinc-600"
                  >
                    ↻ Перезапустить ML
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-xs text-zinc-500 dark:text-zinc-400">
              <b>Источники правил:</b> Lipinski 2004 (Rule of Five), Veber 2002 (PSA/RB),
              Egan & Lauri 2002 (BBB), Hughes 2008 (oral bioavailability), Dsouza 2011 (hERG),
              Wang 1999 (logS), BIMAS-derived PSSM (MHC).<br/>
              <b>⚠️ Не для клинического применения</b> — упрощённая оценка для генерации гипотез.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
