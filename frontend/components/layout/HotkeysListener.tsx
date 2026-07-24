"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/lib/store";

export function HotkeysListener() {
  const router = useRouter();
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const setHotkeysModalOpen = useUIStore((s) => s.setHotkeysModalOpen);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // Ctrl+K / Cmd+K -> Focus search bar
      if (isCmdOrCtrl && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Поиск"]') as HTMLInputElement | null;
        if (searchInput) {
          searchInput.focus();
        }
      }
      // Ctrl+N / Cmd+N -> New chat
      else if (isCmdOrCtrl && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setSidebarOpen(false);
        router.push("/chat");
      }
      // Ctrl+/ / Cmd+/ -> Open Hotkeys modal
      else if (isCmdOrCtrl && e.key === "/") {
        e.preventDefault();
        setHotkeysModalOpen(true);
      }
      // Esc -> Close modal / sidebar
      else if (e.key === "Escape") {
        setHotkeysModalOpen(false);
        setSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, setSidebarOpen, setHotkeysModalOpen]);

  return null;
}
