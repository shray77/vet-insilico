"use client";

import Link from "next/link";
import HubHeader from "@/components/HubHeader";
import { DRUGS } from "@/data/drugs";
import { PATHOGENS } from "@/data/pathogens";

const TOOLS = [
  {
    href: "/drug-repurposing",
    icon: "🧬",
    title: "Drug Repurposing",
    tagline: "Скрининг 200+ препаратов с LLM-анализом",
    desc: "In silico docking — выбираем патоген, считаем score сродства для всех препаратов (форма, заряд, гидрофобность). 3D визуализация белок-лиганд через 3Dmol.js + LLM-анализ кандидатов через Qwen 3B.",
    stats: [`${DRUGS.length} препаратов`, `${PATHOGENS.length} патогенов`, "LLM + 3D"],
    accent: "teal",
    badge: "Главный тул",
  },
  {
    href: "/admet",
    icon: "💊",
    title: "ADMET Predictor",
    tagline: "Фармакокинетика и токсичность in silico",
    desc: "Из молекулярных свойств препарата (MW, LogP, заряд, HBD/HBA) предсказываем: пероральную биодоступность, BBB проницаемость, hERG, AMES, гепатотоксичность, CYP3A4, drug-likeness.",
    stats: ["12 параметров", "rule-based", "алерты"],
    accent: "blue",
    badge: null,
  },
  {
    href: "/epitopes",
    icon: "💉",
    title: "Vaccine Epitopes",
    tagline: "B + T эпитопы с ESM-2 ML-оценкой",
    desc: "Из аминокислотной последовательности белка находим: линейные B-эпитопы (Hopp-Woods, Chou-Fasman, Karplus-Schulz, Emini) и MHC-I 9-меры (HLA-A*02:01). ML-оценка naturalness через ESM-2 (Facebook protein language model).",
    stats: ["B + T эпитопы", "4 метода", "ESM-2 ML"],
    accent: "purple",
    badge: null,
  },
  {
    href: "/primer-designer",
    icon: "🔬",
    title: "PCR Primer Designer",
    tagline: "Дизайн праймеров с ML-анализом",
    desc: "Из целевой последовательности генома подбираем пары праймеров: Tm (nearest-neighbor SantaLucia), GC%, hairpin DP, self/cross-dimers, 3'-end stability, GC-clamp. ML-анализ специфичности через Qwen 3B.",
    stats: ["SantaLucia NN", "DP hairpin", "LLM анализ"],
    accent: "amber",
    badge: null,
  },
  {
    href: "/alignment",
    icon: "🔗",
    title: "Sequence Alignment",
    tagline: "Needleman-Wunsch + Smith-Waterman",
    desc: "Попарное выравнивание последовательностей (глобальное и локальное). Скоринг через BLOSUM62 (белки) или match/mismatch (ДНК). Считает identity, similarity, gaps, score.",
    stats: ["NW + SW", "BLOSUM62", "DNA + protein"],
    accent: "cyan",
    badge: "Новое",
  },
  {
    href: "/phylogeny",
    icon: "🌳",
    title: "Phylogenetic Tree",
    tagline: "UPGMA + Neighbor-Joining",
    desc: "Строит филогенетическое дерево из набора гомологичных последовательностей. Kimura 2-parameter для ДНК, p-distance для белков. Вывод в Newick + dendrogram + heatmap distance matrix.",
    stats: ["UPGMA + NJ", "Kimura 2P", "Newick export"],
    accent: "emerald",
    badge: "Новое",
  },
];

const ACCENT_CLASSES: Record<string, { bg: string; border: string; text: string; gradient: string }> = {
  teal: {
    bg: "bg-teal-50 dark:bg-teal-950/20",
    border: "border-teal-200 dark:border-teal-800",
    text: "text-teal-600 dark:text-teal-400",
    gradient: "from-teal-500 to-emerald-500",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-600 dark:text-blue-400",
    gradient: "from-blue-500 to-cyan-500",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/20",
    border: "border-purple-200 dark:border-purple-800",
    text: "text-purple-600 dark:text-purple-400",
    gradient: "from-purple-500 to-pink-500",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-600 dark:text-amber-400",
    gradient: "from-amber-500 to-orange-500",
  },
  cyan: {
    bg: "bg-cyan-50 dark:bg-cyan-950/20",
    border: "border-cyan-200 dark:border-cyan-800",
    text: "text-cyan-600 dark:text-cyan-400",
    gradient: "from-cyan-500 to-blue-500",
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-600 dark:text-emerald-400",
    gradient: "from-emerald-500 to-teal-500",
  },
};

export default function HubPage() {
  return (
    <div className="min-h-screen">
      <HubHeader />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <section className="text-center mb-12">
          <div className="inline-block px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 text-xs font-medium mb-4">
            🧪 In silico toolkit для ветеринарной медицины
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-teal-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">
            VetInSilico Hub
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Инструменты для in silico исследований ветеринарии: drug repurposing,
            ADMET, эпитопы вакцин, дизайн праймеров. Гибридные вычисления: эвристики в браузере + FOSS ML-модели через HuggingFace Inference API.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-6 text-xs">
            <span className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-900">🇷🇺 Адаптация под РФ</span>
            <span className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-900">🤖 ML через HuggingFace</span>
            <span className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-900">🔒 Без бэкенда</span>
            <span className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-900">📦 Static export</span>
          </div>
        </section>

        {/* Tools grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {TOOLS.map((tool) => {
            const c = ACCENT_CLASSES[tool.accent];
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className={`hub-card block rounded-2xl border-2 p-6 ${c.border} ${c.bg}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`text-4xl`}>{tool.icon}</div>
                  {tool.badge && (
                    <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${c.gradient} text-white font-medium`}>
                      {tool.badge}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold mb-1">{tool.title}</h2>
                <p className={`text-sm ${c.text} font-medium mb-3`}>{tool.tagline}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">{tool.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {tool.stats.map((s) => (
                    <span key={s} className="text-xs px-2 py-1 rounded bg-white/60 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400">
                      {s}
                    </span>
                  ))}
                </div>
                <div className={`mt-4 text-sm font-medium ${c.text}`}>Открыть →</div>
              </Link>
            );
          })}
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { v: PATHOGENS.length, label: "Патогенов", icon: "🦠" },
            { v: DRUGS.length, label: "Препаратов", icon: "💊" },
            { v: "6", label: "Инструментов", icon: "🛠" },
            { v: "FOSS", label: "ML-модели", icon: "🤖" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold text-teal-600">{s.v}</div>
              <div className="text-xs text-zinc-400">{s.label}</div>
            </div>
          ))}
        </section>

        {/* About */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 bg-white dark:bg-zinc-900">
          <h2 className="text-lg font-bold mb-3">Что такое in silico?</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
            <b>In silico</b> — исследования, проводимые на компьютере с помощью вычислительных
            методов. В биомедицине это: предсказание свойств молекул, виртуальный скрининг,
            молекулярный докинг, дизайн вакцин и праймеров — всё без пробирок.
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            В ветеринарии in silico особенно ценно: для большинства патогенов животных
            (АЧС, ящур, бешенство) нет специфических лекарств, а разработка нового препарата
            занимает 10-15 лет. Эти инструменты помогают генерировать гипотезы за минуты,
            экономя месяцы лабораторной работы.
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
        VetInSilico Hub • In silico tools for veterinary pathogens • ML-powered
        <div className="mt-1">
          Источники: RCSB PDB • Российский реестр ветпрепаратов • DrugBank Open • PubChem • HuggingFace
        </div>
      </footer>
    </div>
  );
}
