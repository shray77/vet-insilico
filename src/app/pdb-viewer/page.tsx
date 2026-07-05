"use client";

import { useState } from "react";
import Link from "next/link";
import HubHeader from "@/components/HubHeader";
import Viewer3D from "@/components/Viewer3D";

const POPULAR_PDB = [
  { id: "6QU9", name: "ASFV p72 capsid", pathogen: "АЧС" },
  { id: "1S48", name: "BVDV NS3 protease", pathogen: "BVDV" },
  { id: "6F87", name: "E. coli GyrA", pathogen: "E. coli" },
  { id: "7QEU", name: "PEDV 3CLpro", pathogen: "PEDV" },
  { id: "1UC1", name: "Salmonella FliC", pathogen: "Сальмонеллёз" },
  { id: "1LTS", name: "E. coli LT toxin", pathogen: "E. coli" },
  { id: "1ZLA", name: "Influenza neuraminidase", pathogen: "Грипп" },
  { id: "2XCT", name: "Salmonella GyrA", pathogen: "Сальмонеллёз" },
];

export default function PdbViewerPage() {
  const [pdbId, setPdbId] = useState("6QU9");
  const [inputId, setInputId] = useState("6QU9");

  const submit = () => {
    const id = inputId.trim().toUpperCase();
    if (id.length === 4) setPdbId(id);
  };

  return (
    <div className="min-h-screen">
      <HubHeader />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-teal-500">Хаб</Link>
          <span className="mx-1">/</span>
          <span>Protein Structure Viewer</span>
        </div>
        <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 p-4 mb-6">
          <h2 className="font-semibold text-violet-900 dark:text-violet-100 mb-1">🧬 Protein Structure Viewer — 3Dmol.js</h2>
          <p className="text-sm text-violet-800 dark:text-violet-200">
            Просмотр 3D структур белков из RCSB PDB. 5 стилей отображения (cartoon, stick, sphere, surface, lines).
            Лиганды выделяются пурпурным, ионы металлов — оранжевым.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Популярные структуры</h3>
            <div className="space-y-1 mb-4">
              {POPULAR_PDB.map((p) => (
                <button key={p.id} onClick={() => { setPdbId(p.id); setInputId(p.id); }}
                  className={`w-full text-left p-2 rounded-lg text-sm transition border ${
                    pdbId === p.id ? "bg-violet-600 text-white border-violet-600"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-violet-300 text-zinc-700 dark:text-zinc-300"
                  }`}>
                  <div className="font-mono font-bold">{p.id}</div>
                  <div className={`text-xs ${pdbId === p.id ? "text-violet-100" : "text-zinc-400"}`}>{p.name}</div>
                </button>
              ))}
            </div>
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Поиск по PDB ID</h3>
            <div className="flex gap-2">
              <input type="text" value={inputId} onChange={(e) => setInputId(e.target.value)}
                placeholder="PDB ID (4 символа)"
                maxLength={4}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-mono uppercase" />
              <button onClick={submit} className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700">
                Загрузить
              </button>
            </div>
            <a href="https://www.rcsb.org/" target="_blank" rel="noopener"
              className="block mt-2 text-xs text-blue-500 hover:underline">
              Искать структуры на RCSB PDB ↗
            </a>
          </div>

          <div className="lg:col-span-2">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                Структура {pdbId.toUpperCase()}
              </h3>
              <a href={`https://www.rcsb.org/structure/${pdbId.toUpperCase()}`}
                target="_blank" rel="noopener"
                className="text-xs text-blue-500 hover:underline">
                Открыть на RCSB ↗
              </a>
            </div>
            <Viewer3D pdbId={pdbId} height={500}
              caption="Покрутите мышью для вращения. Колесо — зум. Лиганды выделены пурпурным." />
          </div>
        </div>
      </main>
    </div>
  );
}
