"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useEffect } from "react";
import { useToastStore } from "@/lib/store";

const ICONS = {
  success: <CheckCircle2 className="h-5 w-5 text-white" />,
  error: <XCircle className="h-5 w-5 text-white" />,
  info: <Info className="h-5 w-5 text-white" />,
};

function ToastItem({ id, message, variant }: { id: string; message: string; variant: "success" | "error" | "info" }) {
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    const timer = setTimeout(() => dismiss(id), 4000);
    return () => clearTimeout(timer);
  }, [id, dismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onClick={() => dismiss(id)}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-lg shadow-black/40 cursor-pointer max-w-sm"
    >
      {ICONS[variant]}
      <p className="text-sm text-text">{message}</p>
    </motion.div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <div className="flex flex-col gap-2 pointer-events-auto">
        <AnimatePresence>
          {toasts.map((t) => (
            <ToastItem key={t.id} {...t} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
