"use client";

import { useRef } from "react";
import { HotkeysListener } from "@/components/layout/HotkeysListener";
import { Sidebar } from "@/components/layout/Sidebar";
import { HotkeysModal } from "@/components/modals/HotkeysModal";
import { useUIStore } from "@/lib/store";

const SWIPE_EDGE_PX = 40;
const SWIPE_THRESHOLD_PX = 60;

export function AppShell({ children }: { children: React.ReactNode }) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const touchStartX = useRef<number | null>(null);
  const touchStartedAtEdge = useRef(false);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartedAtEdge.current = e.touches[0].clientX < SWIPE_EDGE_PX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;

    if (!sidebarOpen && touchStartedAtEdge.current && deltaX > SWIPE_THRESHOLD_PX) {
      setSidebarOpen(true);
    } else if (sidebarOpen && deltaX < -SWIPE_THRESHOLD_PX) {
      setSidebarOpen(false);
    }
    touchStartX.current = null;
  }

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-bg text-text" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Animated Orbs for AppShell */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-[10%] -top-[10%] h-[50vw] w-[50vw] rounded-full bg-indigo-500/10 blur-[120px] mix-blend-screen animate-blob" />
        <div className="absolute -right-[10%] top-[20%] h-[40vw] w-[40vw] rounded-full bg-fuchsia-500/10 blur-[120px] mix-blend-screen animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-20%] left-[20%] h-[45vw] w-[45vw] rounded-full bg-cyan-500/10 blur-[120px] mix-blend-screen animate-blob animation-delay-4000" />
      </div>

      <div className="relative z-10 flex h-full w-full">
        <HotkeysListener />
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col backdrop-blur-3xl bg-bg/40">{children}</div>
        <HotkeysModal />
      </div>
    </div>
  );
}
