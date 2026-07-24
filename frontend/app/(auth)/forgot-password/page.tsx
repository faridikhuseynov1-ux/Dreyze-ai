"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiRequest, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiRequest("/auth/forgot-password", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Что-то пошло не так");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout title="Проверьте почту" subtitle={`Если аккаунт с ${email} существует, мы отправили ссылку для сброса пароля`}>
        <Link href="/login">
          <Button variant="secondary" className="w-full">
            Вернуться ко входу
          </Button>
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Восстановление пароля" subtitle="Введите email, привязанный к аккаунту">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" loading={loading} className="mt-2 w-full">
          Отправить ссылку
        </Button>

        <p className="text-center text-sm text-text-secondary">
          <Link href="/login" className="text-text hover:underline">
            Вернуться ко входу
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
