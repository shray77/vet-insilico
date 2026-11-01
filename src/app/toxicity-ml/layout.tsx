import type { Metadata } from "next";

// Уникальный <title> сегмента (аудит SW-13, П6): `ML Toxicity — VetInSilico Hub` вместо
// одного title на все 23 страницы (в закладках/истории браузера вкладки не различались).
export const metadata: Metadata = {
  title: "ML Toxicity — VetInSilico Hub",
};

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return children;
}
