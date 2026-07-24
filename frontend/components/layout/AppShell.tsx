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
    <div className="flex h-[100dvh] w-full overflow-hidden bg-bg text-text" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <HotkeysListener />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      <HotkeysModal />
    </div>
  );
}
