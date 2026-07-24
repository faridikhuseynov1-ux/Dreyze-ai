"use client";

import { motion } from "framer-motion";
import { BrainCircuit, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest, ApiError } from "@/lib/api";
import { useToastStore } from "@/lib/store";
import type { MemoryEntry } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  name: "Имя",
  topic: "Тема",
  preference: "Предпочтение",
  style: "Стиль общения",
  project: "Проект",
  goal: "Цель",
  interest: "Интерес",
};

export default function MemoryPage() {
  const [entries, setEntries] = useState<MemoryEntry[] | null>(null);
  const pushToast = useToastStore((s) => s.push);

  useEffect(() => {
    apiRequest<MemoryEntry[]>("/memory")
      .then(setEntries)
      .catch(() => setEntries([]));
  }, []);

  async function handleDelete(id: string) {
    try {
      await apiRequest(`/memory/${id}`, { method: "DELETE" });
      setEntries((prev) => (prev ? prev.filter((e) => e.id !== id) : prev));
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : "Не удалось удалить запись", "error");
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-border px-4 py-3 text-sm font-medium">Память</div>
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-black">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-text">Долговременная память</h1>
            <p className="text-sm text-text-secondary">Всё, что Dreyze AI запомнил о вас во время общения</p>
          </div>
        </div>

        {entries === null && (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-white" />
          </div>
        )}

        {entries && entries.length === 0 && (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-text-secondary">
            Пока нет сохранённых воспоминаний. Они появятся здесь по мере общения с ИИ.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {entries?.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <span className="inline-block rounded-full border border-border px-2.5 py-0.5 text-xs text-text-secondary">
                  {CATEGORY_LABELS[entry.category] || entry.category}
                </span>
                <p className="mt-2 text-sm text-text">{entry.content}</p>
                <p className="mt-1 text-xs text-text-secondary">{formatDate(entry.created_at)}</p>
              </div>
              <button
                onClick={() => handleDelete(entry.id)}
                className="shrink-0 rounded-xl p-2 text-text-secondary hover:bg-card-hover hover:text-red-400"
                title="Удалить запись"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
