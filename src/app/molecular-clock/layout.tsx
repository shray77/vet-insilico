import type { Metadata } from "next";

// Уникальный <title> сегмента (аудит SW-13, П6): `Molecular Clock Calculator — VetInSilico Hub` вместо
// одного title на все 23 страницы (в закладках/истории браузера вкладки не различались).
export const metadata: Metadata = {
  title: "Molecular Clock Calculator — VetInSilico Hub",
};

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return children;
}
