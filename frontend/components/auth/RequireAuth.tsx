"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import { useAuthStore } from "@/lib/store";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (hydrated && !user) router.replace("/login");
  }, [hydrated, user, router]);

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center bg-bg px-4 py-6 text-text">
        <div className="flex w-full max-w-sm flex-col items-center rounded-lg border border-border bg-card p-6 text-center shadow-lg sm:p-8">
          <Image src="/logo.png" alt="Dreyze AI" width={64} height={64} className="mb-5 h-14 w-14 object-contain" priority />
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
          <p className="text-sm font-medium">{hydrated ? "Переходим ко входу..." : "Загружаем аккаунт..."}</p>
          <p className="mt-2 text-xs leading-5 text-text-secondary">
            Если экран не меняется, обновите страницу или войдите заново.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
