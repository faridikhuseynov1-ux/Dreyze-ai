"use client";

import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Settings, User as UserIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/lib/store";
import { initialsFromName } from "@/lib/utils";

interface UserDropdownProps {
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export function UserDropdown({ onOpenProfile, onOpenSettings, onLogout }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const user = useAuthStore((s) => s.user);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 hover:bg-card-hover transition-colors text-left"
      >
        {user?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar_url} alt={user.name} className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-semibold text-black shrink-0">
            {user ? initialsFromName(user.name) : <UserIcon className="h-4 w-4" />}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text">{user?.name}</p>
          <p className="truncate text-xs text-text-secondary">{user?.email}</p>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-2 w-[240px] rounded-xl border border-border p-1 shadow-2xl"
            style={{ backgroundColor: "#1e1e1e" }}
          >
            <div className="mb-1 flex items-center gap-3 px-3 py-3 border-b border-border/50">
              {user?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar_url} alt={user.name} className="h-9 w-9 rounded-full object-cover shrink-0" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-semibold text-black shrink-0">
                  {user ? initialsFromName(user.name) : <UserIcon className="h-4 w-4" />}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="truncate text-sm font-medium text-white">{user?.name}</span>
                <span className="text-xs text-text-secondary">Free Plan</span>
              </div>
            </div>

            <button
              onClick={() => {
                setIsOpen(false);
                onOpenProfile();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white transition-colors hover:bg-white/10"
            >
              <UserIcon className="h-4 w-4" />
              Профиль
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenSettings();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white transition-colors hover:bg-white/10"
            >
              <Settings className="h-4 w-4" />
              Настройки
            </button>
            <div className="my-1 border-t border-border/50" />
            <button
              onClick={() => {
                setIsOpen(false);
                setShowLogoutConfirm(true);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4" />
              Выйти
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xs rounded-2xl border border-border bg-card p-6 shadow-xl"
            >
              <h3 className="mb-6 text-center text-lg font-medium text-text">
                Вы точно хотите выйти?
              </h3>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 rounded-xl bg-card-hover px-4 py-2.5 text-sm font-medium text-text transition-colors hover:bg-white/10"
                >
                  Нет
                </button>
                <button
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    onLogout();
                  }}
                  className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600"
                >
                  Да
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
