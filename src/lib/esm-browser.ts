/**
 * ESM-2 fill-mask ЛОКАЛЬНО в браузере (transformers.js + ONNX int8, WebAssembly).
 *
 * Зачем: облачный канал ESM-2 (vet-api → HF router) требует HF_TOKEN, а из РФ
 * workers.dev часто недостижим вовсе; публичной безключевой протеиновой LM
 * не существует. Веса (int8, ~34 МБ) скачиваются с huggingface.co (в РФ не
 * заблокирован) один раз и кешируются браузером (Cache API), инференс идёт
 * на устройстве — без серверов, токенов и лимитов.
 *
 * Модель: shrayyyy/esm2-t12-35M-onnx-js — конверсия facebook/esm2_t12_35M_UR50D
 * (Parity с HF Inference API проверен: top-5 на MKT<mask>YIAK совпадает до
 * 3-го знака; int8-квантование даёт отклонение < 0.005).
 *
 * WASM рантайм ort самохостится из /transformers-wasm/ (GitHub Pages, не
 * заблокирован) — сторонние CDN не нужны.
 */

const MODEL_ID = "shrayyyy/esm2-t12-35M-onnx-js";
/** Локальная копия модели: вендорена в public/ (GitHub Pages, same-origin) —
 *  качается с того же хоста, что и сайт, в РФ не блокируется. HF оставлен
 *  фолбэком: у части провайдеров cdn-lfs.huggingface.co рвётся на 34 МБ
 *  (NetworkError при пинге 1200-2500 мс). */
const LOCAL_MODEL_DIR = "esm2-t12-35m-onnx-js";
const TOP_K = 20;

export interface EsmPrediction {
  token_str: string;
  score: number;
  sequence: string;
}

type FillMaskPipe = (
  seq: string,
  opts?: { top_k?: number },
) => Promise<unknown>;

let pipePromise: Promise<FillMaskPipe> | null = null;
let loadPercent = 0;

async function loadPipe(): Promise<FillMaskPipe> {
  const { pipeline, env } = await import("@huggingface/transformers");
  const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");
  const wasm = env.backends?.onnx?.wasm;
  // ort-web (1.31-dev, сборка webgpu.bundle) в браузере запрашивает СТРОГО
  // ort-wasm-simd-threaded.asyncify.{mjs,wasm} (jsep-вариант этой сборкой не
  // используется вовсе). Раньше wasmPaths был префиксом-строкой + в public
  // лежали только .jsep-файлы → dynamic import 404 → "no available backend
  // found. ERR: [wasm] TypeError" → эпитопы падали во ВСЕХ браузерах
  // (Node-тесты этого не видели: там ort-node). Явно пинним оба файла —
  // та же форма {mjs, wasm}, что transformers.js использует по умолчанию.
  // GitHub Pages не отдаёт COOP/COEP → SAB нет → однопоточный режим явный
  // (модель 35M, fill-mask за ~100-300 мс и так).
  if (base && wasm) {
    wasm.wasmPaths = {
      mjs: `${base}/transformers-wasm/ort-wasm-simd-threaded.asyncify.mjs`,
      wasm: `${base}/transformers-wasm/ort-wasm-simd-threaded.asyncify.wasm`,
    };
    wasm.numThreads = 1;
    wasm.proxy = false;
  }
  const opts = {
    dtype: "q8" as const,
    progress_callback: (p: { status?: string; progress?: number }) => {
      if (p?.status === "progress" && typeof p.progress === "number") {
        loadPercent = Math.max(loadPercent, Math.round(p.progress));
      }
    },
  };
  // Приоритет — локальная копия с Pages (same-origin, РФ-доступен без сюрпризов).
  if (base) {
    try {
      env.allowLocalModels = true;
      env.useBrowserCache = true;
      const pipe = await pipeline("fill-mask", `${base}/models/${LOCAL_MODEL_DIR}`, opts);
      loadPercent = 100;
      return pipe as unknown as FillMaskPipe;
    } catch {
      loadPercent = 0;
    }
  }
  // Фолбэк: репо на huggingface.co (как раньше).
  env.allowLocalModels = false;
  const pipe = await pipeline("fill-mask", MODEL_ID, opts);
  loadPercent = 100;
  return pipe as unknown as FillMaskPipe;
}

function getPipe(): Promise<FillMaskPipe> {
  if (!pipePromise) pipePromise = loadPipe();
  return pipePromise;
}

/** Прогресс первой загрузки модели, 0..100; 100 = готова (или ещё не начинали). */
export function browserEsmLoadProgress(): number {
  return loadPercent;
}

/** Модель уже загружена и готова к инференсу? */
export function browserEsmReady(): boolean {
  return loadPercent === 100;
}

/** Первый вызов тянет ~34 МБ весов — можно прогреть заранее. */
export function warmBrowserEsm(): void {
  if (typeof window === "undefined") return;
  getPipe().catch(() => {
    // тихо: реальный вызов сообщит ошибку сам
    pipePromise = null;
    loadPercent = 0;
  });
}

/**
 * Fill-mask в формате HF Inference API: [{token_str, score, sequence}, ...].
 * Multi-mask вход даёт плоский top-K по первой маске (контракт normalizeEsm
 * в hf.ts это покрывает: там берётся первый ряд).
 */
export async function predictMaskedResidueBrowser(
  sequence: string,
  opts: { signal?: AbortSignal } = {},
): Promise<EsmPrediction[]> {
  opts.signal?.throwIfAborted();
  const pipe = await getPipe();
  const out = (await pipe(sequence, { top_k: TOP_K })) as unknown;
  const rows = (
    Array.isArray(out) && Array.isArray((out as unknown[])[0])
      ? (out[0] as unknown[])
      : (out as unknown[])
  ) as Record<string, unknown>[];
  opts.signal?.throwIfAborted();
  return rows.map((d) => ({
    token_str: String(d.token_str ?? ""),
    score: Number(d.score ?? 0),
    sequence: String(d.sequence ?? ""),
  }));
}
