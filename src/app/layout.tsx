import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VetInSilico Hub — In silico tools for veterinary pathogens",
  description:
    "Бесплатные in silico инструменты для ветеринарной медицины: drug repurposing, ADMET, эпитопы вакцин, дизайн праймеров. Всё работает в браузере.",
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
