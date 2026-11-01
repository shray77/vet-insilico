import type { Metadata } from "next";

// Уникальный <title> сегмента (аудит SW-13, П6): `Plasmid Map Designer — VetInSilico Hub` вместо
// одного title на все 23 страницы (в закладках/истории браузера вкладки не различались).
export const metadata: Metadata = {
  title: "Plasmid Map Designer — VetInSilico Hub",
};

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return children;
}
