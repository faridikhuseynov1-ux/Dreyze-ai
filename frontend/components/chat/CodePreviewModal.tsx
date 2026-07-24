"use client";

import { motion } from "framer-motion";
import { Maximize, Minimize, RefreshCw, X, ExternalLink, Globe, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";

interface CodePreviewModalProps {
  code: string;
  language: string;
  onClose: () => void;
}

export function CodePreviewModal({ code, language, onClose }: CodePreviewModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [key, setKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tunnelUrl, setTunnelUrl] = useState<string | null>(null);
  const [sandboxId, setSandboxId] = useState<string | null>(null);

  useEffect(() => {
    let srcDoc = code;
    if (language === "jsx" || language === "tsx" || language === "javascript" || language === "js" || language === "react") {
      if (!code.includes("<html>")) {
        srcDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { background-color: #121212; color: #ffffff; margin: 0; padding: 0; font-family: sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${code}
    
    if (typeof App !== 'undefined') {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(<App />);
    } else if (typeof Example !== 'undefined') {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(<Example />);
    }
  </script>
</body>
</html>`;
      }
    } else if (!code.includes("<html>") && (language === "html" || language === "css")) {
        srcDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>body { background-color: #ffffff; color: #000000; margin: 0; padding: 1rem; font-family: sans-serif; }</style>
  ${language === 'css' ? `<style>${code}</style>` : ''}
</head>
<body>
  ${language === 'html' ? code : 'Preview active'}
</body>
</html>`;
    }

    let currentSandboxId: string | null = null;

    async function startSandbox() {
      try {
        const res = await apiRequest<{id: string, url: string}>("/sandbox/start", {
          method: "POST",
          body: JSON.stringify({ code: srcDoc, lang: "html" })
        });
        currentSandboxId = res.id;
        setSandboxId(res.id);
        setTunnelUrl(res.url);
      } catch (err) {
        console.error("Failed to start sandbox:", err);
      } finally {
        setLoading(false);
      }
    }

    startSandbox();

    return () => {
      if (currentSandboxId) {
        apiRequest(`/sandbox/stop/${currentSandboxId}`, { method: "POST" }).catch(console.error);
      }
    };
  }, [code, language]);

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 px-4 py-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`flex flex-col overflow-hidden rounded-2xl border border-border shadow-2xl transition-all duration-300 ${
          isFullscreen ? "h-full w-full max-w-none rounded-none border-none" : "h-[85vh] w-[90vw] max-w-6xl"
        }`}
        style={{ backgroundColor: "#1e1e1e" }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border/50 bg-[#121212] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-500/80"></div>
              <div className="h-3 w-3 rounded-full bg-yellow-500/80"></div>
              <div className="h-3 w-3 rounded-full bg-green-500/80"></div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-[#1e1e1e] px-3 py-1 text-xs text-text-secondary border border-border/50">
              {loading ? (
                <span className="flex items-center gap-2 text-yellow-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Подключение Cloudflare...
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-green-400">
                  <Globe className="h-3.5 w-3.5" />
                  {tunnelUrl ? tunnelUrl.replace('https://', '') : "localhost"}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tunnelUrl && (
              <a
                href={tunnelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-text-secondary hover:bg-white/10 hover:text-white transition-colors"
                title="Открыть в новой вкладке"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <button
              onClick={() => setKey((k) => k + 1)}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-text-secondary hover:bg-white/10 hover:text-white transition-colors"
              title="Перезагрузить"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-text-secondary hover:bg-white/10 hover:text-white transition-colors"
              title={isFullscreen ? "Свернуть" : "На весь экран"}
            >
              {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
            </button>
            <div className="mx-1 h-4 w-px bg-border/50"></div>
            <button
              onClick={handleClose}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-text-secondary hover:bg-red-500/20 hover:text-red-400 transition-colors"
              title="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative flex-1 bg-white flex flex-col items-center justify-center">
          {loading ? (
             <div className="flex flex-col items-center gap-4 text-text-secondary">
               <Loader2 className="h-10 w-10 animate-spin text-accent" />
               <p className="font-medium">Запуск локального сервера и Cloudflare Tunnel...</p>
             </div>
          ) : tunnelUrl ? (
            <iframe
              key={key}
              src={tunnelUrl}
              title="Code Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              className="absolute inset-0 h-full w-full border-none bg-white"
            />
          ) : (
             <div className="text-red-500 font-medium">Ошибка запуска песочницы</div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
