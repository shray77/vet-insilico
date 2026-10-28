"use client";

import { BASE_PATH } from "@/lib/base-path";

/**
 * Global error boundary — catches unhandled exceptions in any route segment.
 * Without this, a single bad `.slice()` or undefined access brings down
 * the entire app with a white screen.
 *
 * Next.js automatically wraps each route segment in this boundary.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 text-zinc-700">
      <div className="max-w-md w-full space-y-4 text-center">
        <div className="font-mono text-5xl font-bold tracking-widest text-zinc-400">DNA</div>
        <h2 className="text-xl font-bold">Что-то пошло не так</h2>
        <p className="text-sm text-zinc-400">
          Произошла ошибка при обработке вашего запроса. Это может быть из-за
          невалидных входных данных или временной проблемы с API.
        </p>
        {error.message && (
          <details className="text-left text-xs bg-zinc-100 rounded-md p-3">
            <summary className="cursor-pointer text-zinc-400">
              Технические детали
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-all">
              {error.message}
              {error.digest && `\nDigest: ${error.digest}`}
            </pre>
          </details>
        )}
        <div className="flex gap-2 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-md bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            Попробовать снова
          </button>
          <a
            href={`${BASE_PATH}/`}
            className="px-4 py-2 rounded-md border border-zinc-200 text-sm font-medium hover:bg-zinc-100 transition-colors"
          >
            На главную
          </a>
        </div>
      </div>
    </div>
  );
}
