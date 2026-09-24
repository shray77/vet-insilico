"use client";

import { useEffect, useState } from "react";
import { fetchLiveOutbreaks, type LiveOutbreaksResult } from "@/lib/cloud";

/**
 * Live-панель вспышек — полу-динамика на статическом сайте.
 *
 * Данные: зеркало heatmap-датасета в KV воркера vet-api (обновляется
 * Actions-мостом vet-heatmap каждые 6 ч). Если воркер недоступен
 * (в т.ч. РКН-блокировка workers.dev в РФ) — панель просто не рендерится:
 * страница остаётся статичной и полностью функциональной.
 */
export default function LiveOutbreaks({ limit = 8 }: { limit?: number }) {
  const [data, setData] = useState<LiveOutbreaksResult | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "off">("loading");

  useEffect(() => {
    let alive = true;
    fetchLiveOutbreaks({ limit }, 5000)
      .then((d) => {
        if (!alive) return;
        if (d.outbreaks.length === 0) setState("off");
        else {
          setData(d);
          setState("ok");
        }
      })
      .catch(() => alive && setState("off"));
    return () => {
      alive = false;
    };
  }, [limit]);

  if (state !== "ok" || !data) return null;

  return (
    <section className="mb-8 rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <h2 className="font-bold text-emerald-800 dark:text-emerald-200">
          Сводка вспышек — live
        </h2>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold uppercase tracking-wide">
          live
        </span>
        <div className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
          {data.totalInDataset} записей · обновлено {data.updated}
          <span className="hidden sm:inline"> · via vet-api (CF Workers)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {data.outbreaks.map((o) => (
          <div
            key={o.id}
            className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 text-xs"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-semibold text-rose-600 dark:text-rose-400 truncate">
                {o.disease}
              </span>
              <span
                className={`ml-auto shrink-0 text-[9px] px-1 py-0.5 rounded uppercase font-bold ${
                  o.status?.toLowerCase() === "ongoing"
                    ? "bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                }`}
              >
                {o.status || "—"}
              </span>
            </div>
            <div className="text-zinc-600 dark:text-zinc-300 truncate" title={o.region}>
              {o.region_geo || o.region}
            </div>
            <div className="flex gap-2 mt-1 text-zinc-400">
              <span>{o.last_seen ?? o.date}</span>
              {o.cases > 0 && <span>· {o.cases} гол.</span>}
              {o.species && <span className="truncate">· {o.species}</span>}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-2 text-[10px] text-zinc-400">
        Источник: зеркала FAO/WOAH/ФСВПС, агрегатор vet-heatmap → CF KV. Отображается
        автоматически только когда vet-api доступен из вашей сети.
      </p>
    </section>
  );
}
