"use client";

import { useState, useRef } from "react";
import { Search, Loader2, Database, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { searchAllDatabases, fetchNCBISequence, fetchUniProt, type SequenceResult } from "@/lib/sequence-search";

interface SequenceSearchProps {
  /** Called when user selects a sequence from search results. */
  onSelect: (sequence: string, meta: SequenceResult) => void;
  /** Compact mode (smaller UI for embedding in tool pages). */
  compact?: boolean;
}

/**
 * Sequence search component — searches NCBI, UniProt, and PDB.
 *
 * Embeddable in any tool page that accepts a protein/nucleotide sequence.
 * Previously users had to manually find + copy sequences from external
 * databases. Now they search directly in the tool.
 *
 * Usage:
 *   <SequenceSearch onSelect={(seq, meta) => setSequence(seq)} />
 */
export function SequenceSearch({ onSelect, compact = false }: SequenceSearchProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SequenceResult[]>([]);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSearch = async () => {
    if (!query.trim() || query.trim().length < 3) return;
    setLoading(true);
    setError("");
    setResults([]);
    setExpanded(true);

    try {
      const hits = await searchAllDatabases(query.trim(), 5);
      if (hits.length === 0) {
        setError("Ничего не найдено. Попробуйте изменить запрос.");
      }
      setResults(hits);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка поиска");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (result: SequenceResult) => {
    // If sequence is already fetched (UniProt), use it directly
    if (result.sequence) {
      onSelect(result.sequence, result);
      setExpanded(false);
      return;
    }

    // Otherwise fetch the sequence
    setFetchingId(result.id);
    setError("");
    try {
      let seq = "";
      if (result.source === "NCBI") {
        seq = await fetchNCBISequence(result.id);
      } else if (result.source === "UniProt") {
        const full = await fetchUniProt(result.id);
        seq = full.sequence;
      } else {
        // PDB — user can look it up in the PDB viewer tool
        setError(`PDB структура ${result.id} — используйте PDB Viewer инструмент`);
        return;
      }
      if (seq) {
        onSelect(seq, { ...result, sequence: seq });
        setExpanded(false);
      }
    } catch (e) {
      setError(`Не удалось загрузить последовательность: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setFetchingId(null);
    }
  };

  const sourceColors: Record<string, string> = {
    NCBI: "#2563eb",
    UniProt: "#16a34a",
    PDB: "#a855f7",
  };

  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border border-zinc-200 dark:border-zinc-700 hover:bg-accent transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        Найти в базе данных
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-zinc-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Поиск в NCBI / UniProt / PDB..."
          className="flex-1 px-2 py-1.5 text-sm rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
          disabled={loading}
        />
        <button
          onClick={handleSearch}
          disabled={loading || query.trim().length < 3}
          className="px-3 py-1.5 rounded-md text-sm bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-40 transition-colors flex items-center gap-1"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          Найти
        </button>
        <button
          onClick={() => { setExpanded(false); setResults([]); setError(""); }}
          className="text-zinc-400 hover:text-zinc-600"
        >
          ✕
        </button>
      </div>

      {error && <div className="text-xs text-red-500">{error}</div>}

      {results.length > 0 && (
        <div className="space-y-1 max-h-60 overflow-y-auto thin-scroll">
          {results.map((r, i) => (
            <button
              key={`${r.source}-${r.id}-${i}`}
              onClick={() => handleSelect(r)}
              disabled={fetchingId === r.id}
              className="w-full text-left px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors flex items-start gap-2 group"
            >
              <span
                className="text-[9px] px-1 py-0.5 rounded text-white shrink-0 mt-0.5"
                style={{ backgroundColor: sourceColors[r.source] }}
              >
                {r.source}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate group-hover:text-teal-500">
                  {r.title}
                </div>
                <div className="text-[10px] text-zinc-400 flex items-center gap-2">
                  <span className="font-mono">{r.id}</span>
                  {r.organism !== "—" && <span>· {r.organism}</span>}
                  {r.length && <span>· {r.length} аа</span>}
                </div>
              </div>
              {fetchingId === r.id ? (
                <Loader2 className="h-3 w-3 animate-spin text-zinc-400 shrink-0 mt-1" />
              ) : (
                <ExternalLink className="h-3 w-3 text-zinc-400 shrink-0 mt-1 opacity-0 group-hover:opacity-100" />
              )}
            </button>
          ))}
        </div>
      )}

      {!loading && !error && results.length === 0 && expanded && (
        <div className="text-xs text-zinc-400 text-center py-2">
          Поиск по NCBI GenBank, UniProt и RCSB PDB. Введите название белка или accession.
        </div>
      )}
    </div>
  );
}
