"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export function Dropdown<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-sm text-text transition-colors hover:bg-card-hover"
      >
        {current?.icon}
        <span className="font-medium">{current?.label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-text-secondary transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-xl shadow-black/50"
          >
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-card-hover",
                  option.value === value && "bg-card-hover"
                )}
              >
                <span className="flex items-center gap-2 font-medium text-text">
                  {option.icon}
                  {option.label}
                  {option.badge}
                </span>
                {option.description && <span className="text-xs text-text-secondary">{option.description}</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
