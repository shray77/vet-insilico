"use client";

/**
 * /stats — человеческий дашборд облака VetInSilico.
 *
 * Зачем: дашборд Cloudflare перегружен и не всегда доступен с телефона,
 * а тут — 4 цифры «сегодня», неделя по дням и живой статус vet-api
 * (доступность, вспышки в зеркале, канал AI). Данные: публичный
 * GET /v1/insilico/stats + /v1/insilico/status. Без IP, без авторизации.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import HubHeader from "@/components/HubHeader";
import {
  fetchCloudStats,
  probeCloud,
  cloudUrl,
  type CloudStats,
  type CloudStatus,
} from "@/lib/cloud";

const METRICS = [
  { key: "aiChat", label: "AI-расчёты (LLM)", color: "#6366f1" },
  { key: "aiChatHits", label: "Попадания в кеш", color: "#8b5cf6" },
  { key: "aiEsm", label: "ESM-2", color: "#0ea5e9" },
  { key: "shares", label: "Ссылки-сценарии", color: "#14b8a6" },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

const BACKEND_LABEL: Record<string, { text: string; cls: string }> = {
  "workers-ai": { text: "Workers AI · эдж", cls: "bg-indigo-600" },
  hf: { text: "HF router", cls: "bg-amber-600" },
  off: { text: "off", cls: "bg-zinc-500" },
};

function fmtDay(d: string): string {
  // "2026-09-29" → "29.09"
  const [, m, day] = d.split("-");
  return `${day}.${m}`;
}

export default function StatsPage() {
  const [stats, setStats] = useState<CloudStats | null>(null);
  const [status, setStatus] = useState<CloudStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [s, st] = await Promise.all([
      fetchCloudStats(6000).catch(() => null),
      probeCloud(true).catch(() => null),
    ]);
    setStats(s && s.ok ? s : null);
    setStatus(st);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const backend = BACKEND_LABEL[stats?.aiBackend ?? "off"] ?? BACKEND_LABEL.off;
  const week = stats?.week ?? [];
  const days = week.map((w) => w.date);

  // Максимум по каждой метрике отдельно (для честной высоты столбиков)
  const maxOf = (key: MetricKey) => Math.max(1, ...week.map((w) => Number(w[key] ?? 0)));

  return (
    <div className="min-h-screen">
      <HubHeader />

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-teal-500">Хаб</Link>
          <span className="mx-1">/</span>
          <span>Статистика облака</span>
        </div>

        <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 p-4 mb-6 flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <h1 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-1">
              📊 Облако VetInSilico — статистика использования
            </h1>
            <p className="text-sm text-indigo-800 dark:text-indigo-200">
              Живые цифры воркера <code className="text-xs">vet-api</code>: AI-расчёты, кеш, облачные ссылки.
              Агрегаты за 7 дней, без IP и без персональных данных.
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium transition"
          >
            {loading ? "Обновляю…" : "⟳ Обновить"}
          </button>
        </div>

        {/* ─── Статус воркера ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-900">
            <div className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1">vet-api</div>
            {status?.reachable ? (
              <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                ● доступен <span className="text-zinc-400 font-normal">({status.ms} мс)</span>
              </div>
            ) : (
              <div className="text-sm font-semibold text-red-500">● недоступен</div>
            )}
            <p className="text-[10px] text-zinc-400 mt-1">
              {status?.reachable
                ? "воркер отвечает на /status"
                : "возможно, workers.dev заблокирован провайдером (РФ) — попробуйте VPN"}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-900">
            <div className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1">Канал AI</div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${backend.cls} text-white font-bold uppercase tracking-wide`}>
              {backend.text}
            </span>
            <p className="text-[10px] text-zinc-400 mt-1.5">
              {stats?.aiBackend === "workers-ai"
                ? "llama-3.3-70b на эдже, без токенов"
                : stats?.aiBackend === "hf"
                  ? "через HuggingFace router"
                  : "облачный AI отключён"}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-900">
            <div className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1">Вспышек в зеркале</div>
            <div className="text-lg font-bold text-zinc-800 dark:text-zinc-100">
              {status?.outbreaks ?? "—"}
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">
              {status?.outbreaksUpdated ? `обновлено ${status.outbreaksUpdated}` : "зеркало не засеяно"}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-900">
            <div className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1">Сегодня расчётов</div>
            <div className="text-lg font-bold text-zinc-800 dark:text-zinc-100">
              {stats ? Number(stats.today.aiChat) + Number(stats.today.aiChatHits) : "—"}
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">
              {stats ? `${stats.today.aiChat} новых + ${stats.today.aiChatHits} из кеша` : "нет данных"}
            </p>
          </div>
        </div>

        {/* ─── Неделя по дням ─── */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900 mb-6">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
            Использование за 7 дней
          </h2>
          {stats ? (
            <div className="space-y-4 overflow-x-auto thin-scroll">
              {METRICS.map((m) => {
                const max = maxOf(m.key);
                return (
                  <div key={m.key} className="min-w-[420px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{m.label}</span>
                      <span className="text-xs text-zinc-400">
                        всего за неделю: <b className="text-zinc-600 dark:text-zinc-300">{week.reduce((a, w) => a + Number(w[m.key] ?? 0), 0)}</b>
                      </span>
                    </div>
                    <div className="flex items-end gap-2" style={{ height: 56 }}>
                      {week.map((w) => {
                        const v = Number(w[m.key] ?? 0);
                        const h = Math.round((v / max) * 44) + (v > 0 ? 4 : 1);
                        return (
                          <div key={w.date} className="flex-1 flex flex-col items-center justify-end" title={`${fmtDay(w.date)}: ${v}`}>
                            <span className="text-[9px] text-zinc-400 mb-0.5">{v > 0 ? v : ""}</span>
                            <div
                              className="w-full max-w-[44px] rounded-t"
                              style={{ height: h, backgroundColor: v > 0 ? m.color : "#e4e4e7" }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 mt-1">
                      {days.map((d) => (
                        <div key={d} className="flex-1 text-center text-[9px] text-zinc-400">{fmtDay(d)}</div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">
              Статистика недоступна: воркер не отвечает (в РФ workers.dev часто заблокирован — откройте через VPN).
            </p>
          )}
        </div>

        {/* ─── Как это считается ─── */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-xs text-zinc-500 dark:text-zinc-400">
          <b className="text-zinc-700 dark:text-zinc-200">Как это считается</b><br />
          • Счётчики — в KV воркера, ключ вида <code>stats:&lt;тип&gt;:&lt;дата&gt;</code>, TTL 7 дней. Без IP, cookies и авторизации.<br />
          • AI-лимит: <b>40 расчётов/день на IP</b> (chat и ESM раздельно). Повтор того же запроса идёт из кеша (24 ч) и не сжигает лимит upstream.<br />
          • Ссылки-сценарии: до <b>10/день на IP</b>, живут <b>90 дней</b>.<br />
          • Канал 1 — Workers AI (llama-3.3-70b, эдж, бесплатно, без токенов). Канал 2 — HF router (нужен секрет HF_TOKEN на воркере).<br />
          • ESM-2 в режиме «Авто» работает и без облака — целиком в браузере (transformers.js, int8-веса ~34 МБ с huggingface.co, дальше из кеша); такие расчёты в счётчиках воркера не учитываются.<br />
          • Канал 3 (резервный) — публичный безключевой LLM (pollinations): включается автоматически, если vet-api недоступен из вашей сети (например, РКН-блокировка workers.dev в РФ). Best-effort: без гарантий качества и доступности.<br />
          • Живые вспышки имеют офлайн-фолбэк: статический снимок на этом же сайте (обновляется кроном каждые 6 ч) — работает в РФ без VPN.<br />
          • Сырые данные: <a href={`${cloudUrl()}/v1/insilico/stats`} target="_blank" rel="noopener" className="text-blue-500 hover:underline">{cloudUrl()}/v1/insilico/stats</a> (JSON). Из РФ может не открыться без VPN.
        </div>
      </main>
    </div>
  );
}
