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
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('vis-theme');if(t==='light')document.documentElement.classList.remove('dark');}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
