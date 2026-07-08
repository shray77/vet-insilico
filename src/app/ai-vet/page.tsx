"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import HubHeader from "@/components/HubHeader";
import { chatComplete, getHfToken } from "@/lib/hf";
import { extractJson, validateDiagnosisResult } from "@/lib/json-utils";

interface DiagnosisResult {
  differentialDiagnoses: { name: string; probability: number; reasoning: string }[];
  recommendedTests: string[];
  urgency: "low" | "moderate" | "high" | "critical";
  recommendation: string;
}

export default function AIVetPage() {
  const [species, setSpecies] = useState("Свинья");
  const [age, setAge] = useState("3 месяца");
  const [symptoms, setSymptoms] = useState("лихорадка 41°C, отказ от корма, цианоз кожи ушей, слабость задних конечностей");
  const [history, setHistory] = useState("В хозяйстве 500 свиней, за неделю пало 12. Не вакцинированы.");
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const runDiagnosis = async () => {
    if (!getHfToken()) {
      setError("Задайте HF token — кнопка 🤖 в шапке");
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const prompt = `Ты — ветеринарный диагност. На основе симптомов составь дифференциальный диагноз.

ВИД: ${species}
ВОЗРАСТ: ${age}
СИМПТОМЫ: ${symptoms}
АНАМНЕЗ: ${history}

Отвечай ТОЛЬКО как JSON (на русском языке):
{
  "differentialDiagnoses": [
    {"name": "название болезни", "probability": 0-100, "reasoning": "краткое обоснование"}
  ],
  "recommendedTests": ["тест 1", "тест 2", ...],
  "urgency": "<low|moderate|high|critical>",
  "recommendation": "одна короткая рекомендация"
}

Учитывай эпизоотологию РФ. Минимум 3 дифференциальных диагноза, отсортированных по вероятности.`;

      const raw = await chatComplete(
        [
          { role: "system", content: "Ты — ветеринарный диагност с опытом 20 лет. ОТВЕЧАЙ НА РУССКОМ. Respond ONLY with valid JSON, no markdown." },
          { role: "user", content: prompt },
        ],
        { maxTokens: 600, temperature: 0.3, signal: ctrl.signal },
      );

      const jsonStr = extractJson(raw);
      if (!jsonStr) throw new Error("LLM не вернул JSON");
      const parsed = JSON.parse(jsonStr);
      const validated = validateDiagnosisResult(parsed);
      if (!validated) throw new Error("LLM вернул некорректный формат ответа");
      setResult(validated);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const cancelDiagnosis = () => {
    abortRef.current?.abort();
    setLoading(false);
    abortRef.current = null;
  };

  const urgencyColor = (u: string) => u === "critical" ? "#dc2626" : u === "high" ? "#ea580c" : u === "moderate" ? "#eab308" : "#16a34a";
  const urgencyLabel = (u: string) => u === "critical" ? "Критическая" : u === "high" ? "Высокая" : u === "moderate" ? "Умеренная" : "Низкая";

  return (
    <div className="min-h-screen">
      <HubHeader />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-teal-500">Хаб</Link>
          <span className="mx-1">/</span>
          <span>AI Veterinarian</span>
        </div>
        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-4 mb-6">
          <h2 className="font-semibold text-rose-900 dark:text-rose-100 mb-1">🩺 AI Veterinarian — Diagnostic Assistant</h2>
          <p className="text-sm text-rose-800 dark:text-rose-200">
            Дифференциальный диагноз на основе симптомов. LLM (Qwen-Coder-3B) анализирует ввод и предлагает
            вероятные диагнозы, рекомендуемые тесты, уровень срочности. 🤖 требует ИИ.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Параметры пациента</h3>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-zinc-500">Вид животного</span>
                <select value={species} onChange={(e) => setSpecies(e.target.value)}
                  className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm">
                  <option>Свинья</option><option>КРС</option><option>Птица</option><option>Собака</option>
                  <option>Кошка</option><option>Лошадь</option><option>Овца</option><option>Коза</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500">Возраст</span>
                <input type="text" value={age} onChange={(e) => setAge(e.target.value)}
                  className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500">Симптомы</span>
                <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={4}
                  className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500">Анамнез (история хозяйства)</span>
                <textarea value={history} onChange={(e) => setHistory(e.target.value)} rows={3}
                  className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm" />
              </label>
              <div className="flex gap-2">
                <button onClick={runDiagnosis} disabled={loading}
                  className="flex-1 px-4 py-3 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 disabled:opacity-50 transition">
                  {loading ? "⏳ Анализ..." : "🩺 Запустить диагностику"}
                </button>
                {loading && (
                  <button onClick={cancelDiagnosis}
                    className="px-4 py-3 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition">
                    ✕ Отменить
                  </button>
                )}
              </div>
              {error && <div className="text-xs text-red-500 p-2 rounded bg-red-50 dark:bg-red-950/30">{error}</div>}
            </div>
          </div>
          <div>
            {loading && (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-400">
                ⏳ LLM анализирует симптомы...
              </div>
            )}
            {!loading && !result && !error && (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-400">
                Заполните параметры пациента и нажмите «Запустить диагностику»
              </div>
            )}
            {result && (
              <div className="space-y-4">
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-zinc-500">Срочность</span>
                    <span className="text-sm font-bold px-3 py-1 rounded-full text-white" style={{ backgroundColor: urgencyColor(result.urgency) }}>
                      {urgencyLabel(result.urgency)}
                    </span>
                  </div>
                  <div className="text-sm text-zinc-700 dark:text-zinc-300 italic">{result.recommendation}</div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-2">Дифференциальные диагнозы</h3>
                  <div className="space-y-2">
                    {result.differentialDiagnoses?.map((d, i) => (
                      <div key={i} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-900">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm">{i + 1}. {d.name}</span>
                          <span className="text-sm font-bold px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: d.probability >= 70 ? "#16a34a" : d.probability >= 40 ? "#eab308" : "#dc2626" }}>
                            {d.probability}%
                          </span>
                        </div>
                        <div className="text-xs text-zinc-600 dark:text-zinc-400">{d.reasoning}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {result.recommendedTests && result.recommendedTests.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-2">Рекомендуемые тесты</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {result.recommendedTests.map((t, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300">{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-200">
                  ⚠️ Это образовательный инструмент, не замена ветеринарной консультации.
                  Обратитесь к ветврачу для подтверждения диагноза и назначения лечения.
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
