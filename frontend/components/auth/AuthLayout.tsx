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
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#030305] px-4 py-12">
      {/* Animated Orbs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-[10%] -top-[10%] h-[50vw] w-[50vw] rounded-full bg-indigo-500/20 blur-[120px] mix-blend-screen animate-blob" />
        <div className="absolute -right-[10%] top-[20%] h-[40vw] w-[40vw] rounded-full bg-fuchsia-500/20 blur-[120px] mix-blend-screen animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-20%] left-[20%] h-[45vw] w-[45vw] rounded-full bg-cyan-500/20 blur-[120px] mix-blend-screen animate-blob animation-delay-4000" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 shadow-[0_8px_40px_rgb(0,0,0,0.5)] backdrop-blur-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50 pointer-events-none" />
        
        <div className="relative z-20 mb-10 flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
            className="relative mb-5"
          >
            <div className="absolute inset-0 rounded-full bg-white/20 blur-xl mix-blend-screen" />
            <Image src="/logo.png" alt="Dreyze AI" width={80} height={80} className="relative h-20 w-20 object-contain drop-shadow-2xl" priority />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent"
          >
            {title}
          </motion.h1>
          
          {subtitle && (
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-3 text-sm font-medium text-gray-400"
            >
              {subtitle}
            </motion.p>
          )}
        </div>
        
        <div className="relative z-20">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
