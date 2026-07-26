"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiRequest, ApiError } from "@/lib/api";
import { useAuthStore, useToastStore } from "@/lib/store";
import type { User } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const pushToast = useToastStore((s) => s.push);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { access_token } = await apiRequest<{ access_token: string }>("/auth/login", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ email, password }),
      });
      setAccessToken(access_token);
      const user = await apiRequest<User>("/users/me");
      setUser(user);
      setHydrated(true);
      pushToast(`С возвращением, ${user.name}!`, "success");
      router.replace("/chat");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось войти");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Вход в Dreyze AI" subtitle="Продолжите работу со своим ассистентом">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Пароль"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" loading={loading} className="mt-2 w-full">
          Войти
        </Button>

        <div className="flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="text-text-secondary hover:text-text transition-colors">
            Забыли пароль?
          </Link>
        </div>

        <div className="mt-2 border-t border-border pt-4 flex flex-col gap-3">
          <a href={`${process.env.NEXT_PUBLIC_API_URL}/auth/google/login`}>
            <Button type="button" variant="secondary" className="w-full flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Войти через Google
            </Button>
          </a>
          <Link href="/register">
            <Button type="button" variant="secondary" className="w-full">
              Зарегистрироваться
            </Button>
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
