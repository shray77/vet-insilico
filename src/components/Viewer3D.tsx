"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 3D protein-ligand viewer using 3Dmol.js (loaded via CDN).
 * Loads PDB structure by ID from RCSB and renders in WebGL.
 *
 * Style options: cartoon / stick / sphere / surface / lines
 *
 * Грабли (Task 183, аудит S1) — больше не воспроизводятся:
 *   1) React-оверлеи (idle/loading/error) жили ВНУТРИ контейнера, которым
 *      владеет 3Dmol; ручная чистка контейнера вычищала React-ноды → при
 *      смене статуса React получал NotFoundError removeChild → error boundary
 *      ронял ВСЮ страницу. Теперь контейнер 3Dmol — отдельный пустой div,
 *      React в него детей не рендерит; оверлеи — sibling-слой поверх (z-10).
 *   2) Гвард «status === idle» в эффекте без status в deps: кнопка
 *      «Загрузить 3D структуру» меняла статус, но эффект не перезапускался —
 *      вечный спиннер, ноль сетевых запросов. Теперь загрузка стартует
 *      напрямую из onClick (и из эффекта смены pdbId/pdbString после
 *      первого явного клика), смена стиля — отдельным эффектом без
 *      перезагрузки. Гонки погашаются loadTokenRef.
 */
declare global {
  interface Window {
    $3Dmol?: any;
  }
}

const CDN_URL = "https://3Dmol.org/build/3Dmol-min.js";

let loadPromise: Promise<void> | null = null;

function load3Dmol(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject();
  if (window.$3Dmol) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CDN_URL;
    script.async = true;
    script.onload = () => {
      if (window.$3Dmol) resolve();
      else reject(new Error("$3Dmol not loaded"));
    };
    script.onerror = () => reject(new Error("CDN failed"));
    document.head.appendChild(script);
  });
  return loadPromise;
}

export type ViewerStyle = "cartoon" | "stick" | "sphere" | "surface" | "lines";

export interface Viewer3DProps {
  pdbId: string;
  /** Direct PDB string (bypasses RCSB fetch — used by ESMFold). */
  pdbString?: string;
  /** Optional ligand name to highlight. */
  highlightLigand?: string;
  /** Initial style. */
  style?: ViewerStyle;
  /** Height in pixels. */
  height?: number;
  /** Caption below viewer. */
  caption?: string;
}

