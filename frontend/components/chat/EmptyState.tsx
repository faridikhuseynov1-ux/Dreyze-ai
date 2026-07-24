"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useAuthStore } from "@/lib/store";

export function EmptyState() {
  const user = useAuthStore((s) => s.user);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center"
    >
      <Image src="/logo.png" alt="Dreyze AI" width={72} height={72} className="h-16 w-16 object-contain" priority />
      <h1 className="text-2xl font-semibold text-text">
        {user ? `С чем помочь, ${user.name.split(" ")[0]}?` : "С чем вам помочь?"}
      </h1>
      <p className="max-w-md text-sm text-text-secondary">
        Выберите модель и режим сверху, прикрепите файлы или изображения и начните разговор.
      </p>
    </motion.div>
  );
}
