"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 3D protein-ligand viewer using 3Dmol.js (loaded via CDN).
 * Loads PDB structure by ID from RCSB and renders in WebGL.
 *
 * Style options: cartoon / stick / sphere / surface
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
  /** Optional ligand name to highlight (e.g. " inhibitors" or specific ligand ID). */
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
  highlightLigand,
  style = "cartoon",
  height = 400,
  caption,
}: Viewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [currentStyle, setCurrentStyle] = useState<ViewerStyle>(style);

  // PDB data cache — module-level so switching styles doesn't re-fetch
  const pdbCacheRef = useRef<Map<string, string>>(new Map());
  const pdbDataRef = useRef<string | null>(null);

  // (Re)load when PDB ID changes (fetch) OR when style changes (re-render only)
  useEffect(() => {
    if (status === "idle") return; // Don't auto-load

    // If we already have PDB data cached for this ID, just re-apply style
    const cached = pdbCacheRef.current.get(pdbId.toUpperCase());
    if (cached && pdbDataRef.current === cached) {
      // Style-only change — re-render without re-fetching
      if (viewerRef.current && window.$3Dmol) {
        viewerRef.current.setStyle({}, {});
        applyStyle(viewerRef.current, window.$3Dmol, currentStyle, highlightLigand);
        viewerRef.current.render();
      }
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setErrorMsg("");

    load3Dmol()
      .then(() => {
        if (cancelled || !containerRef.current || !window.$3Dmol) return;

        const $3Dmol = window.$3Dmol;

        // Clean previous viewer
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

        // Use cached PDB data if available
        const pdbUrl = `https://files.rcsb.org/download/${pdbId.toUpperCase()}.pdb`;
        const fetchPromise = cached
          ? Promise.resolve(cached)
          : fetch(pdbUrl).then((r) => {
              if (!r.ok) throw new Error(`PDB ${pdbId} не найден`);
              return r.text();
            });

        fetchPromise
          .then((pdbData) => {
            if (cancelled || !viewerRef.current) return;
            // Cache the PDB data
            pdbCacheRef.current.set(pdbId.toUpperCase(), pdbData);
            pdbDataRef.current = pdbData;

            viewer.addModel(pdbData, "pdb");

            // Apply style based on selection
            applyStyle(viewer, $3Dmol, currentStyle, highlightLigand);

            viewer.zoomTo();
            viewer.zoom(1.5, 800);
            viewer.setSlab(0.5, 0.5);
            viewer.spin("y", 0.5);
            viewer.render();
            setStatus("ready");
          })
          .catch((err) => {
            if (cancelled) return;
            setErrorMsg(err.message || "Ошибка загрузки структуры");
            setStatus("error");
          });
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMsg("Не удалось загрузить 3Dmol.js (нет интернета?)");
        setStatus("error");
      });

    return () => {
      cancelled = true;
      if (viewerRef.current) {
        try { viewerRef.current.clear(); } catch {}
        viewerRef.current = null;
      }
    };
    // deps intentionally limited — style change should re-render without re-fetch
  }, [pdbId, currentStyle, highlightLigand]);

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

  function changeStyle(newStyle: ViewerStyle) {
    setCurrentStyle(newStyle);
  }

  const styleButtons: { label: string; val: ViewerStyle; icon: string }[] = [
    { label: "Картинки", val: "cartoon", icon: "🧬" },
    { label: "Палочки", val: "stick", icon: "📏" },
    { label: "Сферы", val: "sphere", icon: "⚪" },
    { label: "Поверхность", val: "surface", icon: "🌐" },
    { label: "Линии", val: "lines", icon: "📐" },
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
            {b.icon} {b.label}
          </button>
        ))}
        <a
          href={`https://www.rcsb.org/3d-view/${pdbId.toUpperCase()}`}
          target="_blank"
          rel="noopener"
          className="ml-auto text-xs text-blue-500 hover:underline"
        >
          RCSB ↗
        </a>
      </div>

      <div
        ref={containerRef}
        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-900 relative"
        style={{ height: `${height}px` }}
      >
        {status === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-sm">
            <div className="text-center">
              <button
                onClick={() => setStatus("loading")}
                className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition"
              >
                🧬 Загрузить 3D структуру {pdbId.toUpperCase()}
              </button>
              <div className="text-xs mt-2 text-zinc-500">
                Загрузит ~200KB PDB + 3Dmol.js (WebGL)
              </div>
            </div>
          </div>
        )}
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-sm">
            <div className="text-center">
              <span className="spinner inline-block mb-2"></span>
              <div>Загрузка {pdbId.toUpperCase()} с RCSB PDB...</div>
              <div className="text-xs mt-1 text-zinc-500">3Dmol.js + WebGL</div>
            </div>
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm p-4">
            <div className="text-center">
              <div className="text-3xl mb-2">⚠️</div>
              <div className="font-medium mb-1">Не удалось загрузить 3D структуру</div>
              <div className="text-xs text-zinc-500">{errorMsg}</div>
              <a
                href={`https://www.rcsb.org/structure/${pdbId.toUpperCase()}`}
                target="_blank"
                rel="noopener"
                className="inline-block mt-3 text-xs text-blue-400 hover:underline"
              >
                Открыть на RCSB PDB ↗
              </a>
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