export default function Viewer3D({
  pdbId,
  pdbString,
  highlightLigand,
  style = "cartoon",
  height = 400,
  caption,
}: Viewer3DProps) {
  // Контейнер, которым владеет ТОЛЬКО 3Dmol — React сюда детей не рендерит.
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [currentStyle, setCurrentStyle] = useState<ViewerStyle>(style);

  // PDB data cache — module-level so switching styles doesn't re-fetch
  const pdbCacheRef = useRef<Map<string, string>>(new Map());
  /** Источник, загруженный во вьюер: "id:XXXX" | "str:<len>:<prefix>". */
  const loadedSourceRef = useRef<string | null>(null);
  /** Токен гонок: инкремент на каждую загрузку — поздние ответы отбрасываются. */
  const loadTokenRef = useRef(0);

  const sourceKey = pdbString
    ? `str:${pdbString.length}:${pdbString.slice(0, 64)}`
    : `id:${pdbId.toUpperCase()}`;

  function applyStyle(viewer: any, $3Dmol: any, style: ViewerStyle, ligand?: string) {
    const colorSchemes: Record<ViewerStyle, any> = {
      cartoon: { cartoon: { color: "spectrum" } },
      stick: { stick: { colorscheme: "orangeCarbon" } },
      sphere: { sphere: { scale: 0.3, colorscheme: "greenCarbon" } },
      surface: { surface: { opacity: 0.85, colorscheme: "ssPyMOL" } },
      lines: { line: { linewidth: 1, colorscheme: "cyanCarbon" } },
    };
    viewer.setStyle({}, colorSchemes[style] || colorSchemes.cartoon);

    // Highlight hetero atoms (ligands, cofactors, water)
    viewer.setStyle(
      { hetflag: true },
      { stick: { radius: 0.2, colorscheme: "magentaCarbon" } },
    );

    // If specific ligand given, show it bigger
    if (ligand) {
      viewer.setStyle(
        { resn: ligand.toUpperCase() },
        { stick: { radius: 0.35, colorscheme: "yellowCarbon" }, sphere: { scale: 0.4 } },
      );
    }

    // Show metal ions if any
    viewer.setStyle(
      { resn: ["MG", "CA", "ZN", "FE", "MN", "CU"] },
      { sphere: { scale: 0.5, color: "0xff8800" } },
    );
  }

  // Загрузка структуры. Стартует из onClick кнопки и из эффекта смены
  // источника (после первой явной загрузки). Гонки гасит loadTokenRef.
  const beginLoad = () => {
    const token = ++loadTokenRef.current;
    setStatus("loading");
    setErrorMsg("");

    load3Dmol()
      .then(() => {
        if (token !== loadTokenRef.current) return;
        if (!containerRef.current || !window.$3Dmol) return;
        const $3Dmol = window.$3Dmol;

        // Чистим предыдущий viewer. В контейнере только ноды 3Dmol —
        // React-оверлеи живут в sibling-слое, их не трогаем.
        if (viewerRef.current) {
          try { viewerRef.current.clear(); } catch {}
          viewerRef.current = null;
        }
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }

        const config = { backgroundColor: "0x0a0a0a", antialias: true };
        const viewer = $3Dmol.createViewer(containerRef.current, config);
        viewerRef.current = viewer;

        // Use pdbString directly if provided (ESMFold), else fetch from RCSB
        const cached = pdbString ? undefined : pdbCacheRef.current.get(pdbId.toUpperCase());
        const fetchPromise = pdbString
          ? Promise.resolve(pdbString)
          : cached
            ? Promise.resolve(cached)
            : fetch(`https://files.rcsb.org/download/${pdbId.toUpperCase()}.pdb`).then((r) => {
                if (!r.ok) throw new Error(`PDB ${pdbId} не найден`);
                return r.text();
              });

        return fetchPromise
          .then((pdbData) => {
            if (token !== loadTokenRef.current) return;
            if (!viewerRef.current) return;
            // Cache the PDB data
            if (!pdbString) pdbCacheRef.current.set(pdbId.toUpperCase(), pdbData);
            loadedSourceRef.current = sourceKey;

            viewer.addModel(pdbData, "pdb");
            applyStyle(viewer, $3Dmol, currentStyle, highlightLigand);
            viewer.zoomTo();
            viewer.zoom(1.5, 800);
            viewer.setSlab(0.5, 0.5);
            viewer.spin("y", 0.5);
            viewer.render();
            setStatus("ready");
          });
      })
      .catch((err) => {
        if (token !== loadTokenRef.current) return;
        setErrorMsg(err?.message || "Ошибка загрузки структуры");
        setStatus("error");
      });
  };

  // latest-ref: эффект смены источника всегда зовёт актуальную beginLoad
  const beginLoadRef = useRef(beginLoad);
  beginLoadRef.current = beginLoad;

  // Смена источника (pdbId / pdbString): авто-перезагрузка ПОСЛЕ первого
  // явного клика — до него не грузим ~200KB без спроса. Повторная загрузка
  // того же источника не перезапускается (рестайл — эффект ниже).
  useEffect(() => {
    if (loadedSourceRef.current === null) return;
    if (loadedSourceRef.current === sourceKey) return;
    beginLoadRef.current();
  }, [sourceKey]);

  // Смена стиля/лиганда: только ре-рендер вьюера, без перезагрузки данных.
  useEffect(() => {
    if (status !== "ready") return;
    if (!viewerRef.current || !window.$3Dmol) return;
    viewerRef.current.setStyle({}, {});
    applyStyle(viewerRef.current, window.$3Dmol, currentStyle, highlightLigand);
    viewerRef.current.render();
  }, [currentStyle, highlightLigand, status]);

  // Unmount: погасить висящие загрузки и прибрать viewer.
  useEffect(() => {
    return () => {
      loadTokenRef.current++;
      if (viewerRef.current) {
        try { viewerRef.current.clear(); } catch {}
        viewerRef.current = null;
      }
    };
  }, []);

  function changeStyle(newStyle: ViewerStyle) {
    setCurrentStyle(newStyle);
  }

  const styleButtons: { label: string; val: ViewerStyle }[] = [
    { label: "Картинки", val: "cartoon" },
    { label: "Палочки", val: "stick" },
    { label: "Сферы", val: "sphere" },
    { label: "Поверхность", val: "surface" },
    { label: "Линии", val: "lines" },
  ];

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-xs text-zinc-400">Стиль:</span>
        {status !== "idle" && styleButtons.map((b) => (
          <button
            key={b.val}
            onClick={() => changeStyle(b.val)}
            className={`px-2 py-1 rounded text-xs font-medium transition ${
              currentStyle === b.val
                ? "bg-teal-600 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
            }`}
          >
            {b.label}
          </button>
        ))}
        <a
          href={`https://www.rcsb.org/3d-view/${pdbId.toUpperCase()}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-blue-500 hover:underline"
        >
          RCSB ↗
        </a>
      </div>

      <div
        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-900 relative viewer-3d"
        style={{ height: `${height}px` }}
      >
        {/* Контейнер 3Dmol — единственный владелец его детей */}
        <div ref={containerRef} className="absolute inset-0" />

        {/* React-оверлеи — sibling-слой ПОВЕРХ контейнера 3Dmol (Task 183):
            3Dmol никогда их не трогает, React никогда не сражается за DOM. */}
        {status === "idle" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-zinc-400 text-sm">
            <div className="text-center">
              <button
                onClick={beginLoad}
                className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition"
              >
                Загрузить 3D структуру {pdbId.toUpperCase()}
              </button>
              <div className="text-xs mt-2 text-zinc-500">
                Загрузит ~200KB PDB + 3Dmol.js (WebGL)
              </div>
            </div>
          </div>
        )}
        {status === "loading" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-zinc-400 text-sm">
            <div className="text-center">
              <span className="spinner inline-block mb-2"></span>
              <div>Загрузка {pdbId.toUpperCase()} с RCSB PDB...</div>
              <div className="text-xs mt-1 text-zinc-500">3Dmol.js + WebGL</div>
            </div>
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-red-400 text-sm p-4">
            <div className="text-center">
              <div className="text-3xl mb-2">⚠</div>
              <div className="font-medium mb-1">Не удалось загрузить 3D структуру</div>
              <div className="text-xs text-zinc-500">{errorMsg}</div>
              <button
                onClick={beginLoad}
                className="mt-3 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
              >
                Повторить
              </button>
              <div>
                <a
                  href={`https://www.rcsb.org/structure/${pdbId.toUpperCase()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 text-xs text-blue-400 hover:underline"
                >
                  Открыть на RCSB PDB ↗
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {caption && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 text-center">
          {caption}
        </p>
      )}
    </div>
  );
}
