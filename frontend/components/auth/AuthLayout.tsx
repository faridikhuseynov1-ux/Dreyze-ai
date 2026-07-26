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
    <div className="flex min-h-svh w-full items-center justify-center overflow-y-auto bg-bg px-4 py-6 sm:px-6 sm:py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg backdrop-blur-xl sm:p-8 lg:p-10"
      >
        <div className="mb-7 flex flex-col items-center text-center sm:mb-10">
          <Image src="/logo.png" alt="Dreyze AI" width={80} height={80} className="mb-4 h-14 w-14 object-contain sm:h-16 sm:w-16" priority />
          <h1 className="text-xl font-semibold text-text tracking-tight sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-text-secondary">{subtitle}</p>}
        </div>
        {children}
      </motion.div>
    </div>
  );
}
