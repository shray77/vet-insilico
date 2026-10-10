"use client";

import { useEffect, useState } from "react";
import { fetchLiveOutbreaks, type LiveOutbreaksResult } from "@/lib/cloud";

/**
 * Live-панель вспышек — полу-динамика на статическом сайте.
 *
 * Источники по цепочке (первый живой выигрывает):
 *   1. vet-api (KV-зеркало, обновляется Actions-мостом vet-heatmap каждые 6 ч) — бейдж «live»;
 *   2. статический снимок /data/outbreaks-snapshot.json (крон snapshot-data.yml,
 *      тот же сайт — работает в РФ без VPN, где workers.dev заблокирован) — бейдж «снимок 6 ч».
 *   Если недоступно всё — панель не рендерится: страница остаётся статичной.
 */

/** basePath повторяет next.config.ts (статический экспорт в /vet-insilico). */
const BASE_PATH = process.env.NODE_ENV === "production" ? "/vet-insilico" : "";

async function fetchSnapshot(limit: number): Promise<LiveOutbreaksResult | null> {
  try {
    const res = await fetch(`${BASE_PATH}/data/outbreaks-snapshot.json`);
    if (!res.ok) return null;
    const d = (await res.json()) as LiveOutbreaksResult | null;
    if (!d?.ok || !Array.isArray(d.outbreaks) || d.outbreaks.length === 0) return null;
    return { ...d, outbreaks: d.outbreaks.slice(0, limit) };
  } catch {
    return null;
  }
}

export default function LiveOutbreaks({ limit = 8 }: { limit?: number }) {
  const [data, setData] = useState<LiveOutbreaksResult | null>(null);
  const [state, setState] = useState<"loading" | "live" | "snapshot" | "off">("loading");

  useEffect(() => {
    let alive = true;
    fetchLiveOutbreaks({ limit }, 5000)
      .then((d) => {
        if (!alive) return;
        if (d.outbreaks.length === 0) throw new Error("пусто");
        setData(d);
        setState("live");
      })
      .catch(async () => {
        // облако недоступно (в т.ч. РКН в РФ) → статический снимок того же сайта
        const snap = await fetchSnapshot(limit);
        if (!alive) return;
        if (snap) {
          setData(snap);
          setState("snapshot");
        } else {
          setState("off");
        }
      });
    return () => {
      alive = false;
    };
  }, [limit]);

  if (state === "off" || state === "loading" || !data) return null;

  return (
    <section className="mb-8 rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${state === "live" ? "bg-emerald-400" : "bg-amber-400"}`}></span>
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${state === "live" ? "bg-emerald-500" : "bg-amber-500"}`}></span>
        </span>
        <h2 className="font-bold text-emerald-800 dark:text-emerald-200">
          Сводка вспышек — {state === "live" ? "live" : "снимок"}
        </h2>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded text-white font-bold uppercase tracking-wide ${
            state === "live" ? "bg-emerald-600" : "bg-amber-600"
          }`}
        >
          {state === "live" ? "live" : "снимок 6 ч"}
        </span>
        <div className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
          {data.totalInDataset} записей · обновлено {data.updated}
          <span className="hidden sm:inline">
            {state === "live" ? " · via vet-api (CF Workers)" : " · офлайн-копия с этого же сайта"}
          </span>
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
        Источник: зеркала FAO/WOAH/ФСВПС, агрегатор vet-heatmap → CF KV.
        {state === "live"
          ? " Отображается автоматически, когда vet-api доступен из вашей сети."
          : " Показан офлайн-снимок: vet-api недоступен из вашей сети (в РФ workers.dev блокируется провайдером)."}
      </p>
    </section>
  );
}
