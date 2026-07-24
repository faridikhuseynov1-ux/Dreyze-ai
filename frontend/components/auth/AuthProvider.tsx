"use client";

import { useEffect } from "react";
import { apiRequest, refreshAccessToken } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import type { User } from "@/lib/types";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const token = await refreshAccessToken();
      if (cancelled) return;
      if (token) {
        try {
          const user = await apiRequest<User>("/users/me");
          if (!cancelled) setUser(user);
        } catch {
          /* ignore */
        }
      }
      if (!cancelled) setHydrated(true);
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [setUser, setHydrated]);

  return <>{children}</>;
}
