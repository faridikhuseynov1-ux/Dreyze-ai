"use client";

import { motion } from "framer-motion";
import { X, User as UserIcon, Monitor, Database, ShieldAlert, Key, MessageSquare, Link as LinkIcon, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiRequest, ApiError } from "@/lib/api";
import { useAuthStore, usePreferencesStore, useToastStore } from "@/lib/store";
import { cn, initialsFromName } from "@/lib/utils";
import type { Instructions, User } from "@/lib/types";

interface SettingsModalProps {
  onClose: () => void;
}

type TabId = "profile" | "interface" | "memory" | "password" | "data" | "instructions" | "services" | "usage" | "danger";

export function SettingsModal({ onClose }: SettingsModalProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clear);
  const pushToast = useToastStore((s) => s.push);
  
  const compactMode = usePreferencesStore((s) => s.compactMode);
  const setCompactMode = usePreferencesStore((s) => s.setCompactMode);

  const [activeTab, setActiveTab] = useState<TabId>("profile");
  
  // Profile
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Instructions
  const [aboutMe, setAboutMe] = useState("");
  const [responseStyle, setResponseStyle] = useState("");
  const [savingInstructions, setSavingInstructions] = useState(false);

  // Danger
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Services
  const [githubToken, setGithubToken] = useState("");
  const [savingGithub, setSavingGithub] = useState(false);
  const [isGithubConnected, setIsGithubConnected] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "instructions") {
      apiRequest<Instructions>("/users/me/instructions")
        .then((data) => {
          setAboutMe(data.instructions_about_me);
          setResponseStyle(data.instructions_response_style);
        })
        .catch(() => {});
    } else if (activeTab === "services") {
      apiRequest<{ github_token: string | null; is_connected: boolean }>("/users/me/github")
        .then((data) => {
          setGithubToken(data.github_token || "");
          setIsGithubConnected(data.is_connected);
        })
        .catch(() => {});
    }
  }, [activeTab]);

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
        body: JSON.stringify({ 
          instructions_about_me: aboutMe, 
          instructions_response_style: responseStyle
        }),
      });
      pushToast("Инструкции сохранены", "success");
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : "Не удалось сохранить инструкции", "error");
    } finally {
      setSavingInstructions(false);
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

  async function handleSaveGithub() {
    setSavingGithub(true);
    try {
      const res = await apiRequest<{ github_token: string | null; is_connected: boolean }>("/users/me/github", {
        method: "PUT",
        body: JSON.stringify({ github_token: githubToken }),
      });
      setIsGithubConnected(res.is_connected);
      pushToast("Токен GitHub сохранён", "success");
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : "Не удалось сохранить токен", "error");
    } finally {
      setSavingGithub(false);
    }
  }

  async function handleUpdatePlan(plan: string) {
    try {
      const updated = await apiRequest<User>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ plan }),
      });
      setUser(updated);
      pushToast("План успешно изменён", "success");
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : "Не удалось изменить план", "error");
    }
  }

  const tabs = [
    { id: "profile", label: "Профиль", icon: UserIcon },
    { id: "interface", label: "Интерфейс", icon: Monitor },
    { id: "memory", label: "Память", icon: Database },
    { id: "password", label: "Пароль", icon: Key },
    { id: "data", label: "Данные", icon: Database },
    { id: "instructions", label: "Custom Instructions", icon: MessageSquare },
    { id: "services", label: "Подключенные сервисы", icon: LinkIcon },
    { id: "usage", label: "Лимиты", icon: Zap },
    { id: "danger", label: "Опасная зона", icon: ShieldAlert },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex flex-col sm:flex-row h-full max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-[#1e1e1e] shadow-2xl sm:max-h-[700px]"
      >
        {/* Sidebar */}
        <div className="w-full sm:w-64 shrink-0 border-b sm:border-b-0 sm:border-r border-border bg-[#121212] flex flex-col">
          <div className="p-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">Настройки</h2>
            <button onClick={onClose} className="sm:hidden rounded-full p-1 text-text-secondary hover:bg-white/10 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex sm:flex-col overflow-x-auto space-x-2 sm:space-x-0 sm:space-y-1 p-2 pb-0 sm:pb-2 scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabId)}
                  className={cn(
                    "flex shrink-0 sm:w-full items-center gap-3 rounded-t-xl sm:rounded-xl px-3 py-2 text-sm font-medium transition-colors border-b-2 sm:border-b-0",
                    activeTab === tab.id
                      ? "bg-white/10 text-white border-white sm:border-transparent"
                      : "text-text-secondary hover:bg-white/5 hover:text-white border-transparent"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
          <div className="hidden sm:flex justify-end p-4 border-b border-border/50">
            <button onClick={onClose} className="rounded-full p-1 text-text-secondary hover:bg-white/10 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto max-w-2xl">
              {activeTab === "profile" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white mb-4">Профиль</h3>
                  
                  <div className="flex items-center gap-4 pb-6 border-b border-border/50">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt={user.name} className="h-16 w-16 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-lg font-bold text-black">
                        {user ? initialsFromName(user.name) : "U"}
                      </div>
                    )}
                    <input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleAvatarChange} />
                    <Button variant="secondary" loading={uploadingAvatar} onClick={() => avatarInputRef.current?.click()}>
                      Изменить аватар
                    </Button>
                  </div>

                  <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                    <Input label="Имя" value={name} onChange={(e) => setName(e.target.value)} required />
                    <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    <Button type="submit" loading={savingProfile} className="self-start">
                      Сохранить
                    </Button>
                  </form>
                </div>
              )}

              {activeTab === "interface" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white mb-4">Интерфейс</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-white">Компактный режим</span>
                      <span className="text-sm text-text-secondary">Уменьшенные отступы и плотный вывод сообщений</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={compactMode}
                      onClick={() => setCompactMode(!compactMode)}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        compactMode ? "bg-white" : "bg-[#262626] border border-border"
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
                </div>
              )}

              {activeTab === "memory" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white mb-4">Память</h3>
                  <p className="text-sm text-text-secondary mb-4">Управляйте тем, что ИИ запомнил о вас</p>
                  <div className="flex flex-wrap gap-4">
                    <Link href="/memory" onClick={onClose}>
                      <Button variant="secondary">Открыть управление памятью</Button>
                    </Link>
                    <Button variant="danger" onClick={handleDeleteMemory}>
                      Удалить всю память
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === "password" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white mb-4">Пароль</h3>
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
                </div>
              )}

              {activeTab === "data" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white mb-4">Данные</h3>
                  <p className="text-sm text-text-secondary mb-4">Экспорт или удаление истории переписки</p>
                  <div className="flex flex-wrap gap-4">
                    <Button variant="secondary" onClick={handleExport}>
                      Экспортировать историю
                    </Button>
                    <Button variant="danger" onClick={handleDeleteHistory}>
                      Удалить историю
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === "instructions" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white mb-4">Custom Instructions</h3>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-white">Что ИИ должен знать обо мне?</label>
                      <textarea
                        value={aboutMe}
                        onChange={(e) => setAboutMe(e.target.value)}
                        rows={4}
                        className="w-full rounded-xl border border-border/50 bg-[#262626] p-4 text-sm text-white outline-none focus:border-white/30"
                        placeholder="Например: я разработчик, работаю с Python и React..."
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-white">Как ИИ должен отвечать?</label>
                      <textarea
                        value={responseStyle}
                        onChange={(e) => setResponseStyle(e.target.value)}
                        rows={4}
                        className="w-full rounded-xl border border-border/50 bg-[#262626] p-4 text-sm text-white outline-none focus:border-white/30"
                        placeholder="Например: коротко, по делу, с примерами кода..."
                      />
                    </div>
                    <Button onClick={handleSaveInstructions} loading={savingInstructions} className="self-start">
                      Сохранить инструкции
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === "services" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white mb-4">Подключенные сервисы</h3>
                  <div className="flex flex-col gap-6">
                    {/* GitHub */}
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-white">GitHub Personal Access Token</label>
                      <p className="text-xs text-text-secondary">
                        Укажите токен, чтобы ИИ мог читать ваши репозитории и делать push/pull.
                      </p>
                      <Input
                        type="password"
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        placeholder="ghp_xxxxxxxxxxxx"
                      />
                      {isGithubConnected && (
                        <div className="flex items-center gap-2 text-sm text-green-400 mt-1">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          GitHub подключен
                        </div>
                      )}
                      <Button onClick={handleSaveGithub} loading={savingGithub} className="self-start mt-2">
                        Сохранить GitHub
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "usage" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white mb-4">Подписка и Лимиты</h3>
                  <div className="flex flex-col gap-4 mb-6">
                    <p className="text-sm text-text-secondary">Ваш текущий тарифный план: 
                      <span className="font-semibold text-white ml-2">
                        {user?.plan === "premium" ? "Премиум" : user?.plan === "paid" ? "Платный" : "Бесплатный"}
                      </span>
                    </p>
                    {user?.plan === "free" && (
                      <p className="text-xs text-text-secondary">
                        У вас доступно 10 запросов в день. Для изменения подписки обратитесь к администратору.
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl border border-border bg-[#262626] p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">
                        Использовано токенов: {user?.tokens_used?.toLocaleString("ru-RU") || 0}
                      </span>
                      <span className="text-sm font-medium text-text-secondary">
                        {user?.plan === "free" ? "Безлимит токенов (но 10 запросов/день)" : 
                         user?.plan === "paid" ? "100 000 лимит" : 
                         user?.plan === "premium" ? "200 000 лимит" : "1 000 000 лимит"}
                      </span>
                    </div>
                    {user?.plan !== "free" && (
                      <div className="h-2 w-full overflow-hidden rounded-full bg-black/50">
                        <div 
                          className="h-full rounded-full bg-white transition-all duration-500" 
                          style={{ width: `${Math.min(100, Math.round(((user?.tokens_used || 0) / (user?.plan === "premium" ? 200000 : 100000)) * 100))}%` }} 
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "danger" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-red-500 mb-4">Опасная зона</h3>
                  <p className="text-sm text-text-secondary mb-4">Необратимые действия с вашим аккаунтом.</p>
                  <Button variant="danger" loading={deletingAccount} onClick={handleDeleteAccount}>
                    Удалить аккаунт
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
