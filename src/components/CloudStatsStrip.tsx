"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchCloudStats, type CloudStats } from "@/lib/cloud";

/**
 * CloudStatsStrip — живые цифры облака (полу-динамика):
 * AI-расчёты сегодня (эдж + кеш), облачные ссылки-сценарии, канал AI.
 *
 * Данные: GET /v1/insilico/stats (агрегаты за 7 дней, без IP).
 * Если воркер недоступен (в т.ч. РКН-блокировка workers.dev в РФ) —
 * полоска просто не рендерится: страница остаётся статичной.
 */
export default function CloudStatsStrip() {
  const [stats, setStats] = useState<CloudStats | null>(null);

  useEffect(() => {
    let alive = true;
    fetchCloudStats(5000)
      .then((d) => {
        if (alive && d.ok) setStats(d);
      })
      .catch(() => {}); // облако недоступно — strip скрыт
    return () => {
      alive = false;
    };
  }, []);

  if (!stats) return null;

  const { aiChat, aiChatHits, shares } = stats.today;
  const backend = stats.aiBackend === "workers-ai" ? "Workers AI · эдж" : stats.aiBackend === "hf" ? "HF router" : "off";

  return (
    <section className="mb-8 rounded-2xl border border-teal-200 dark:border-teal-900 bg-teal-50 dark:bg-teal-950/20 p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-60"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-600"></span>
        </span>
        <h2 className="font-bold text-teal-800 dark:text-teal-200">Облако сегодня</h2>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-700 dark:bg-teal-800 text-white font-bold uppercase tracking-wide">
          {backend}
        </span>
        <div className="text-xs text-zinc-600 dark:text-zinc-300 flex gap-3 flex-wrap">
          <span>
            <b className="text-teal-700 dark:text-teal-300">{aiChat}</b> AI-расчётов
            {aiChatHits > 0 && <span className="text-zinc-400"> (+{aiChatHits} из кеша)</span>}
          </span>
          <span>
            <b className="text-teal-700 dark:text-teal-300">{shares}</b> ссылок-сценариев
          </span>
          <span className="text-zinc-400 hidden sm:inline">считается на CF Workers ·vet-api</span>
          <Link href="/stats" className="text-teal-700 dark:text-teal-300 hover:underline font-medium whitespace-nowrap">
            вся статистика →
          </Link>
        </div>
      </div>
    </section>
  );
}
