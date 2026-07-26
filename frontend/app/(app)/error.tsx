"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-bg p-6 text-center text-text">
      <h2 className="text-lg font-semibold">Что-то пошло не так</h2>
      <pre className="max-h-64 max-w-full overflow-auto rounded-xl border border-border bg-card p-4 text-left text-xs text-red-400">
        {error?.message || "Неизвестная ошибка"}
        {error?.stack ? "\n\n" + error.stack : ""}
      </pre>
      <button
        onClick={reset}
        className="rounded-xl bg-text px-5 py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-90"
      >
        Попробовать снова
      </button>
    </div>
  );
}
