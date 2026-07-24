"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Keyboard, X } from "lucide-react";
import { useUIStore } from "@/lib/store";

export function HotkeysModal() {
  const hotkeysModalOpen = useUIStore((s) => s.hotkeysModalOpen);
  const setHotkeysModalOpen = useUIStore((s) => s.setHotkeysModalOpen);

  if (!hotkeysModalOpen) return null;

  const shortcuts = [
    { keys: ["Ctrl", "K"], mac: ["⌘", "K"], description: "Поиск по чатам" },
    { keys: ["Ctrl", "N"], mac: ["⌘", "N"], description: "Создать новый чат" },
    { keys: ["Ctrl", "/"], mac: ["⌘", "/"], description: "Открыть справку по клавишам" },
    { keys: ["Esc"], mac: ["Esc"], description: "Закрыть модальное окно / меню" },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setHotkeysModalOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative z-10 w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-text" />
              <h3 className="text-lg font-semibold text-text">Горячие клавиши</h3>
            </div>
            <button
              onClick={() => setHotkeysModalOpen(false)}
              className="rounded-xl p-1 text-text-secondary hover:text-text hover:bg-card-hover"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {shortcuts.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-2xl border border-border bg-bg px-4 py-3"
              >
                <span className="text-sm font-medium text-text">{item.description}</span>
                <div className="flex items-center gap-1.5">
                  {item.keys.map((k, kIdx) => (
                    <kbd
                      key={kIdx}
                      className="inline-flex min-w-[24px] items-center justify-center rounded-lg border border-border bg-card px-2 py-1 text-xs font-semibold text-text shadow-xs"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-text-secondary">
            Нажмите <kbd className="px-1.5 py-0.5 rounded border border-border bg-bg text-text">Esc</kbd> для закрытия
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
