"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest, refreshAccessToken } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import type { User } from "@/lib/types";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function completeLogin() {
      try {
        const token = await refreshAccessToken();
        if (!token) {
          throw new Error("Не удалось получить сессию Google");
        }

        const user = await apiRequest<User>("/users/me");
        if (cancelled) return;

        setUser(user);
        setHydrated(true);
        router.replace("/chat");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Ошибка входа через Google");
        setHydrated(true);
      }
    }

    completeLogin();
    return () => {
      cancelled = true;
    };
  }, [router, setHydrated, setUser]);

  return (
    <div className="flex min-h-svh w-full items-center justify-center overflow-y-auto bg-bg px-4 py-6 text-text sm:py-10">
      <div className="flex w-full max-w-sm flex-col items-center rounded-lg border border-border bg-card p-6 text-center shadow-lg sm:p-8">
        <Image src="/logo.png" alt="Dreyze AI" width={64} height={64} className="mb-5 h-14 w-14 object-contain" priority />
        {!error && <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />}
        <p className="text-sm font-medium">{error || "Завершаем вход через Google..."}</p>
        {error && (
          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="mt-5 rounded-lg border border-border px-4 py-2 text-sm text-text transition-colors hover:bg-card-hover"
          >
            Вернуться ко входу
          </button>
        )}
      </div>
    </div>
  );
}
