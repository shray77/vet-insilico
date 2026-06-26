"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import HfTokenModal from "./HfTokenModal";
import { getHfToken } from "@/lib/hf";

const TOOLS = [
  { href: "/", label: "Хаб", icon: "🏠" },
  { href: "/drug-repurposing", label: "Drug Repurposing", icon: "🧬" },
  { href: "/admet", label: "ADMET", icon: "💊" },
  { href: "/epitopes", label: "Эпитопы", icon: "💉" },
  { href: "/primer-designer", label: "Праймеры", icon: "🔬" },
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
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            🧬 <span className="hidden sm:inline">VetInSilico <span className="text-teal-500">Hub</span></span>
          </Link>

          <nav className="flex gap-1 ml-auto overflow-x-auto thin-scroll">
            {TOOLS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  isActive(t.href)
                    ? "bg-teal-600 text-white"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <span className="mr-1">{t.icon}</span>
                <span className="hidden md:inline">{t.label}</span>
              </Link>
            ))}
          </nav>

          <button
            onClick={() => setMlOpen(true)}
            className={`p-1.5 rounded-lg transition relative ${hasToken ? "text-green-500" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
            aria-label="ML настройки"
            title={hasToken ? "ML: настроен" : "ML: токен не задан"}
          >
            🤖
            {hasToken && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setDark(!dark)}
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
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
