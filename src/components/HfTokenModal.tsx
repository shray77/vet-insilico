"use client";

import { useState, useEffect } from "react";
import { getHfToken, setHfToken, validateHfToken } from "@/lib/hf";

export default function HfTokenModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "validating" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setToken(getHfToken());
      setStatus("idle");
      setErrorMsg("");
      setSaved(false);
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
            <h3 className="text-lg font-bold">🤖 ML-настройки</h3>
            <p className="text-xs text-zinc-400 mt-1">HuggingFace Inference API token</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-xl">✕</button>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-800 dark:text-blue-200">
            <div className="font-semibold mb-1">Зачем нужен токен?</div>
            <div>
              Для глубокого ML-анализа: Qwen2.5-Coder-3B-Instruct (LLM) и ESM-2 (protein language model).
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
