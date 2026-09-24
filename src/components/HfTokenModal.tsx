"use client";

import { useState, useEffect } from "react";
import { getHfToken, setHfToken, validateHfToken, getAiRoute, setAiRoute, type AiRoute } from "@/lib/hf";
import { probeCloud, type CloudStatus } from "@/lib/cloud";

export default function HfTokenModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "validating" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [saved, setSaved] = useState(false);
  const [cloud, setCloud] = useState<CloudStatus | null>(null);
  const [route, setRoute] = useState<AiRoute>("auto");

  useEffect(() => {
    if (open) {
      setToken(getHfToken());
      setStatus("idle");
      setErrorMsg("");
      setSaved(false);
      setRoute(getAiRoute());
      probeCloud().then(setCloud);
    }
  }, [open]);

  const handleValidate = async () => {
    setStatus("validating");
    setErrorMsg("");
    const result = await validateHfToken(token.trim());
    if (result.ok) {
      setStatus("ok");
      setHfToken(token.trim());
      setSaved(true);
    } else {
      setStatus("error");
      setErrorMsg(result.error || "Ошибка");
    }
  };

  const handleSave = () => {
    setHfToken(token.trim());
    setSaved(true);
    onClose();
  };

  const handleClear = () => {
    setHfToken("");
    setToken("");
    setSaved(false);
    setStatus("idle");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">⚙️ Настройки вычислений</h3>
            <p className="text-xs text-zinc-400 mt-1">Облачный AI · Workers AI (эдж) + HF token</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-xl">✕</button>
        </div>

        <div className="space-y-3">
          {/* ─── Облако (vet-api) ─── */}
          <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 p-3 text-xs">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  !cloud ? "bg-zinc-400 animate-pulse" : cloud.reachable ? "bg-green-500" : "bg-zinc-400"
                }`}
              ></span>
              <span className="font-semibold">
                Облако vet-api {cloud ? (cloud.reachable ? "— доступно" : "— недоступно") : "— проверка..."}
              </span>
              {cloud?.reachable && cloud.aiBackend === "workers-ai" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-medium">
                  Workers AI · эдж
                </span>
              )}
              {cloud?.reachable && cloud.ms > 0 && <span className="ml-auto text-zinc-400">{cloud.ms} ms</span>}
            </div>
            <div className="text-zinc-500 dark:text-zinc-400">
              {cloud?.reachable
                ? cloud.ai
                  ? cloud.aiBackend === "workers-ai"
                    ? "LLM работает на эдже (Workers AI, llama-3.3-70b) без всяких токенов. ESM-2 на эдже нет — свой HF-токен или локальные эвристики."
                    : "AI через облако работает без токена — LLM-анализ и ESM-2 доступны сразу."
                  : "Данные доступны (вспышки, шаринг). AI-прокси пока не включён админом."
                : "workers.dev недоступен из вашей сети (РФ-блокировка или оффлайн) — всё считается локально, ML только через свой токен."}
            </div>
            <div className="flex gap-1 mt-2">
              {(["auto", "cloud", "token"] as AiRoute[]).map((r) => (
                <button
                  key={r}
                  onClick={() => { setRoute(r); setAiRoute(r); }}
                  className={`flex-1 px-2 py-1 rounded text-[11px] transition ${
                    route === r
                      ? "bg-teal-600 text-white"
                      : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-teal-400 text-zinc-600 dark:text-zinc-300"
                  }`}
                >
                  {r === "auto" ? "Авто" : r === "cloud" ? "Только облако" : "Свой токен"}
                </button>
              ))}
            </div>
            <div className="mt-1 text-[10px] text-zinc-400">
              Авто = облако → фолбэк на свой токен. Маршрут действует для LLM и ESM-2.
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-800 dark:text-blue-200">
            <div className="font-semibold mb-1">Зачем свой токен?</div>
            <div>
              ESM-2 (protein LM) — всегда через HuggingFace (на эдже её нет). Плюс это fallback для LLM, если облако недоступно: Qwen2.5-Coder-3B-Instruct напрямую через HuggingFace.
              Токен хранится только в localStorage вашего браузера, никуда не отправляется кроме HuggingFace.
            </div>
            <a
              href="https://huggingface.co/settings/tokens"
              target="_blank"
              rel="noopener"
              className="inline-block mt-2 text-blue-600 dark:text-blue-400 hover:underline"
            >
              Получить бесплатный токен ↗
            </a>
          </div>

          <label className="block">
            <span className="text-xs text-zinc-500">HF Token</span>
            <input
              type="password"
              value={token}
              onChange={(e) => { setToken(e.target.value); setStatus("idle"); setSaved(false); }}
              placeholder="hf_xxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm font-mono"
              autoComplete="off"
            />
          </label>

          {status === "ok" && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-2 text-xs text-green-700 dark:text-green-300">
              ✅ Токен валиден
            </div>
          )}
          {status === "error" && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-2 text-xs text-red-700 dark:text-red-300">
              ❌ {errorMsg}
            </div>
          )}
          {saved && status !== "ok" && status !== "error" && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-2 text-xs text-green-700 dark:text-green-300">
              ✅ Сохранено
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleValidate}
              disabled={!token.trim() || status === "validating"}
              className="flex-1 px-3 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-sm font-medium disabled:opacity-50 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition"
            >
              {status === "validating" ? "⏳ Проверка..." : "Проверить"}
            </button>
            <button
              onClick={handleSave}
              disabled={!token.trim()}
              className="flex-1 px-3 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-teal-700 transition"
            >
              Сохранить
            </button>
          </div>
          {getHfToken() && (
            <button
              onClick={handleClear}
              className="w-full text-xs text-zinc-400 hover:text-red-500"
            >
              Удалить токен из localStorage
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
