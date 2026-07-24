"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function ThinkingIndicator() {
  const [phase, setPhase] = useState<"jump" | "spin">("jump");

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase((p) => (p === "jump" ? "spin" : "jump"));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 py-4 text-text-secondary text-sm">
      <span className="italic">Думаю, ищу лучший ответ...</span>
      
      <div className="relative h-6 w-6 flex items-center justify-center">
        {phase === "jump" ? (
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-accent"
                animate={{ y: [0, -6, 0] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  repeatDelay: 1.2,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        ) : (
          <motion.div
            className="flex h-5 w-5 items-center justify-center relative"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute h-1.5 w-1.5 rounded-full bg-accent"
                style={{
                  top: i === 0 ? 0 : 'auto',
                  bottom: i !== 0 ? 0 : 'auto',
                  left: i === 1 ? 0 : 'auto',
                  right: i === 2 ? 0 : 'auto',
                }}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
