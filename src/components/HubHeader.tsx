"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import HfTokenModal from "./HfTokenModal";
import { getHfToken } from "@/lib/hf";

const TOOL_CATEGORIES = [
  {
    title: "Фармакология",
    tools: [
      { href: "/drug-repurposing", label: "Docking", icon: "🧬" },
      { href: "/admet", label: "ADMET", icon: "💊" },
      { href: "/pkpd", label: "PK/PD", icon: "📊" },
      { href: "/dose-calculator", label: "Дозы", icon: "🧪" },
    ],
  },
  {
    title: "Вакцины",
    tools: [
      { href: "/epitopes", label: "Эпитопы", icon: "💉" },
      { href: "/vaccine-designer", label: "Designer", icon: "🧬" },
    ],
  },
  {
    title: "Геномика",
    tools: [
      { href: "/sequence-id", label: "BLAST ID", icon: "🔍" },
      { href: "/primer-designer", label: "Праймеры", icon: "🔬" },
      { href: "/crispr", label: "CRISPR", icon: "✂️" },
      { href: "/codon-optimizer", label: "Кодоны", icon: "🔤" },
      { href: "/alignment", label: "Align", icon: "🔗" },
      { href: "/phylogeny", label: "Филогения", icon: "🌳" },
      { href: "/molecular-clock", label: "Часы", icon: "⏱️" },
      { href: "/amr", label: "AMR", icon: "🦠" },
      { href: "/restriction-map", label: "Рестрикция", icon: "✂️" },
      { href: "/plasmid-map", label: "Плазмида", icon: "🧫" },
    ],
  },
  {
    title: "Диагностика",
    tools: [
      { href: "/outbreak-surveillance", label: "Surveillance", icon: "🦠" },
      { href: "/elisa", label: "ELISA", icon: "📊" },
      { href: "/pdb-viewer", label: "3D Viewer", icon: "🔬" },
      { href: "/ai-vet", label: "AI Вет", icon: "🩺" },
    ],
  },
];

// Top 4 most-used tools shown as direct icons on all screens
const TOP_TOOLS = [
  { href: "/drug-repurposing", label: "Docking", icon: "🧬" },
  { href: "/epitopes", label: "Эпитопы", icon: "💉" },
  { href: "/vaccine-designer", label: "Designer", icon: "🧬" },
  { href: "/ai-vet", label: "AI Вет", icon: "🩺" },
];

export default function HubHeader() {
  const pathname = usePathname();
  const [dark, setDark] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");
  const [mlOpen, setMlOpen] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Theme handling — supports dark/light/system
  useEffect(() => {
    const saved = localStorage.getItem("vis-theme") as "dark" | "light" | "system" | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
    try { localStorage.setItem("vis-theme", theme); } catch {}
  }, [theme]);

  useEffect(() => {
    setHasToken(!!getHfToken());
  }, [mlOpen]);

  // Close menu on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const cycleTheme = () => {
    setTheme(theme === "dark" ? "light" : theme === "light" ? "system" : "dark");
  };

  const themeIcon = theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "🖥️";
  const themeLabel = theme === "dark" ? "Тёмная" : theme === "light" ? "Светлая" : "Системная";

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-3 h-12 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-1.5 font-bold text-base shrink-0">
            🧬 <span className="hidden sm:inline">VetInSilico <span className="text-teal-500">Hub</span></span>
          </Link>

          {/* Desktop: top 4 tools as direct icons + all tools dropdown */}
          <nav className="hidden md:flex gap-0.5 ml-auto items-center overflow-x-auto thin-scroll">
            {TOP_TOOLS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={`px-2 py-1 rounded-md text-xs font-medium transition whitespace-nowrap ${
                  isActive(t.href)
                    ? "bg-teal-600 text-white"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
                title={t.label}
              >
                <span className="mr-0.5">{t.icon}</span>
                <span className="hidden lg:inline">{t.label}</span>
              </Link>
            ))}

            {/* All tools dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition flex items-center gap-0.5 ${
                  menuOpen ? "bg-zinc-100 dark:bg-zinc-800" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                } text-zinc-600 dark:text-zinc-400`}
              >
                Все ⌄
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-64 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl p-2 max-h-[70vh] overflow-y-auto thin-scroll z-50">
                  {TOOL_CATEGORIES.map((cat) => (
                    <div key={cat.title} className="mb-2">
                      <div className="text-[9px] font-bold uppercase text-zinc-400 px-1 mb-1">{cat.title}</div>
                      {cat.tools.map((t) => (
                        <Link
                          key={t.href}
                          href={t.href}
                          onClick={() => setMenuOpen(false)}
                          className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs transition ${
                            isActive(t.href) ? "bg-teal-500/10 text-teal-600 dark:text-teal-400" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <span>{t.icon}</span>
                          <span>{t.label}</span>
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Mobile: just the hamburger menu */}
          <nav className="md:hidden ml-auto flex items-center gap-0.5">
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="px-2 py-1 rounded-md text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                ☰
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl p-2 max-h-[70vh] overflow-y-auto thin-scroll z-50">
                  <Link href="/" onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs mb-1 ${isActive("/") ? "bg-teal-500/10 text-teal-600 dark:text-teal-400" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                    🏠 <span>Хаб</span>
                  </Link>
                  {TOOL_CATEGORIES.map((cat) => (
                    <div key={cat.title} className="mb-1">
                      <div className="text-[9px] font-bold uppercase text-zinc-400 px-1">{cat.title}</div>
                      {cat.tools.map((t) => (
                        <Link
                          key={t.href}
                          href={t.href}
                          onClick={() => setMenuOpen(false)}
                          className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs transition ${
                            isActive(t.href) ? "bg-teal-500/10 text-teal-600 dark:text-teal-400" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <span>{t.icon}</span>
                          <span>{t.label}</span>
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <button
            onClick={() => setMlOpen(true)}
            className={`p-1 rounded-md transition relative shrink-0 ${hasToken ? "text-green-500" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
            aria-label="ML настройки"
            title={hasToken ? "ML: настроен" : "ML: токен не задан"}
          >
            🤖
            {hasToken && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full" />
            )}
          </button>

          <button
            onClick={cycleTheme}
            className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shrink-0"
            aria-label={`Тема: ${themeLabel}`}
            title={`Тема: ${themeLabel} (клик для смены)`}
          >
            {themeIcon}
          </button>
        </div>
      </header>
      <HfTokenModal open={mlOpen} onClose={() => setMlOpen(false)} />
    </>
  );
}
