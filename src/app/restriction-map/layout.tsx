import type { Metadata } from "next";

// Уникальный <title> сегмента (аудит SW-13, П6): `Restriction Map — VetInSilico Hub` вместо
// одного title на все 23 страницы (в закладках/истории браузера вкладки не различались).
export const metadata: Metadata = {
  title: "Restriction Map — VetInSilico Hub",
};

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return children;
}
