"use client";

import { motion } from "framer-motion";
import { Calendar, MessageSquare, MessagesSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { ProfileStats } from "@/lib/types";
import { formatDate, initialsFromName } from "@/lib/utils";

export default function ProfilePage() {
  const [stats, setStats] = useState<ProfileStats | null>(null);

  useEffect(() => {
    apiRequest<ProfileStats>("/users/me/profile").then(setStats).catch(() => {});
  }, []);

  if (!stats) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-border px-4 py-3 text-sm font-medium">Профиль</div>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-white" />
        </div>
      </div>
    );
  }

  const { user, chat_count, message_count } = stats;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-border px-4 py-3 text-sm font-medium">Профиль</div>
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center rounded-3xl border border-border bg-card p-10 text-center"
        >
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt={user.name} className="h-24 w-24 rounded-full object-cover" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-2xl font-bold text-black">
              {initialsFromName(user.name)}
            </div>
          )}
          <h1 className="mt-4 text-xl font-semibold text-text">{user.name}</h1>
          <p className="text-sm text-text-secondary">{user.email}</p>

          <div className="mt-2 flex items-center gap-1.5 text-xs text-text-secondary">
            <Calendar className="h-3.5 w-3.5" />
            На платформе с {formatDate(user.created_at)}
          </div>

          <div className="mt-8 grid w-full grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border bg-bg p-5">
              <MessagesSquare className="mx-auto h-5 w-5 text-text-secondary" />
              <p className="mt-2 text-2xl font-semibold text-text">{chat_count}</p>
              <p className="text-xs text-text-secondary">чатов</p>
            </div>
            <div className="rounded-2xl border border-border bg-bg p-5">
              <MessageSquare className="mx-auto h-5 w-5 text-text-secondary" />
              <p className="mt-2 text-2xl font-semibold text-text">{message_count}</p>
              <p className="text-xs text-text-secondary">сообщений</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
