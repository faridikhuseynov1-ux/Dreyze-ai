"use client";

import { useEffect } from "react";
import { apiRequest, refreshAccessToken } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import type { User } from "@/lib/types";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const clearAuth = useAuthStore((s) => s.clear);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      setHydrated(false);
      if (accessToken) {
        try {
          const user = await apiRequest<User>("/users/me");
          if (!cancelled) setUser(user);
          if (!cancelled) setHydrated(true);
          return;
        } catch {
          /* try refresh token below */
        }
      }

      const token = await refreshAccessToken();
      if (cancelled) return;
      if (token) {
        try {
          const user = await apiRequest<User>("/users/me");
          if (!cancelled) setUser(user);
        } catch {
          if (!cancelled) clearAuth();
        }
      } else if (!cancelled) {
        clearAuth();
      }
      if (!cancelled) setHydrated(true);
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [accessToken, setUser, setHydrated, clearAuth]);

  return <>{children}</>;
}
