"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-bg px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-2xl shadow-black/50"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/logo.png" alt="Dreyze AI" width={72} height={72} className="mb-3 h-16 w-16 object-contain" priority />
          <h1 className="text-xl font-semibold text-text">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-text-secondary">{subtitle}</p>}
        </div>
        {children}
      </motion.div>
    </div>
  );
}
