import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VetInSilico — Скрининг препаратов",
  description: "In silico drug repurposing для ветеринарных патогенов. Zero-cost, в браузере.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
