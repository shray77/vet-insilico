"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import HubHeader from "@/components/HubHeader";
import { simulatePK, computePD, DRUG_PK_PROFILES } from "@/lib/pkpd";

export default function PKPDPage() {
  const [profileIdx, setProfileIdx] = useState(0);
  const profile = DRUG_PK_PROFILES[profileIdx];

  const [dose, setDose] = useState(5); // mg/kg
  const [interval, setInterval] = useState(24); // h
  const [nDoses, setNDoses] = useState(5);
  const [mic, setMic] = useState(profile.mic || 1);
  const [pdTarget, setPdTarget] = useState(profile.pdTarget || 100);

  const pkParams = {
    ...profile.params,
    dose,
    interval,
    nDoses,
  };

  const pk = useMemo(() => simulatePK(pkParams), [JSON.stringify(pkParams)]);
  const pd = useMemo(() => computePD(pk, {
    emax: 100, ec50: profile.mic || 1, hill: 1.5,
    mic, targetType: profile.pdType, targetValue: pdTarget,
  }), [pk, mic, pdTarget, profile.mic, profile.pdType]);

  // SVG dimensions for plot
  const W = 700, H = 300, P = 40;
  const maxConc = Math.max(...pk.concentrations, 1);
  const maxX = pk.times[pk.times.length - 1];

  const xScale = (t: number) => P + (t / maxX) * (W - 2 * P);
  const yScale = (c: number) => H - P - (c / maxConc) * (H - 2 * P);

  const pathD = pk.times.map((t, i) => `${i === 0 ? "M" : "L"} ${xScale(t).toFixed(1)} ${yScale(pk.concentrations[i]).toFixed(1)}`).join(" ");

  // Emax curve SVG
  const eW = 350, eH = 200, eP = 30;
  const eMaxConc = pd.curve.length > 0 ? pd.curve[pd.curve.length - 1].conc : 10;
  const exScale = (c: number) => eP + (c / eMaxConc) * (eW - 2 * eP);
  const eyScale = (e: number) => eH - eP - (e / 100) * (eH - 2 * eP);
  const ePathD = pd.curve.map((p, i) => `${i === 0 ? "M" : "L"} ${exScale(p.conc).toFixed(1)} ${eyScale(p.effect).toFixed(1)}`).join(" ");

  const loadProfile = (idx: number) => {
    setProfileIdx(idx);
    setMic(DRUG_PK_PROFILES[idx].mic || 1);
    setPdTarget(DRUG_PK_PROFILES[idx].pdTarget || 100);
  };

  return (
    <div className="min-h-screen">
      <HubHeader />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-teal-500">Хаб</Link>
          <span className="mx-1">/</span>
          <span>PK/PD Simulator</span>
        </div>

        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-4 mb-6">
          <h2 className="font-semibold text-rose-900 dark:text-rose-100 mb-1">
            💉 PK/PD Simulator — фармакокинетика + фармакодинамика
          </h2>
          <p className="text-sm text-rose-800 dark:text-rose-200">
            Однокомпартментная модель с first-order absorption. Считаем Cmax, AUC, t½, Css.
            PD-индексы: AUC/MIC (фторхинолоны), Cmax/MIC (аминогликозиды), T&gt;MIC (β-лактамы).
            Визуализация concentration-time графика + Emax dose-response.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input */}
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
              Препарат (профиль)
            </h3>
            <div className="space-y-2 mb-4">
              {DRUG_PK_PROFILES.map((p, i) => (
                <button
                  key={i}
                  onClick={() => loadProfile(i)}
                  className={`w-full text-left p-3 rounded-lg text-sm transition border ${
                    profileIdx === i
                      ? "bg-rose-600 text-white border-rose-600"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-rose-300 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <div className="font-medium">{p.name}</div>
                  <div className={`text-xs ${profileIdx === i ? "text-rose-100" : "text-zinc-400"}`}>
                    {p.group} • {p.species}
                  </div>
                </button>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3 mt-4">
              Режим дозирования
            </h3>
            <div className="space-y-3">
              <label className="block">
                <div className="text-xs text-zinc-500">Доза: <b>{dose} мг/кг</b></div>
                <input type="range" min={1} max={30} step={0.5} value={dose}
                  onChange={(e) => setDose(Number(e.target.value))}
                  className="w-full accent-rose-600 mt-1" />
              </label>
              <label className="block">
                <div className="text-xs text-zinc-500">Интервал: <b>{interval} ч</b> ({(24/interval).toFixed(1)} раза/день)</div>
                <input type="range" min={6} max={48} step={2} value={interval}
                  onChange={(e) => setInterval(Number(e.target.value))}
                  className="w-full accent-rose-600 mt-1" />
              </label>
              <label className="block">
                <div className="text-xs text-zinc-500">Кол-во доз: <b>{nDoses}</b></div>
                <input type="range" min={1} max={15} value={nDoses}
                  onChange={(e) => setNDoses(Number(e.target.value))}
                  className="w-full accent-rose-600 mt-1" />
              </label>
              <label className="block">
                <div className="text-xs text-zinc-500">MIC: <b>{mic} мг/л</b></div>
                <input type="range" min={0.05} max={8} step={0.05} value={mic}
                  onChange={(e) => setMic(Number(e.target.value))}
                  className="w-full accent-rose-600 mt-1" />
              </label>
              <label className="block">
                <div className="text-xs text-zinc-500">PD target: <b>{pdTarget}</b></div>
                <input type="range" min={10} max={500} step={5} value={pdTarget}
                  onChange={(e) => setPdTarget(Number(e.target.value))}
                  className="w-full accent-rose-600 mt-1" />
              </label>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* PK plot */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
                Concentration-time profile ({profile.name})
              </h3>
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-900 overflow-x-auto">
                <svg width={W} height={H} className="max-w-full">
                  {/* Axes */}
                  <line x1={P} y1={H-P} x2={W-P} y2={H-P} stroke="#52525b" />
                  <line x1={P} y1={P} x2={P} y2={H-P} stroke="#52525b" />
                  {/* MIC line */}
                  <line x1={P} y1={yScale(mic)} x2={W-P} y2={yScale(mic)} stroke="#dc2626" strokeWidth={1.5} strokeDasharray="4,4" />
                  <text x={W-P} y={yScale(mic)-4} textAnchor="end" fontSize={10} fill="#dc2626">MIC = {mic}</text>
                  {/* Css_max line */}
                  <line x1={P} y1={yScale(pk.cssMax)} x2={W-P} y2={yScale(pk.cssMax)} stroke="#84cc16" strokeWidth={1} strokeDasharray="2,2" />
                  <text x={W-P} y={yScale(pk.cssMax)-4} textAnchor="end" fontSize={10} fill="#84cc16">Css,max = {pk.cssMax}</text>
                  {/* Profile curve */}
                  <path d={pathD} fill="none" stroke="#0d9488" strokeWidth={2} />
                  {/* Axis labels */}
                  <text x={W/2} y={H-8} textAnchor="middle" fontSize={11} fill="#71717a">Время (часы)</text>
                  <text x={12} y={H/2} textAnchor="middle" fontSize={11} fill="#71717a" transform={`rotate(-90 12 ${H/2})`}>Концентрация (мг/л)</text>
                  {/* X ticks */}
                  {[0, 0.25, 0.5, 0.75, 1].map((f) => {
                    const t = f * maxX;
                    return (
                      <text key={f} x={xScale(t)} y={H-P+14} textAnchor="middle" fontSize={9} fill="#71717a">{t.toFixed(0)}</text>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* PK stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                <div className="text-xs text-zinc-400">Cmax</div>
                <div className="text-lg font-bold text-rose-600">{pk.cmax}</div>
                <div className="text-[10px] text-zinc-400">мг/л</div>
              </div>
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                <div className="text-xs text-zinc-400">AUC</div>
                <div className="text-lg font-bold text-rose-600">{pk.auc}</div>
                <div className="text-[10px] text-zinc-400">мг·ч/л</div>
              </div>
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                <div className="text-xs text-zinc-400">t½</div>
                <div className="text-lg font-bold text-rose-600">{pk.halfLife}</div>
                <div className="text-[10px] text-zinc-400">ч</div>
              </div>
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                <div className="text-xs text-zinc-400">CL</div>
                <div className="text-lg font-bold text-rose-600">{pk.clearance}</div>
                <div className="text-[10px] text-zinc-400">л/ч/кг</div>
              </div>
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                <div className="text-xs text-zinc-400">Css avg</div>
                <div className="text-lg font-bold text-emerald-600">{pk.cssAvg}</div>
                <div className="text-[10px] text-zinc-400">мг/л</div>
              </div>
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                <div className="text-xs text-zinc-400">Css max</div>
                <div className="text-lg font-bold text-emerald-600">{pk.cssMax}</div>
                <div className="text-[10px] text-zinc-400">мг/л</div>
              </div>
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                <div className="text-xs text-zinc-400">Css min</div>
                <div className="text-lg font-bold text-emerald-600">{pk.cssMin}</div>
                <div className="text-[10px] text-zinc-400">мг/л</div>
              </div>
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 text-center">
                <div className="text-xs text-zinc-400">Vd</div>
                <div className="text-lg font-bold text-rose-600">{profile.params.Vd}</div>
                <div className="text-[10px] text-zinc-400">л/кг</div>
              </div>
            </div>

            {/* PD analysis */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900">
              <h3 className="font-semibold mb-3">🎯 Фармакодинамический анализ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Emax curve */}
                <svg width={eW} height={eH}>
                  <line x1={eP} y1={eH-eP} x2={eW-eP} y2={eH-eP} stroke="#52525b" />
                  <line x1={eP} y1={eP} x2={eP} y2={eH-eP} stroke="#52525b" />
                  <line x1={exScale(profile.mic || 1)} y1={eP} x2={exScale(profile.mic || 1)} y2={eH-eP} stroke="#dc2626" strokeWidth={1} strokeDasharray="2,2" />
                  <text x={exScale(profile.mic || 1)+2} y={eP+10} fontSize={9} fill="#dc2626">MIC</text>
                  <path d={ePathD} fill="none" stroke="#0ea5e9" strokeWidth={2} />
                  <text x={eW/2} y={eH-4} textAnchor="middle" fontSize={9} fill="#71717a">Концентрация (мг/л)</text>
                  <text x={8} y={eH/2} textAnchor="middle" fontSize={9} fill="#71717a" transform={`rotate(-90 8 ${eH/2})`}>Эффект %</text>
                </svg>
                {/* PD index */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">PD-индекс:</span>
                    <span className="font-bold text-rose-600 text-lg">{pd.pdIndex}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Тип:</span>
                    <span className="font-mono text-xs">
                      {profile.pdType === "auc_mic" ? "AUC/MIC" : profile.pdType === "cmax_mic" ? "Cmax/MIC" : "T>MIC (%)"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Цель:</span>
                    <span className="font-mono">≥ {pdTarget}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Достигнута:</span>
                    <span className={`font-bold ${pd.targetAttained ? "text-green-600" : "text-red-600"}`}>
                      {pd.targetAttained ? "✅ Да" : "❌ Нет"}
                    </span>
                  </div>
                  <div className="mt-3 p-2 rounded text-xs bg-zinc-100 dark:bg-zinc-800">
                    {pd.recommendation}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-xs text-zinc-500 dark:text-zinc-400">
              <b>Модель:</b> Однокомпартментная с first-order absorption (для oral) или IV bolus.
              <b> PD-таргеты</b> (Mouton & Ambrose 2007):
              β-лактамы — T&gt;MIC ≥ 40% интервала; фторхинолоны (грам-) — AUC/MIC ≥ 125;
              аминогликозиды — Cmax/MIC ≥ 10.<br/>
              <b>⚠️</b> Упрощённая модель. Реальная PK зависит от вида, возраста, болезни, взаимодействия.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
