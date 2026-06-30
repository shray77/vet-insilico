"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import HfTokenModal from "./HfTokenModal";
import { getHfToken } from "@/lib/hf";

const TOOLS = [
  { href: "/", label: "Хаб", icon: "🏠" },
  { href: "/drug-repurposing", label: "Docking", icon: "🧬" },
  { href: "/admet", label: "ADMET", icon: "💊" },
  { href: "/pkpd", label: "PK/PD", icon: "📊" },
  { href: "/dose-calculator", label: "Дозы", icon: "🧪" },
  { href: "/pdb-viewer", label: "3D Viewer", icon: "🔬" },
  { href: "/epitopes", label: "Эпитопы", icon: "💉" },
  { href: "/primer-designer", label: "Праймеры", icon: "🧬" },
  { href: "/crispr", label: "CRISPR", icon: "✂️" },
  { href: "/codon-optimizer", label: "Кодоны", icon: "🔤" },
  { href: "/ai-vet", label: "AI Вет", icon: "🩺" },
  { href: "/alignment", label: "Align", icon: "🔗" },
  { href: "/phylogeny", label: "Филогения", icon: "🌳" },
  { href: "/molecular-clock", label: "Часы", icon: "⏱️" },
  { href: "/amr", label: "AMR", icon: "🦠" },
  { href: "/restriction-map", label: "Рестрикция", icon: "✂️" },
  { href: "/plasmid-map", label: "Плазмида", icon: "🧫" },
  { href: "/elisa", label: "ELISA", icon: "📊" },
];

export default function HubHeader() {
  const pathname = usePathname();
  const [dark, setDark] = useState(true);
  const [mlOpen, setMlOpen] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try { localStorage.setItem("vis-theme", dark ? "dark" : "light"); } catch {}
  }, [dark]);

  useEffect(() => {
    setHasToken(!!getHfToken());
  }, [mlOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-3 h-12 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-1.5 font-bold text-base shrink-0">
            🧬 <span className="hidden sm:inline">VetInSilico <span className="text-teal-500">Hub</span></span>
          </Link>

          <nav className="flex gap-0.5 ml-auto overflow-x-auto thin-scroll items-center">
            {TOOLS.map((t) => (
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
            onClick={() => setDark(!dark)}
            className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shrink-0"
            aria-label="Тема"
          >
            {dark ? "☀️" : "🌙"}
          </button>
        </div>
      </header>
      <HfTokenModal open={mlOpen} onClose={() => setMlOpen(false)} />
    </>
  );
}
