"use client";

import { motion } from "framer-motion";
import { Camera, X } from "lucide-react";
import { useState, useRef } from "react";
import { useAuthStore, useToastStore } from "@/lib/store";
import { apiRequest } from "@/lib/api";
import type { User } from "@/lib/types";

interface EditProfileModalProps {
  onClose: () => void;
}

export function EditProfileModal({ onClose }: EditProfileModalProps) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const pushToast = useToastStore((s) => s.push);

  const [displayName, setDisplayName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.email?.split('@')[0] || "");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSave() {
    if (!displayName.trim()) return;
    setLoading(true);
    try {
      const updated = await apiRequest<User>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ name: displayName.trim() }),
      });
      setUser(updated);
      pushToast("Профиль обновлен", "success");
      onClose();
    } catch {
      pushToast("Не удалось обновить профиль", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border shadow-2xl"
        style={{ backgroundColor: "#1e1e1e" }}
      >
        <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Edit profile</h2>
          <button onClick={onClose} className="rounded-full p-1 text-text-secondary hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 flex justify-center">
            <div className="relative cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-accent text-3xl font-bold text-white overflow-hidden border-4 border-[#1e1e1e]">
                {user?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <span>{displayName.charAt(0).toUpperCase() || "U"}</span>
                )}
              </div>
              <div className="absolute bottom-0 right-0 rounded-full bg-white p-1.5 shadow-lg border-2 border-[#1e1e1e] text-black">
                <Camera className="h-4 w-4" />
              </div>
              <input type="file" ref={fileInputRef} hidden accept="image/*" />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-white">Display name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-[#0d0d0d] px-4 py-2.5 text-sm text-white outline-none focus:border-white/20 transition-colors"
                placeholder="Enter display name"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-white">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-[#0d0d0d] px-4 py-2.5 text-sm text-white outline-none focus:border-white/20 transition-colors"
                placeholder="Enter username"
              />
            </div>
            <p className="text-xs text-text-secondary pt-1">
              Your profile helps people recognize you in group chats.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border/50 bg-[#1e1e1e] p-4 px-6">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
