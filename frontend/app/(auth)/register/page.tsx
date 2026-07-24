"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiRequest, ApiError } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }
    if (password.length < 8) {
      setError("Пароль должен содержать минимум 8 символов");
      return;
    }

    setLoading(true);
    try {
      await apiRequest("/auth/register", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ name, email, password, confirm_password: confirmPassword }),
      });
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось создать аккаунт");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Создать аккаунт" subtitle="Мы отправим код подтверждения на вашу почту">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Имя" required value={name} onChange={(e) => setName(e.target.value)} />
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
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label="Повторить пароль"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" loading={loading} className="mt-2 w-full">
          Создать аккаунт
        </Button>

        <p className="text-center text-sm text-text-secondary">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="text-text hover:underline">
            Войти
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
