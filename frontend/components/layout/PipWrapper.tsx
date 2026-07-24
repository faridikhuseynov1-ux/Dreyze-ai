"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface PipWrapperProps {
  children: React.ReactNode;
  pipWindow: Window | null;
}

export function PipWrapper({ children, pipWindow }: PipWrapperProps) {
  useEffect(() => {
    if (pipWindow) {
      pipWindow.document.body.className = "bg-bg text-text h-screen w-screen overflow-hidden antialiased";
      // copy data-theme if needed
      const theme = document.documentElement.getAttribute("data-theme") || "dark";
      pipWindow.document.documentElement.setAttribute("data-theme", theme);
      if (theme === "dark") {
        pipWindow.document.documentElement.classList.add("dark");
      }
    }
  }, [pipWindow]);

  if (pipWindow) {
    return (
      <>
        <div className="flex h-full w-full items-center justify-center text-text-secondary flex-col gap-4">
          <p>Чат открыт в режиме поверх окон (PIP).</p>
          <button 
            onClick={() => pipWindow.close()}
            className="rounded bg-accent px-4 py-2 text-white hover:bg-accent/90"
          >
            Вернуть чат
          </button>
        </div>
        {createPortal(children, pipWindow.document.body)}
      </>
    );
  }
  return <>{children}</>;
}
