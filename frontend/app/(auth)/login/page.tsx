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

        <div className="mt-2 border-t border-border pt-4 text-center">
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
