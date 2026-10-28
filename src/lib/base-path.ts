/**
 * Базовый путь статического экспорта: прод — /vet-insilico, dev (next dev) — корень.
 * Единственный источник — next.config.ts (basePath + env.NEXT_PUBLIC_BASE_PATH,
 * как в boltz.ts/chembl.ts/esm-browser.ts); fallback-тернарник повторяет
 * layout-паттерн на случай, если инлайн env не долетел (значения совпадают).
 * Ссылки вида `${BASE_PATH}/…` работают и в dev, и на GitHub Pages.
 */
export const BASE_PATH =
  process.env.NEXT_PUBLIC_BASE_PATH ??
  (process.env.NODE_ENV === "production" ? "/vet-insilico" : "");
