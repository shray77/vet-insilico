"use client";

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
      <div className="max-w-md w-full space-y-4 text-center">
        <div className="text-5xl">🧬</div>
        <h2 className="text-xl font-bold">Что-то пошло не так</h2>
        <p className="text-sm text-muted-foreground">
          Произошла ошибка при обработке вашего запроса. Это может быть из-за
          невалидных входных данных или временной проблемы с API.
        </p>
        {error.message && (
          <details className="text-left text-xs bg-muted/50 rounded-md p-3">
            <summary className="cursor-pointer text-muted-foreground">
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
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Попробовать снова
          </button>
          <a
            href="/vet-insilico/"
            className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-accent transition-colors"
          >
            На главную
          </a>
        </div>
      </div>
    </div>
  );
}
