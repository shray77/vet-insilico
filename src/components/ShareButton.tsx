"use client";

/**
 * ShareButton — универсальная кнопка «Поделиться сценарием».
 *
 * Логика: облако (#s=<id>, 90 дней) → фолбэк автономный (#j=<b64> в URL).
 * Если облако недоступно (РФ) и payload слишком большой для URL — честная ошибка.
 * Цвет тонируется под акцент страницы (tone).
 */

import { useState } from "react";
import { cloudShare } from "@/lib/cloud";
import {
  buildCloudShareUrl,
  buildAutonomousShareUrl,
  encodeAutonomousPayload,
  AUTONOMOUS_LIMIT,
  type Scenario,
} from "@/lib/share";

type Tone = "rose" | "cyan" | "indigo" | "amber" | "emerald";

const BTN: Record<Tone, string> = {
  rose: "bg-rose-600 hover:bg-rose-700",
  cyan: "bg-cyan-600 hover:bg-cyan-700",
  indigo: "bg-indigo-600 hover:bg-indigo-700",
  amber: "bg-amber-600 hover:bg-amber-700",
  emerald: "bg-emerald-600 hover:bg-emerald-700",
};

const INFO: Record<Tone, string> = {
  rose: "text-rose-700 dark:text-rose-300",
  cyan: "text-cyan-700 dark:text-cyan-300",
  indigo: "text-indigo-700 dark:text-indigo-300",
  amber: "text-amber-700 dark:text-amber-300",
  emerald: "text-emerald-700 dark:text-emerald-300",
};

export default function ShareButton({
  build,
  title,
  tone = "rose",
  label = "🔗 Поделиться сценарием",
}: {
  build: () => Scenario | null;
  title: string;
  tone?: Tone;
  label?: string;
}) {
  const [info, setInfo] = useState("");

  const handleShare = async () => {
    const sc = build();
    if (!sc) {
      setInfo("Нечего шарить: введите последовательность/параметры");
      return;
    }
    let url = "";
    let mode = "";
    try {
      const { id } = await cloudShare(sc.app, sc, title);
      url = buildCloudShareUrl(id);
      mode = "облачный (90 дней)";
    } catch {
      if (encodeAutonomousPayload(sc).length > AUTONOMOUS_LIMIT) {
        setInfo("Облако недоступно, а сценарий слишком большой для автономной ссылки — сократите данные");
        return;
      }
      url = buildAutonomousShareUrl(sc);
      mode = "автономный — сценарий зашит в URL";
    }
    try {
      await navigator.clipboard.writeText(url);
      setInfo(`🔗 Ссылка скопирована (${mode})`);
    } catch {
      setInfo(`🔗 ${url} (${mode})`);
    }
    setTimeout(() => setInfo(""), 8000);
  };

  return (
    <div className="flex flex-col items-stretch gap-1">
      <button
        onClick={handleShare}
        className={`px-3 py-1.5 rounded-lg ${BTN[tone]} text-white text-xs font-medium transition whitespace-nowrap`}
      >
        {label}
      </button>
      {info && (
        <span className={`text-[10px] ${INFO[tone]} max-w-[240px] break-all`}>{info}</span>
      )}
    </div>
  );
}
