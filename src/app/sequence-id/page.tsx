"use client";

import { useState, useRef } from "react";
import { ToolPageLayout, LoadingPanel, ErrorAlert, CopyButton } from "@/components/ui";
import { SequenceSearch } from "@/components/SequenceSearch";
import { blastSequence, type BlastResult } from "@/lib/blast";
import { Search, ExternalLink, ArrowRight, Dna, Clock, X } from "lucide-react";
import Link from "next/link";

export default function SequenceIDPage() {
  const [sequence, setSequence] = useState("");
  const [program, setProgram] = useState<"blastp" | "blastn">("blastp");
  const [database, setDatabase] = useState("nr");
  const [result, setResult] = useState<BlastResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const runBlast = async () => {
    if (!sequence || sequence.length < 10) {
      setError("Минимум 10 символов");
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError("");
    setResult(null);
    setStatus("Отправка запроса в NCBI BLAST...");
    setElapsed(0);

    try {
      const res = await blastSequence(sequence, {
        program,
        database,
        signal: ctrl.signal,
        onProgress: (msg, ms) => {
          setStatus(msg);
          setElapsed(ms);
        },
      });
      setResult(res);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    setLoading(false);
    setStatus("");
    abortRef.current = null;
  };

  const identityColor = (pct: number) => pct >= 95 ? "#16a34a" : pct >= 80 ? "#eab308" : pct >= 50 ? "#ea580c" : "#dc2626";

  return (
    <ToolPageLayout
      name="Sequence ID"
      icon="🔍"
      color="cyan"
      description="Идентификация последовательности через NCBI BLAST. Вставьте белок или ДНК — получите топ-совпадений + рекомендацию инструмента VetInSilico."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input */}
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Входные данные</h3>

          <SequenceSearch compact onSelect={(seq) => setSequence(seq)} />

          <label className="block mt-3 mb-3">
            <span className="text-xs text-zinc-500">Последовательность (белок или ДНК)</span>
            <textarea
              value={sequence}
              onChange={(e) => setSequence(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-mono"
              placeholder="MKWVTFISLLFLFSSAYSRGVFRRDTHKSEIAHRFKDLG..."
            />
          </label>

          <div className="text-xs text-zinc-400 mb-3">{sequence.replace(/[^A-Za-z]/g, "").length} символов</div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <label className="block">
              <span className="text-xs text-zinc-500">Программа</span>
              <select value={program} onChange={(e) => setProgram(e.target.value as "blastp" | "blastn")}
                className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm">
                <option value="blastp">blastp (белок)</option>
                <option value="blastn">blastn (ДНК)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-zinc-500">База данных</span>
              <select value={database} onChange={(e) => setDatabase(e.target.value)}
                className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm">
                <option value="nr">nr (все)</option>
                <option value="refseq_protein">RefSeq</option>
                <option value="swissprot">Swiss-Prot</option>
              </select>
            </label>
          </div>

          <div className="flex gap-2">
            <button onClick={runBlast} disabled={loading || sequence.length < 10}
              className="flex-1 px-4 py-2.5 rounded-lg bg-cyan-600 text-white font-medium hover:bg-cyan-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
              {loading ? <><Clock className="h-4 w-4 animate-spin" /> BLAST...</> : <><Search className="h-4 w-4" /> Запустить BLAST</>}
            </button>
            {loading && (
              <button onClick={cancel}
                className="px-3 py-2.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {loading && (
            <div className="mt-3 text-xs text-zinc-400 flex items-center gap-2">
              <Clock className="h-3 w-3 animate-spin" />
              {status} ({Math.round(elapsed / 1000)}s)
            </div>
          )}

          {error && <div className="mt-3"><ErrorAlert message={error} /></div>}

          <div className="mt-4 text-[10px] text-zinc-400 bg-zinc-50 dark:bg-zinc-900 rounded p-2">
            💡 BLAST ищет по базе NCBI GenBank (миллионы последовательностей).
            Запрос идёт напрямую с вашего браузера на серверы NCBI.
            Время выполнения: 10-60 секунд.
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          {!result && !loading && !error && (
            <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center text-zinc-400">
              <Dna className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <div className="text-sm">Введите последовательность для идентификации</div>
              <div className="text-xs mt-1">BLAST найдёт closest matches в NCBI GenBank</div>
            </div>
          )}

          {loading && <LoadingPanel message={status} />}

          {result && (
            <div className="space-y-4">
              {/* Suggestion banner */}
              <Link href={result.suggestion.href}
                className="block rounded-xl border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/30 p-4 hover:bg-cyan-100 dark:hover:bg-cyan-950/50 transition-colors group">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold mb-1">
                      💡 Рекомендуемый инструмент
                    </div>
                    <div className="text-sm font-bold text-cyan-900 dark:text-cyan-100">
                      {result.suggestion.tool}
                    </div>
                    <div className="text-xs text-cyan-700 dark:text-cyan-300 mt-1">
                      {result.suggestion.reason}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-cyan-400 group-hover:translate-x-1 transition-transform shrink-0" />
                </div>
              </Link>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 text-center">
                  <div className="text-xl font-bold">{result.queryLength}</div>
                  <div className="text-[10px] text-zinc-400">символов</div>
                </div>
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 text-center">
                  <div className="text-xl font-bold">{result.hits.length}</div>
                  <div className="text-[10px] text-zinc-400">совпадений</div>
                </div>
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 text-center">
                  <div className="text-xl font-bold">{result.database}</div>
                  <div className="text-[10px] text-zinc-400">база</div>
                </div>
              </div>

              {/* Hits table */}
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-500">
                  Топ-{result.hits.length} совпадений BLAST
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                      <th className="text-left py-2 px-2">#</th>
                      <th className="text-left py-2 px-2">Описание</th>
                      <th className="text-center py-2 px-2">Identity</th>
                      <th className="text-center py-2 px-2">Coverage</th>
                      <th className="text-center py-2 px-2">E-value</th>
                      <th className="text-center py-2 px-2">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.hits.map((hit, i) => (
                      <tr key={i} className="border-b border-zinc-100 dark:border-zinc-900 hover:bg-accent/30">
                        <td className="py-2 px-2 text-zinc-400">{i + 1}</td>
                        <td className="py-2 px-2">
                          <div className="font-medium truncate max-w-[200px]" title={hit.title}>
                            {hit.title}
                          </div>
                          <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                            <span className="font-mono">{hit.accession}</span>
                            <span>· {hit.organism}</span>
                            <a href={hit.url} target="_blank" rel="noopener" className="text-cyan-500 hover:text-cyan-700">
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className="font-bold tabular-nums" style={{ color: identityColor(hit.identity) }}>
                            {hit.identity.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center tabular-nums text-zinc-500">{hit.coverage.toFixed(0)}%</td>
                        <td className="py-2 px-2 text-center tabular-nums text-zinc-500">
                          {hit.evalue < 1e-100 ? "<1e-100" : hit.evalue.toExponential(1)}
                        </td>
                        <td className="py-2 px-2 text-center tabular-nums text-zinc-500">{hit.bitScore.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Copy top hit */}
              {result.hits[0] && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span>Топ-совпадение:</span>
                  <code className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">{result.hits[0].accession}</code>
                  <CopyButton text={result.hits[0].accession} label="" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ToolPageLayout>
  );
}
