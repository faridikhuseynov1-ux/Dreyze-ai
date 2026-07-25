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
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-10 shadow-lg backdrop-blur-xl"
      >
        <div className="mb-10 flex flex-col items-center text-center">
          <Image src="/logo.png" alt="Dreyze AI" width={80} height={80} className="mb-4 h-16 w-16 object-contain" priority />
          <h1 className="text-2xl font-semibold text-text tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-text-secondary">{subtitle}</p>}
        </div>
        {children}
      </motion.div>
    </div>
  );
}
