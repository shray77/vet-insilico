"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import HubHeader from "@/components/HubHeader";
import { DRUGS } from "@/data/drugs";
import { PATHOGENS } from "@/data/pathogens";

interface Tool {
  href: string;
  icon: string;
  title: string;
  tagline: string;
  desc: string;
  stats: string[];
  accent: string;
  badge?: string | null;
  /** Whether this tool uses ML via HuggingFace (requires HF token). */
  requiresML?: boolean;
}

interface Category {
  id: string;
  title: string;
  icon: string;
  subtitle: string;
  tools: Tool[];
}

const CATEGORIES: Category[] = [
  {
    id: "pharmacology",
    title: "Фармакология",
    icon: "💊",
    subtitle: "Drug repurposing, ADMET, PK/PD — поиск и оценка препаратов",
    tools: [
      {
        href: "/drug-repurposing",
        icon: "🧬",
        title: "Drug Repurposing",
        tagline: "Скрининг 200+ препаратов с LLM-анализом",
        desc: "In silico docking — выбираем патоген, считаем score сродства для всех препаратов. 3D визуализация белок-лиганд через 3Dmol.js + LLM-анализ кандидатов через Qwen 3B. Экспорт в CSV.",
        stats: [`${DRUGS.length} препаратов`, `${PATHOGENS.length} патогенов`, "LLM + 3D"],
        accent: "teal",
        badge: "Главный тул",
        requiresML: true,
      },
      {
        href: "/admet",
        icon: "💊",
        title: "ADMET Predictor",
        tagline: "Фармакокинетика и токсичность",
        desc: "Из молекулярных свойств препарата (MW, LogP, заряд, HBD/HBA) предсказываем: биодоступность, BBB, hERG, AMES, гепатотоксичность, CYP3A4, drug-likeness. Path B: ML через Qwen LLM на SMILES.",
        stats: ["12 параметров", "rule-based", "🧬 SMILES ML"],
        accent: "blue",
        badge: null,
        requiresML: true,
      },
      {
        href: "/pkpd",
        icon: "📊",
        title: "PK/PD Simulator",
        tagline: "Концентрация-время + dose-response",
        desc: "Однокомпартментная PK модель. PD-индексы: AUC/MIC (фторхинолоны), Cmax/MIC (аминогликозиды), T>MIC (β-лактамы). 6 препаратов с реальными ветеринарными параметрами.",
        stats: ["1-compartment PK", "Emax PD", "6 препаратов"],
        accent: "rose",
        badge: null,
      },
      {
        href: "/dose-calculator",
        icon: "🧪",
        title: "Antibiotic Dose Calculator",
        tagline: "Дозировка по весу/виду/возрасту",
        desc: "36 схем дозирования для 6 видов животных (свинья, КРС, птица, собака, кошка, лошадь). Расчёт по весу, коррекция на возраст, концентрацию, стоимость курса. Plumb's + РФ реестр.",
        stats: ["36 схем", "6 видов", "с коррекцией"],
        accent: "cyan",
        badge: null,
      },
      {
        href: "/pdb-viewer",
        icon: "🔬",
        title: "Protein Structure Viewer",
        tagline: "3D визуализация PDB структур",
        desc: "Просмотр 3D структур белков из RCSB PDB через 3Dmol.js. 5 стилей: cartoon, stick, sphere, surface, lines. Лиганды и ионы металлов выделяются. 8 готовых структур.",
        stats: ["3Dmol.js", "5 стилей", "PDB search"],
        accent: "violet",
        badge: "Новое",
      },
    ],
  },
  {
    id: "vaccines-diagnostics",
    title: "Вакцины и диагностика",
    icon: "💉",
    subtitle: "Эпитопы, праймеры, резистентность — дизайн вакцин и ПЦР-детекция",
    tools: [
      {
        href: "/epitopes",
        icon: "💉",
        title: "Vaccine Epitopes",
        tagline: "B + T эпитопы с ESM-2 ML",
        desc: "Линейные B-эпитопы (Hopp-Woods, Chou-Fasman, Karplus-Schulz, Emini) + MHC-I 9-меры (HLA-A*02:01). ML-оценка naturalness через ESM-2 (Facebook protein language model).",
        stats: ["B + T эпитопы", "4 метода", "ESM-2 ML"],
        accent: "purple",
        badge: null,
        requiresML: true,
      },
      {
        href: "/primer-designer",
        icon: "🔬",
        title: "PCR Primer Designer",
        tagline: "SantaLucia NN + DP + LLM",
        desc: "Tm (nearest-neighbor SantaLucia 1998), GC%, hairpin DP, self/cross-dimers ΔG, 3'-end stability, GC-clamp. ML-анализ специфичности и рисков через Qwen 3B.",
        stats: ["SantaLucia NN", "DP hairpin", "LLM анализ"],
        accent: "amber",
        badge: null,
        requiresML: true,
      },
      {
        href: "/amr",
        icon: "🦠",
        title: "AMR Predictor",
        tagline: "Резистентность к антибиотикам",
        desc: "По гену-мишени (GyrA, RpoB, PBP, 16S rRNA) предсказываем резистентность. Rule-based мутации (CARD/ResFinder) + motif search (blaTEM, ermB, tetM, qnrA). 7 классов антибиотиков.",
        stats: ["CARD subset", "10+ mutations", "7 motifs"],
        accent: "orange",
        badge: null,
      },
      {
        href: "/crispr",
        icon: "🧬",
        title: "CRISPR gRNA Designer",
        tagline: "Дизайн guide RNA для SpCas9",
        desc: "Поиск NGG PAM на обеих цепях, on-target score (Doench 2016 упрощённо), off-target проверка против геномов хозяев, GC content, hairpin ΔG. Для редактирования CD163, ANP32A, MSTN.",
        stats: ["SpCas9 NGG", "Doench 2016", "off-target check"],
        accent: "indigo",
        badge: "Новое",
      },
      {
        href: "/codon-optimizer",
        icon: "🔤",
        title: "Codon Optimization",
        tagline: "Оптимизация кодонов под вид",
        desc: "Оптимизация ДНК для экспрессии в свинье/КРС/курице/E. coli. Таблицы Kazusa, CAI (Codon Adaptation Index), избегание сайтов рестриктаз и шпилек. Для рекомбинантных вакцин.",
        stats: ["4 вида", "Kazusa tables", "CAI + GC"],
        accent: "fuchsia",
        badge: null,
      },
      {
        href: "/ai-vet",
        icon: "🩺",
        title: "AI Veterinarian",
        tagline: "Дифференциальный диагноз через LLM",
        desc: "Вводишь вид + возраст + симптомы → дифференциальный диагноз с вероятностями, рекомендуемые тесты, уровень срочности. LLM Qwen-Coder-3B через HuggingFace.",
        stats: ["LLM диагноз", "8 видов", "срочность"],
        accent: "rose",
        badge: "Новое",
        requiresML: true,
      },
    ],
  },
  {
    id: "genomics",
    title: "Геномика",
    icon: "🧬",
    subtitle: "Alignment, филогения, рестрикция — сравнение и картирование последовательностей",
    tools: [
      {
        href: "/alignment",
        icon: "🔗",
        title: "Sequence Alignment",
        tagline: "Needleman-Wunsch + Smith-Waterman",
        desc: "Попарное выравнивание (глобальное и локальное). Скоринг через BLOSUM62 (белки) или match/mismatch (ДНК). Identity, similarity, gaps, score.",
        stats: ["NW + SW", "BLOSUM62", "DNA + protein"],
        accent: "cyan",
        badge: null,
      },
      {
        href: "/phylogeny",
        icon: "🌳",
        title: "Phylogenetic Tree",
        tagline: "UPGMA + Neighbor-Joining",
        desc: "Дерево из гомологичных последовательностей. Kimura 2-parameter (ДНК), p-distance (белки). Newick export + SVG dendrogram + heatmap distance matrix.",
        stats: ["UPGMA + NJ", "Kimura 2P", "Newick"],
        accent: "emerald",
        badge: null,
      },
      {
        href: "/restriction-map",
        icon: "✂️",
        title: "Restriction Map",
        tagline: "Карта сайтов рестриктаз",
        desc: "30+ рестриктаз (EcoRI, BamHI, HindIII, SmaI, NotI, SfiI...). IUPAC-коды. Линейная карта разрезов, размеры фрагментов, виртуальный гель-электрофорез.",
        stats: ["30+ enzymes", "IUPAC codes", "Virtual gel"],
        accent: "lime",
        badge: null,
      },
      {
        href: "/plasmid-map",
        icon: "🧫",
        title: "Plasmid Map Designer",
        tagline: "ORF + restriction sites на плазмиде",
        desc: "Анализ плазмид: поиск ORF (ATG/GTG/TTG → stop на обеих цепях), сайты рестриктаз, GC content. Circular SVG карта с ORF дугами и cut site метками.",
        stats: ["ORF detection", "Circular map", "GC profile"],
        accent: "stone",
        badge: "Новое",
      },
      {
        href: "/molecular-clock",
        icon: "⏱️",
        title: "Molecular Clock Calculator",
        tagline: "Время расхождения по генетическому расстоянию",
        desc: "Оценка времени расхождения по формуле T = d / (2r). 12 опубликованных clock rates (ASFV, Influenza, Rabies, FMDV, BVDV, Brucella, mtDNA...). 95% CI.",
        stats: ["12 clock rates", "K2P distance", "95% CI"],
        accent: "slate",
        badge: "Новое",
      },
    ],
  },
  {
    id: "diagnostics-tools",
    title: "Диагностика и инструменты",
    icon: "📊",
    subtitle: "ELISA, AI ветврач — лабораторные и клинические инструменты",
    tools: [
      {
        href: "/elisa",
        icon: "📊",
        title: "ELISA Cut-off Calculator",
        tagline: "Cut-off + ROC + AUC для ELISA",
        desc: "Статистический анализ OD значений. Cut-off = mean + 2SD/3SD. ROC curve, AUC, sensitivity/specificity если есть positive controls. CV% для оценки качества.",
        stats: ["Mean + 2SD", "ROC + AUC", "Sens/Spec"],
        accent: "teal",
        badge: "Новое",
      },
    ],
  },
];

