/**
 * Custom 404 page — friendlier than Next.js default.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
      <div className="max-w-md w-full space-y-4 text-center">
        <div className="text-6xl">🧬</div>
        <h1 className="text-3xl font-bold">404</h1>
        <p className="text-sm text-muted-foreground">
          Страница не найдена. Возможно, ссылка устарела или была введена с ошибкой.
        </p>
        <a
          href="/vet-insilico/"
          className="inline-block px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          На главную
        </a>
      </div>
    </div>
  );
}
