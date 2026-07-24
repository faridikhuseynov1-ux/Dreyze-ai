"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiRequest, ApiError } from "@/lib/api";
import { useAuthStore, usePreferencesStore, useToastStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Instructions, User } from "@/lib/types";
import { initialsFromName } from "@/lib/utils";

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clear);
  const pushToast = useToastStore((s) => s.push);
  const compactMode = usePreferencesStore((s) => s.compactMode);
  const setCompactMode = usePreferencesStore((s) => s.setCompactMode);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [aboutMe, setAboutMe] = useState("");
  const [responseStyle, setResponseStyle] = useState("");
  const [savingInstructions, setSavingInstructions] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    apiRequest<Instructions>("/users/me/instructions")
      .then((data) => {
        setAboutMe(data.instructions_about_me);
        setResponseStyle(data.instructions_response_style);
      })
      .catch(() => {});
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await apiRequest<User>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ name, email }),
      });
      setUser(updated);
      pushToast("Профиль обновлён", "success");
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : "Не удалось сохранить профиль", "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingPassword(true);
    try {
      await apiRequest("/users/me/password", {
        method: "POST",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      pushToast("Пароль изменён", "success");
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : "Не удалось изменить пароль", "error");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSaveInstructions() {
    setSavingInstructions(true);
    try {
      await apiRequest("/users/me/instructions", {
        method: "PUT",
        body: JSON.stringify({ instructions_about_me: aboutMe, instructions_response_style: responseStyle }),
      });
      pushToast("Инструкции сохранены", "success");
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : "Не удалось сохранить инструкции", "error");
    } finally {
      setSavingInstructions(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const updated = await apiRequest<User>("/users/me/avatar", { method: "POST", body: formData });
      setUser(updated);
      pushToast("Аватар обновлён", "success");
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : "Не удалось загрузить аватар", "error");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  async function handleExport() {
    try {
      const data = await apiRequest<unknown>("/users/me/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "chat_history_export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : "Не удалось экспортировать историю", "error");
    }
  }

  async function handleDeleteHistory() {
    if (!confirm("Удалить всю историю чатов? Это действие необратимо.")) return;
    try {
      await apiRequest("/users/me/history", { method: "DELETE" });
      pushToast("История удалена", "success");
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : "Не удалось удалить историю", "error");
    }
  }

  async function handleDeleteMemory() {
    if (!confirm("Удалить всю память ИИ о вас? Это действие необратимо.")) return;
    try {
      await apiRequest("/users/me/memory", { method: "DELETE" });
      pushToast("Память очищена", "success");
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : "Не удалось очистить память", "error");
    }
  }

  async function handleDeleteAccount() {
    if (!confirm("Удалить аккаунт навсегда? Все данные будут потеряны безвозвратно.")) return;
    setDeletingAccount(true);
    try {
      await apiRequest("/users/me", { method: "DELETE" });
      clearAuth();
      router.replace("/login");
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : "Не удалось удалить аккаунт", "error");
      setDeletingAccount(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-border px-4 py-3 text-sm font-medium">Настройки</div>
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 px-4 py-8 md:grid-cols-2 md:gap-8 lg:px-8">
        <div className="flex flex-col gap-6">
          <SettingsSection title="Аватар">
          <div className="flex items-center gap-4">
            {user?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt={user.name} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-lg font-bold text-black">
                {user ? initialsFromName(user.name) : ""}
              </div>
            )}
            <input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleAvatarChange} />
            <Button variant="secondary" loading={uploadingAvatar} onClick={() => avatarInputRef.current?.click()}>
              Изменить аватар
            </Button>
          </div>
        </SettingsSection>

        <SettingsSection title="Профиль" description="Ваше имя и email">
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
            <Input label="Имя" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Button type="submit" loading={savingProfile} className="self-start">
              Сохранить
            </Button>
          </form>
        </SettingsSection>

        <SettingsSection title="Пароль">
          <form onSubmit={handleSavePassword} className="flex flex-col gap-4">
            <Input
              label="Текущий пароль"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label="Новый пароль"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
            <Button type="submit" loading={savingPassword} className="self-start">
              Обновить пароль
            </Button>
          </form>
        </SettingsSection>

        <SettingsSection
          title="Custom Instructions"
          description="Эти инструкции автоматически добавляются ко всем вашим запросам"
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">Что ИИ должен знать обо мне?</label>
              <textarea
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-border bg-bg p-4 text-sm text-text outline-none focus:border-white/30"
                placeholder="Например: я разработчик, работаю с Python и React..."
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">Как ИИ должен отвечать?</label>
              <textarea
                value={responseStyle}
                onChange={(e) => setResponseStyle(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-border bg-bg p-4 text-sm text-text outline-none focus:border-white/30"
                placeholder="Например: коротко, по делу, с примерами кода..."
              />
            </div>
            <Button onClick={handleSaveInstructions} loading={savingInstructions} className="self-start">
              Сохранить инструкции
            </Button>
          </div>
        </SettingsSection>
        </div>
        <div className="flex flex-col gap-6">
          <SettingsSection title="Интерфейс" description="Настройки отображения интерфейса">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-text">Компактный режим</span>
                <span className="text-xs text-text-secondary">Уменьшенные отступы и плотный вывод сообщений</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={compactMode}
                onClick={() => setCompactMode(!compactMode)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  compactMode ? "bg-white" : "bg-card-hover border border-border"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out",
                    compactMode ? "translate-x-5 bg-black" : "translate-x-0 bg-text-secondary"
                  )}
                />
              </button>
            </div>
          </SettingsSection>

        <SettingsSection title="Память" description="Управляйте тем, что ИИ запомнил о вас">
          <div className="flex flex-wrap gap-3">
            <Link href="/memory">
              <Button variant="secondary">Открыть управление памятью</Button>
            </Link>
            <Button variant="danger" onClick={handleDeleteMemory}>
              Удалить всю память
            </Button>
          </div>
        </SettingsSection>

        <SettingsSection title="Данные" description="Экспорт или удаление истории переписки">
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={handleExport}>
              Экспортировать историю
            </Button>
            <Button variant="danger" onClick={handleDeleteHistory}>
              Удалить историю
            </Button>
          </div>
        </SettingsSection>

        <SettingsSection title="Опасная зона" description="Необратимые действия">
          <Button variant="danger" loading={deletingAccount} onClick={handleDeleteAccount}>
            Удалить аккаунт
          </Button>
        </SettingsSection>
        </div>
      </div>
    </div>
  );
}
