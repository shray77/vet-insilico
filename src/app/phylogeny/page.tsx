"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import HubHeader from "@/components/HubHeader";
import {
  upgma,
  neighborJoining,
  computeDistanceMatrix,
  PHYLO_SAMPLES,
  type PhyloResult,
  type PhyloNode,
} from "@/lib/phylo";

export default function PhylogenyPage() {
  const [sampleIdx, setSampleIdx] = useState(0);
  const [method, setMethod] = useState<"upgma" | "neighbor-joining">("neighbor-joining");
  const [customSeqs, setCustomSeqs] = useState(
    PHYLO_SAMPLES[0].sequences.map((s) => ({ name: s.name, seq: s.seq })).join("\n"),
  );
  const [type, setType] = useState<"protein" | "dna">(PHYLO_SAMPLES[0].type);
  const [error, setError] = useState("");

  const loadSample = (idx: number) => {
    setSampleIdx(idx);
    setCustomSeqs(PHYLO_SAMPLES[idx].sequences.map((s) => `${s.name}\t${s.seq}`).join("\n"));
    setType(PHYLO_SAMPLES[idx].type);
    setError("");
  };

  const result: { phylo: PhyloResult | null; matrix: { labels: string[]; matrix: number[][] } | null } = useMemo(() => {
    setError("");
    try {
      // Parse: lines "name<TAB>seq" or "name seq"
      const lines = customSeqs.split("\n").map((l) => l.trim()).filter(Boolean);
      const seqs = lines.map((l) => {
        const parts = l.split(/\t|\s+/);
        if (parts.length < 2) throw new Error(`Строка "${l}" — нужно: name<tab>sequence`);
        return { name: parts[0], seq: parts.slice(1).join("") };
      });
      if (seqs.length < 3) throw new Error("Нужно минимум 3 последовательности");
      if (seqs.length > 20) throw new Error("Максимум 20 последовательностей");

      const { labels, matrix } = computeDistanceMatrix(seqs, type);
      const phylo = method === "upgma" ? upgma(labels, matrix) : neighborJoining(labels, matrix);
      return { phylo, matrix: { labels, matrix } };
    } catch (e: any) {
      setError(e.message);
      return { phylo: null, matrix: null };
    }
  }, [customSeqs, type, method]);

  return (
    <div className="min-h-screen">
      <HubHeader />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-teal-500">Хаб</Link>
          <span className="mx-1">/</span>
          <span>Phylogenetic Tree</span>
        </div>

        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 mb-6">
          <h2 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-1">
            🌳 Phylogenetic Tree Builder — UPGMA + Neighbor-Joining
          </h2>
          <p className="text-sm text-emerald-800 dark:text-emerald-200">
            Строит филогенетическое дерево из набора гомологичных последовательностей. Сначала считается попарная
            distance matrix (Kimura 2-parameter для ДНК, p-distance для белков), затем — UPGMA (ultrametric)
            или NJ (Saitou-Nei 1987). Вывод — Newick + визуализация dendrogram.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input */}
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
              Образцы
            </h3>
            <div className="space-y-2 mb-4">
              {PHYLO_SAMPLES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => loadSample(i)}
                  className={`w-full text-left p-3 rounded-lg text-sm transition border ${
                    sampleIdx === i
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-emerald-300 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <div className="font-medium">{s.name}</div>
                  <div className={`text-xs ${sampleIdx === i ? "text-emerald-100" : "text-zinc-400"}`}>
                    {s.pathogen} • {s.sequences.length} seqs
                  </div>
                </button>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3 mt-4">
              Метод
            </h3>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setMethod("neighbor-joining")}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition ${
                  method === "neighbor-joining"
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200"
                }`}
              >
                🌳 Neighbor-Joining<br/><span className="text-[10px] opacity-75">Saitou-Nei 1987</span>
              </button>
              <button
                onClick={() => setMethod("upgma")}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition ${
                  method === "upgma"
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200"
                }`}
              >
                📐 UPGMA<br/><span className="text-[10px] opacity-75">ultrametric</span>
              </button>
            </div>

            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
              Тип последовательности
            </h3>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setType("protein")}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  type === "protein"
                    ? "bg-teal-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200"
                }`}
              >
                Белок (p-dist)
              </button>
              <button
                onClick={() => setType("dna")}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  type === "dna"
                    ? "bg-teal-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200"
                }`}
              >
                ДНК (Kimura 2P)
              </button>
            </div>

            <label className="block">
              <span className="text-xs text-zinc-500">
                Последовательности (name TAB seq, по одной на строку)
              </span>
              <textarea
                value={customSeqs}
                onChange={(e) => setCustomSeqs(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 mt-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono"
                placeholder={"Strain1\tMKTAYIAK...\nStrain2\tMKTAYITK..."}
              />
            </label>
            {error && (
              <div className="mt-2 text-xs text-red-500 p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                ⚠️ {error}
              </div>
            )}
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-6">
            {!result.phylo ? (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-400">
                {error || "Введите последовательности чтобы построить дерево"}
              </div>
            ) : (
              <>
                {/* Tree visualization */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
                    Дерево ({result.phylo.method === "neighbor-joining" ? "Neighbor-Joining" : "UPGMA"})
                  </h3>
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900 overflow-x-auto thin-scroll">
                    <TreeDendrogram root={result.phylo.root} maxDepth={result.phylo.maxDepth} />
                  </div>
                </div>

                {/* Newick */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
                    Newick format
                  </h3>
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-900">
                    <div className="flex items-center justify-between mb-2">
                      <code className="text-xs font-mono text-emerald-600 dark:text-emerald-400 break-all">
                        {result.phylo.newick}
                      </code>
                      <button
                        onClick={() => navigator.clipboard?.writeText(result.phylo!.newick)}
                        className="ml-2 text-xs px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 shrink-0"
                      >
                        📋
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      Можно вставить на <a href="https://itol.embl.de/" target="_blank" rel="noopener" className="text-blue-500 hover:underline">iTOL</a> или <a href="https://phylot.biobyte.de/" target="_blank" rel="noopener" className="text-blue-500 hover:underline">PhyloT</a> для интерактивной визуализации.
                    </p>
                  </div>
                </div>

                {/* Distance matrix */}
                {result.matrix && (
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
                      Distance matrix ({result.matrix.labels.length}×{result.matrix.labels.length})
                    </h3>
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                      <div className="overflow-x-auto thin-scroll">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-zinc-100 dark:bg-zinc-900">
                              <th className="px-2 py-1.5 text-left text-zinc-500"></th>
                              {result.matrix.labels.map((l) => (
                                <th key={l} className="px-2 py-1.5 text-right text-zinc-500 font-mono" title={l}>
                                  {l.length > 8 ? l.slice(0, 7) + "…" : l}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {result.matrix.matrix.map((row, i) => (
                              <tr key={i} className="border-t border-zinc-200 dark:border-zinc-800">
                                <td className="px-2 py-1.5 text-left font-mono text-zinc-500">
                                  {result.matrix!.labels[i].length > 8 ? result.matrix!.labels[i].slice(0, 7) + "…" : result.matrix!.labels[i]}
                                </td>
                                {row.map((v, j) => {
                                  // Color: 0 = white/green, 1 = red
                                  const intensity = Math.min(1, v);
                                  const bg = i === j ? "transparent"
                                    : `rgba(${Math.round(220 + 35 * (1 - intensity))}, ${Math.round(70 + 130 * (1 - intensity))}, ${Math.round(70 + 100 * (1 - intensity))}, ${0.15 + intensity * 0.5})`;
                                  return (
                                    <td
                                      key={j}
                                      className="px-2 py-1.5 text-right font-mono"
                                      style={{ background: bg, color: intensity > 0.5 ? "white" : undefined }}
                                      title={`${result.matrix!.labels[i]} vs ${result.matrix!.labels[j]}`}
                                    >
                                      {v.toFixed(3)}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-2">
                      Цвет ячейки = расстояние (зелёный = близко, красный = далеко). Диагональ = 0.
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-xs text-zinc-500 dark:text-zinc-400">
                  <b>Алгоритмы:</b><br/>
                  • <b>Neighbor-Joining</b> (Saitou-Nei 1987) — не предполагает молекулярных часов. Использует Q-матрицу для выбора ближайшей пары. Стандарт для филогении.<br/>
                  • <b>UPGMA</b> — предполагает ультраметричность (равные скорости эволюции). Хорош для коротко-дивергировавших последовательностей.<br/>
                  • <b>Kimura 2-parameter</b> (Kimura 1980) — для ДНК, раздельно учитывает transitions и transversions.<br/>
                  • <b>p-distance</b> — для белков, доля различающихся сайтов.<br/>
                  <b>⚠️</b> Для серьёзной филогении используйте <a href="https://iqtree.org/" target="_blank" rel="noopener" className="text-blue-500 hover:underline">IQ-TREE</a> или <a href="https://raxml-ng.vital-it.ch/" target="_blank" rel="noopener" className="text-blue-500 hover:underline">RAxML</a> (maximum likelihood + bootstrap).
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/** Render a horizontal dendrogram (rectangular tree). */
function TreeDendrogram({ root, maxDepth }: { root: PhyloNode; maxDepth: number }) {
  // Layout leaves at equal vertical spacing, internal nodes at midpoint of children
  const WIDTH = 700;
  const ROW_H = 28;
  // Compute layout via post-order
  type Laid = { node: PhyloNode; x: number; y: number; };
  const layout: Laid[] = [];
  let leafCounter = 0;
  function walk(node: PhyloNode): { x: number; y: number } {
    if (node.isLeaf) {
      const y = leafCounter * ROW_H + ROW_H / 2;
      leafCounter++;
      const x = (node.depth / Math.max(0.001, maxDepth)) * (WIDTH - 200);
      layout.push({ node, x, y });
      return { x, y };
    }
    const childCoords = node.children.map(walk);
    const y = childCoords.reduce((s, c) => s + c.y, 0) / childCoords.length;
    const x = (node.depth / Math.max(0.001, maxDepth)) * (WIDTH - 200);
    layout.push({ node, x, y });
    return { x, y };
  }
  walk(root);

  const totalHeight = leafCounter * ROW_H;
  const svgHeight = Math.max(120, totalHeight + 20);

  // Render edges
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
  function drawEdges(node: PhyloNode) {
    if (node.isLeaf) return;
    const parent = layout.find((l) => l.node === node)!;
    for (const child of node.children) {
      const childL = layout.find((l) => l.node === child)!;
      edges.push({ x1: parent.x, y1: parent.y, x2: childL.x, y2: childL.y });
      drawEdges(child);
    }
  }
  drawEdges(root);

  return (
    <svg width={WIDTH} height={svgHeight} className="max-w-full" style={{ minWidth: 480 }}>
      {/* Branches as rectangular cladogram */}
      {(() => {
        const lines: React.ReactNode[] = [];
        function drawRectLines(node: PhyloNode) {
          if (node.isLeaf) return;
          const parent = layout.find((l) => l.node === node)!;
          for (const child of node.children) {
            const childL = layout.find((l) => l.node === child)!;
            // Horizontal line from parent to child x at parent y
            lines.push(
              <line key={`h-${node.name}-${child.name}-h`} x1={parent.x} y1={parent.y} x2={childL.x} y2={parent.y} stroke="#52525b" strokeWidth={1.5} />,
            );
            // Vertical line from parent y to child y at child x
            lines.push(
              <line key={`v-${node.name}-${child.name}-v`} x1={childL.x} y1={parent.y} x2={childL.x} y2={childL.y} stroke="#52525b" strokeWidth={1.5} />,
            );
            drawRectLines(child);
          }
        }
        drawRectLines(root);
        return lines;
      })()}
      {/* Leaves labels */}
      {layout.filter((l) => l.node.isLeaf).map((l, i) => (
        <g key={i}>
          <circle cx={l.x} cy={l.y} r={3} fill="#0d9488" />
          <text x={l.x + 8} y={l.y + 4} fontSize={11} fontFamily="monospace" fill="#e4e4e7">
            {l.node.name}
          </text>
        </g>
      ))}
      {/* Internal node labels (optional, just dots) */}
      {layout.filter((l) => !l.node.isLeaf).map((l, i) => (
        <circle key={`i-${i}`} cx={l.x} cy={l.y} r={2} fill="#71717a" />
      ))}
      {/* Scale bar */}
      <g transform={`translate(10, ${svgHeight - 8})`}>
        <line x1={0} y1={0} x2={(WIDTH - 200) * 0.2} y2={0} stroke="#52525b" strokeWidth={1.5} />
        <text x={0} y={-4} fontSize={9} fill="#71717a">
          {(maxDepth * 0.2).toFixed(2)} subst/site
        </text>
      </g>
    </svg>
  );
}