const ACCENT_CLASSES: Record<string, { bg: string; border: string; text: string; gradient: string }> = {
  teal: { bg: "bg-teal-50 dark:bg-teal-950/20", border: "border-teal-200 dark:border-teal-800", text: "text-teal-600 dark:text-teal-400", gradient: "from-teal-500 to-emerald-500" },
  blue: { bg: "bg-blue-50 dark:bg-blue-950/20", border: "border-blue-200 dark:border-blue-800", text: "text-blue-600 dark:text-blue-400", gradient: "from-blue-500 to-cyan-500" },
  purple: { bg: "bg-purple-50 dark:bg-purple-950/20", border: "border-purple-200 dark:border-purple-800", text: "text-purple-600 dark:text-purple-400", gradient: "from-purple-500 to-pink-500" },
  amber: { bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800", text: "text-amber-600 dark:text-amber-400", gradient: "from-amber-500 to-orange-500" },
  cyan: { bg: "bg-cyan-50 dark:bg-cyan-950/20", border: "border-cyan-200 dark:border-cyan-800", text: "text-cyan-600 dark:text-cyan-400", gradient: "from-cyan-500 to-blue-500" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-600 dark:text-emerald-400", gradient: "from-emerald-500 to-teal-500" },
  rose: { bg: "bg-rose-50 dark:bg-rose-950/20", border: "border-rose-200 dark:border-rose-800", text: "text-rose-600 dark:text-rose-400", gradient: "from-rose-500 to-pink-500" },
  orange: { bg: "bg-orange-50 dark:bg-orange-950/20", border: "border-orange-200 dark:border-orange-800", text: "text-orange-600 dark:text-orange-400", gradient: "from-orange-500 to-red-500" },
  lime: { bg: "bg-lime-50 dark:bg-lime-950/20", border: "border-lime-200 dark:border-lime-800", text: "text-lime-700 dark:text-lime-400", gradient: "from-lime-500 to-green-500" },
  indigo: { bg: "bg-indigo-50 dark:bg-indigo-950/20", border: "border-indigo-200 dark:border-indigo-800", text: "text-indigo-600 dark:text-indigo-400", gradient: "from-indigo-500 to-purple-500" },
  fuchsia: { bg: "bg-fuchsia-50 dark:bg-fuchsia-950/20", border: "border-fuchsia-200 dark:border-fuchsia-800", text: "text-fuchsia-600 dark:text-fuchsia-400", gradient: "from-fuchsia-500 to-pink-500" },
  violet: { bg: "bg-violet-50 dark:bg-violet-950/20", border: "border-violet-200 dark:border-violet-800", text: "text-violet-600 dark:text-violet-400", gradient: "from-violet-500 to-purple-500" },
  stone: { bg: "bg-stone-50 dark:bg-stone-950/20", border: "border-stone-200 dark:border-stone-800", text: "text-stone-600 dark:text-stone-400", gradient: "from-stone-500 to-amber-500" },
  slate: { bg: "bg-slate-50 dark:bg-slate-950/20", border: "border-slate-200 dark:border-slate-800", text: "text-slate-600 dark:text-slate-400", gradient: "from-slate-500 to-zinc-500" },
};

const CATEGORY_ACCENT: Record<string, { bg: string; text: string; border: string }> = {
  pharmacology: { bg: "from-teal-500/10 to-blue-500/10", text: "text-teal-600 dark:text-teal-400", border: "border-teal-200 dark:border-teal-800" },
  "vaccines-diagnostics": { bg: "from-purple-500/10 to-rose-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800" },
  genomics: { bg: "from-emerald-500/10 to-cyan-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" },
  "diagnostics-tools": { bg: "from-teal-500/10 to-orange-500/10", text: "text-teal-600 dark:text-teal-400", border: "border-teal-200 dark:border-teal-800" },
};

export default function HubPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: "/" to focus search, "Escape" to clear
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape" && searchQuery) {
        setSearchQuery("");
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [searchQuery]);

  return (
    <div className="min-h-screen fade-in">
      <HubHeader />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <section className="text-center mb-12">
          <div className="inline-block px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 text-xs font-medium mb-4">
            🧪 Open-source in silico toolkit для ветеринарии
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-teal-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">
            VetInSilico Hub
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            17 инструментов для in silico исследований ветеринарии — от drug repurposing до CRISPR, филогении и AI-диагностики.
            Гибрид: эвристики в браузере + FOSS ML через HuggingFace + RDKit.js WASM.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-6 text-xs">
            <span className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-900">🇷🇺 Адаптация под РФ</span>
            <span className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-900">🤖 ML через HuggingFace</span>
            <span className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-900">🔒 Без бэкенда</span>
            <span className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-900">🧪 Apache 2.0</span>
          </div>
        </section>

        {/* Quick stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
          {[
            { v: PATHOGENS.length, label: "Патогенов", icon: "🦠" },
            { v: DRUGS.length, label: "Препаратов", icon: "💊" },
            { v: DRUGS.filter(d => d.smiles).length, label: "SMILES", icon: "🧪" },
            { v: "17", label: "Инструментов", icon: "🛠" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 text-center">
              <div className="text-xl mb-0.5">{s.icon}</div>
              <div className="text-xl font-bold text-teal-600">{s.v}</div>
              <div className="text-[10px] text-zinc-400">{s.label}</div>
            </div>
          ))}
        </section>

        {/* Search */}
        <div className="mb-6 relative">
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Поиск инструмента... (docking, CRISPR, primer, ELISA, ...)"
            className="w-full px-4 py-2.5 pr-16 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:border-teal-400 transition-colors"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700 hidden sm:block">
            /
          </kbd>
        </div>

        {/* Categories */}
        {CATEGORIES.map((cat) => {
          // Filter tools by search query
          const filteredTools = searchQuery.trim()
            ? cat.tools.filter(t =>
                t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.stats.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
              )
            : cat.tools;
          if (filteredTools.length === 0) return null;
          const cat2 = cat;
          const ca = CATEGORY_ACCENT[cat.id];
          return (
            <section key={cat.id} className="mb-10">
              {/* Category header */}
              <div className={`rounded-2xl border ${ca.border} bg-gradient-to-r ${ca.bg} p-4 mb-4`}>
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{cat.icon}</div>
                  <div>
                    <h2 className={`text-xl font-bold ${ca.text}`}>{cat.title}</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{cat.subtitle}</p>
                  </div>
                  <div className="ml-auto text-xs text-zinc-400">{filteredTools.length} тул{filteredTools.length === 1 ? "" : "ов"}</div>
                </div>
              </div>
              {/* Tool cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {filteredTools.map((tool) => {
                  const c = ACCENT_CLASSES[tool.accent];
                  return (
                    <Link
                      key={tool.href}
                      href={tool.href}
                      className={`hub-card block rounded-2xl border-2 p-5 ${c.border} ${c.bg} relative`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="text-3xl">{tool.icon}</div>
                        <div className="flex flex-col items-end gap-1">
                          {tool.badge && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r ${c.gradient} text-white font-medium`}>
                              {tool.badge}
                            </span>
                          )}
                          {tool.requiresML && (
                            <span
                              title="Требуется HF token для ML-функций (LLM анализ / ESM-2). Базовые функции работают без него."
                              className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-medium border border-purple-200 dark:border-purple-800"
                            >
                              🤖 требует ИИ
                            </span>
                          )}
                        </div>
                      </div>
                      <h3 className="text-base font-bold mb-0.5">{tool.title}</h3>
                      <p className={`text-xs ${c.text} font-medium mb-2`}>{tool.tagline}</p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3 leading-relaxed">{tool.desc}</p>
                      <div className="flex flex-wrap gap-1">
                        {tool.stats.map((s) => (
                          <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-white/60 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400">
                            {s}
                          </span>
                        ))}
                      </div>
                      <div className={`mt-3 text-xs font-medium ${c.text}`}>Открыть →</div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* No results */}
        {searchQuery.trim() && CATEGORIES.every(cat =>
          cat.tools.every(t =>
            !t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !t.tagline.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !t.desc.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !t.stats.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
          )
        ) && (
          <div className="text-center py-12 text-zinc-400">
            <div className="text-4xl mb-3">🔍</div>
            <div className="text-sm">Ничего не найдено по запросу «{searchQuery}»</div>
            <button onClick={() => setSearchQuery("")} className="mt-3 text-xs text-teal-500 hover:underline">
              Очистить поиск
            </button>
          </div>
        )}

        {/* About */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 bg-white dark:bg-zinc-900">
          <h2 className="text-lg font-bold mb-3">Что такое in silico?</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
            <b>In silico</b> — исследования, проводимые на компьютере с помощью вычислительных методов.
            В биомедицине: предсказание свойств молекул, виртуальный скрининг, молекулярный докинг,
            дизайн вакцин и праймеров — всё без пробирок.
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            В ветеринарии особенно ценно: для большинства патогенов животных (АЧС, ящур, бешенство)
            нет специфических лекарств, а разработка нового препарата занимает 10-15 лет.
            Эти инструменты помогают генерировать гипотезы за минуты, экономя месяцы лабораторной работы.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-xs">
            <div className="rounded-lg bg-teal-50 dark:bg-teal-950/30 p-3">
              <div className="font-semibold mb-1 text-teal-700 dark:text-teal-300">🧪 In vitro</div>
              <div className="text-zinc-500">В пробирке — реальные эксперименты с клетками/ферментами</div>
            </div>
            <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 p-3">
              <div className="font-semibold mb-1 text-purple-700 dark:text-purple-300">🐭 In vivo</div>
              <div className="text-zinc-500">В организме — опыты на лабораторных животных</div>
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3">
              <div className="font-semibold mb-1 text-amber-700 dark:text-amber-300">💻 In silico</div>
              <div className="text-zinc-500">В компьютере — вычислительные модели</div>
            </div>
          </div>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-6 border-t border-zinc-200 dark:border-zinc-800 mt-8 text-center text-xs text-zinc-400">
        VetInSilico Hub • Open-source in silico tools for veterinary pathogens • Apache 2.0
        <div className="mt-1">
          Источники: RCSB PDB • Российский реестр ветпрепаратов • DrugBank Open • PubChem • HuggingFace • CARD
        </div>
      </footer>
    </div>
  );
}
