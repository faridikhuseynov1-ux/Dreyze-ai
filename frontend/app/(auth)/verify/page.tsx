"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiRequest, ApiError } from "@/lib/api";
import { useAuthStore, useToastStore } from "@/lib/store";
import type { User } from "@/lib/types";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const pushToast = useToastStore((s) => s.push);

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { access_token } = await apiRequest<{ access_token: string }>("/auth/verify", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ email, code }),
      });
      setAccessToken(access_token);
      const user = await apiRequest<User>("/users/me");
      setUser(user);
      pushToast("Аккаунт создан!", "success");
      router.replace("/chat");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Неверный код");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError("");
    try {
      await apiRequest("/auth/resend-code", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ email }),
      });
      pushToast("Код отправлен повторно", "success");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось отправить код");
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthLayout title="Подтвердите email" subtitle={`Мы отправили 6-значный код на ${email || "вашу почту"}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Код подтверждения"
          inputMode="numeric"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="text-center text-2xl tracking-[0.5em]"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" loading={loading} className="mt-2 w-full">
          Подтвердить
        </Button>

        <Button type="button" variant="ghost" loading={resending} onClick={handleResend} className="w-full">
          Отправить код снова
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
