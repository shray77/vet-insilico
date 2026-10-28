/**
 * Custom 404 page — friendlier than Next.js default.
 */
import { BASE_PATH } from "@/lib/base-path";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 text-zinc-700">
      <div className="max-w-md w-full space-y-4 text-center">
        <div className="font-mono text-6xl font-bold tracking-widest text-zinc-400">DNA</div>
        <h1 className="text-3xl font-bold">404</h1>
        <p className="text-sm text-zinc-400">
          Страница не найдена. Возможно, ссылка устарела или была введена с ошибкой.
        </p>
        <a
          href={`${BASE_PATH}/`}
          className="inline-block px-4 py-2 rounded-md bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
        >
          На главную
        </a>
      </div>
    </div>
  );
}
