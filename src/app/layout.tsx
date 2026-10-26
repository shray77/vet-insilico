import type { Metadata, Viewport } from "next";
import "./globals.css";

const basePath = process.env.NODE_ENV === "production" ? "/vet-insilico" : "";

export const metadata: Metadata = {
  title: "VetInSilico Hub — In silico tools for veterinary pathogens",
  description:
    "In silico инструменты для ветеринарии: drug repurposing, ADMET, эпитопы вакцин, дизайн праймеров, alignment, филогения. Гибрид: эвристики + FOSS ML через HuggingFace.",
  manifest: `${basePath}/manifest.webmanifest`,
  icons: {
    icon: [
      { url: `${basePath}/favicon.png`, sizes: "32x32", type: "image/png" },
      { url: `${basePath}/icon.svg`, type: "image/svg+xml" },
    ],
    apple: `${basePath}/icon-192.png`,
  },
  applicationName: "VetInSilico Hub",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VetInSilico",
  },
  openGraph: {
    title: "VetInSilico Hub",
    description: "Open-source in silico toolkit for veterinary pathogen research.",
    type: "website",
    locale: "ru_RU",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF9F5" },
    { media: "(prefers-color-scheme: dark)", color: "#211E19" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* Шрифты ДС «Научная периодика»: Instrument Serif + Inter + IBM Plex Mono.
            Офлайн — деградация на системные (зад Declared в vet-ds.css). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        {/* Тема ДС A: светлая «бумага» — дефолт; data-theme="dark" — «вечерний номер».
            Ставится до первой отрисовки, FOUC нет. Сохранённый выбор > системная. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('vis-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}`,
          }}
        />
      </head>
      <body>
        {children}
        {/* v2.2-паттерн: левый редакционный колофон + хаб экосистемы пилюлями */}
        <footer className="ds-footer ds-footer--meta">
          <div className="max-w-7xl mx-auto px-4 min-w-0 w-full">
            <nav className="ds-hub" aria-label="Экосистема">
              <a href="https://shray77.github.io/">Визитка</a>
              <a href="https://shray77.github.io/vettools/">VetTools</a>
              <a href="https://shray77.github.io/vet-heatmap/">ВетКарта</a>
              <a href="https://shray77.github.io/vetflu-site/">VetFlu</a>
              <a href="https://shray77.github.io/vetdigest-site/">Дайджест науки</a>
            </nav>
            <span className="ds-footer__legal">
              VetInSilico — 26 in silico-инструментов для ветеринарной патологии · информационный
              сервис, не ветеринарная консультация ·{" "}
              <a href={`${basePath}/terms/`}>условия использования</a> ·{" "}
              <a href="https://shray77.github.io/terms.html">условия экосистемы</a>
            </span>
            <span>
              гибрид эвристик и FOSS ML (ESM-2 в браузере, HuggingFace) · данные и вычисления
              локальны, без аккаунтов ·{" "}
              <a href="https://github.com/shray77/vet-insilico">репозиторий</a>
            </span>
            <span className="ds-footer__legal">
              дизайн —{" "}
              <a href="https://github.com/shray77/vet-ds">vet-ds v2.3.1</a>, голос A «Научная
              периодика» · бирюзовый характер поверх ядра
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
