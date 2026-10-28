"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { ChevronDown, Dna, Menu, Monitor, Moon, Sun } from "lucide-react";
import HfTokenModal from "./HfTokenModal";
import { ToolIcon } from "./ToolIcon";
import { getHfToken } from "@/lib/hf";

const TOOL_CATEGORIES = [
  {
    title: "Фармакология",
    tools: [
      { href: "/drug-repurposing", label: "Docking" },
      { href: "/admet", label: "ADMET" },
      { href: "/toxicity-ml", label: "Toxicity ML" },
      { href: "/pkpd", label: "PK/PD" },
      { href: "/dose-calculator", label: "Дозы" },
    ],
  },
  {
    title: "Вакцины",
    tools: [
      { href: "/epitopes", label: "Эпитопы" },
      { href: "/vaccine-designer", label: "Designer" },
    ],
  },
  {
    title: "Геномика",
    tools: [
      { href: "/sequence-id", label: "BLAST ID" },
      { href: "/variant-effect", label: "Variants" },
      { href: "/structure-prediction", label: "ESMFold" },
      { href: "/primer-designer", label: "Праймеры" },
      { href: "/crispr", label: "CRISPR" },
      { href: "/codon-optimizer", label: "Кодоны" },
      { href: "/alignment", label: "Align" },
      { href: "/phylogeny", label: "Филогения" },
      { href: "/molecular-clock", label: "Часы" },
      { href: "/amr", label: "AMR" },
      { href: "/restriction-map", label: "Рестрикция" },
      { href: "/plasmid-map", label: "Плазмида" },
    ],
  },
  {
    title: "Диагностика",
    tools: [
      { href: "/outbreak-surveillance", label: "Surveillance" },
      { href: "/elisa", label: "ELISA" },
      { href: "/pdb-viewer", label: "3D Viewer" },
      { href: "/ai-vet", label: "AI Вет" },
    ],
  },
];

// Top 4 most-used tools shown as direct icons on all screens
const TOP_TOOLS = [
  { href: "/drug-repurposing", label: "Docking" },
  { href: "/epitopes", label: "Эпитопы" },
  { href: "/vaccine-designer", label: "Designer" },
  { href: "/ai-vet", label: "AI Вет" },
];

export default function HubHeader() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"dark" | "light" | "system">("light");
  const [mlOpen, setMlOpen] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Task 183 (M2): два отдельных ref — раньше один menuRef указывал на мобильный
  // дропдаун (последний mount), и на десктопе outside-click не «видел» открытый
  // дропдаун: кнопка «Все» не закрывала меню, клики по пустым зонам схлопывали его.
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const themeTouched = useRef(false);

  // Тема ДС: init-скрипт в layout уже поставил data-theme до гидрации —
  // на маунте только читаем выбор пользователя (для иконки), не трогаем DOM.
  useEffect(() => {
    const saved = localStorage.getItem("vis-theme") as "dark" | "light" | "system" | null;
    if (saved) setTheme(saved);
  }, []);

  // Применяем тему только после явного действия пользователя (иначе
  // был бы 1-кадровый флеш светлой у тёмных юзеров на каждой загрузке)
  useEffect(() => {
    if (!themeTouched.current) return;
    const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    try { localStorage.setItem("vis-theme", theme); } catch {}
  }, [theme]);

  useEffect(() => {
    setHasToken(!!getHfToken());
  }, [mlOpen]);

  // Close menu on outside click (оба меню: десктопное и мобильное)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (desktopMenuRef.current?.contains(t) || mobileMenuRef.current?.contains(t)) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const cycleTheme = () => {
    themeTouched.current = true;
    setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light");
  };

  const ThemeGlyph = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const themeLabel = theme === "dark" ? "Тёмная" : theme === "light" ? "Светлая" : "Системная";

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-3 h-12 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            {/* Лого-плитка — ДНК мастхед-паттерна v2.2 (якорь + характер) */}
            <span className="brand-logo">
              <Dna size={15} strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="hidden sm:inline font-display text-lg leading-none tracking-tight">
              VetInSilico <span className="text-teal-500">Hub</span>
            </span>
          </Link>

          {/* Desktop: top 4 tools as direct icons + all tools dropdown */}
          {/* Task 183 (M2, доп.): overflow-x-auto жило на самом nav — Tailwind
              превращает visible в auto по второй оси → absolute-дропдаун,
              свисающий из nav, ОБРЕЗАЛСЯ по боксу nav (hit-test мимо, пункты
              меню физически некликабельны на десктопе). Скролл-контейнер
              теперь обнимает только TOP_TOOLS, дропдаун-контейнер — вне clip. */}
          <nav className="hidden md:flex gap-0.5 ml-auto items-center">
            <div className="flex gap-0.5 items-center overflow-x-auto thin-scroll">
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
                  <ToolIcon href={t.href} size={13} className="mr-0.5 shrink-0" />
                  <span className="hidden lg:inline">{t.label}</span>
                </Link>
              ))}
            </div>

            {/* All tools dropdown */}
            <div className="relative" ref={desktopMenuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition flex items-center gap-0.5 ${
                  menuOpen ? "bg-zinc-100 dark:bg-zinc-800" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                } text-zinc-600 dark:text-zinc-400`}
              >
                Все <ChevronDown size={12} aria-hidden="true" />
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
                          <ToolIcon href={t.href} size={13} className="shrink-0" />
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
            <div className="relative" ref={mobileMenuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1.5 rounded-md text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Меню"
              >
                <Menu size={16} aria-hidden="true" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl p-2 max-h-[70vh] overflow-y-auto thin-scroll z-50">
                  <Link href="/" onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs mb-1 ${isActive("/") ? "bg-teal-500/10 text-teal-600 dark:text-teal-400" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                    <ToolIcon href="/" size={13} className="shrink-0" />
                    <span>Хаб</span>
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
                          <ToolIcon href={t.href} size={13} className="shrink-0" />
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
            AI
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
            <ThemeGlyph size={15} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </header>
      <HfTokenModal open={mlOpen} onClose={() => setMlOpen(false)} />
    </>
  );
}
