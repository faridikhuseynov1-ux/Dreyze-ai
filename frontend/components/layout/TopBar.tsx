"use client";

import { Menu, Zap, PictureInPicture2 } from "lucide-react";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { ModeSelector } from "@/components/chat/ModeSelector";
import { useUIStore } from "@/lib/store";

interface TopBarProps {
  tokenCount?: number;
}

export function TopBar({ tokenCount }: TopBarProps = {}) {
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const setPipWindow = useUIStore((s) => s.setPipWindow);
  const pipWindow = useUIStore((s) => s.pipWindow);

  const openPip = async () => {
    if (!("documentPictureInPicture" in window)) {
      alert("Ваш браузер не поддерживает PIP-режим (попробуйте свежий Chrome/Edge на ПК).");
      return;
    }
    if (pipWindow) {
      pipWindow.close();
      return;
    }
    try {
      // @ts-expect-error documentPictureInPicture is not typed yet
      const pip = await window.documentPictureInPicture.requestWindow({
        width: 400,
        height: 600,
      });

      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join("");
          const style = document.createElement("style");
          style.textContent = cssRules;
          pip.document.head.appendChild(style);
        } catch {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.type = styleSheet.type;
          link.media = styleSheet.media.mediaText;
          if (styleSheet.href) {
            link.href = styleSheet.href;
          }
          pip.document.head.appendChild(link);
        }
      });

      pip.addEventListener("pagehide", () => setPipWindow(null));
      setPipWindow(pip);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex items-center gap-2 border-b border-border px-4 py-3">
      <button
        onClick={() => setSidebarOpen(true)}
        className="rounded-xl p-2 text-text-secondary hover:bg-card hover:text-text md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex flex-1 items-center gap-2">
        <button
          onClick={openPip}
          className="rounded-xl p-2 text-text-secondary hover:bg-card hover:text-text transition-colors"
          title="Режим поверх окон (PIP)"
        >
          <PictureInPicture2 className="h-5 w-5" />
        </button>
        <div className="shrink-0">
          <ModelSelector />
        </div>
        <div className="shrink-0">
          <ModeSelector />
        </div>
      </div>
      {tokenCount !== undefined && (
        <div className="ml-auto flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-xs font-medium text-text-secondary border border-border">
          <Zap className="h-3.5 w-3.5 text-accent" />
          <span>{tokenCount.toLocaleString("ru-RU")} токенов</span>
        </div>
      )}
    </div>
  );
}
