"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiRequest, ApiError } from "@/lib/api";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }
    if (!token) {
      setError("Недействительная ссылка");
      return;
    }

    setLoading(true);
    try {
      await apiRequest("/auth/reset-password", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ token, new_password: newPassword, confirm_password: confirmPassword }),
      });
      setSuccess(true);
      setTimeout(() => router.replace("/login"), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ссылка недействительна или устарела");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <AuthLayout title="Пароль изменён" subtitle="Сейчас вы будете перенаправлены на страницу входа">
        <Link href="/login">
          <Button variant="secondary" className="w-full">
            Войти сейчас
          </Button>
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Новый пароль" subtitle="Придумайте новый пароль для вашего аккаунта">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Новый пароль"
          type="password"
          autoComplete="new-password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
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
          Сохранить пароль
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
