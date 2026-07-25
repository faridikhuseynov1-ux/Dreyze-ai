"use client";

import { useState } from "react";
import { Loader2, Video as VideoIcon } from "lucide-react";

export function VideoGenerator() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/next-api-generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setVideoUrl(data.video_url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col items-center p-4 pt-10 overflow-y-auto">
      <div className="w-full max-w-3xl flex-1 flex flex-col items-center gap-6">
        <div className="flex items-center gap-2 text-text">
          <VideoIcon className="h-6 w-6" />
          <h2 className="text-xl font-semibold">Генератор Видео (Hugging Face)</h2>
        </div>

        {error && (
          <div className="w-full rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-center text-sm text-red-500">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card shadow-sm">
            <Loader2 className="h-10 w-10 animate-spin text-accent" />
            <p className="text-sm text-text-secondary animate-pulse text-center px-4">
              Генерация видео... Это бесплатный сервер, может потребоваться от 1 до 5 минут.
            </p>
          </div>
        ) : videoUrl ? (
          <div className="w-full overflow-hidden rounded-2xl border border-border bg-black shadow-lg">
            <video src={videoUrl} controls autoPlay loop className="w-full h-auto aspect-video object-contain" />
          </div>
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/50 text-text-secondary shadow-sm">
            <VideoIcon className="h-10 w-10 opacity-50" />
            <p className="text-sm">Напишите промпт ниже, чтобы создать видео</p>
          </div>
        )}

        <div className="w-full mt-auto rounded-3xl border border-border bg-card p-3 shadow-sm focus-within:shadow-md transition-shadow">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            placeholder="Опишите видео, которое хотите сгенерировать..."
            className="w-full resize-none bg-transparent px-2 py-2 text-sm text-text placeholder:text-text-secondary outline-none min-h-[4rem]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90 disabled:opacity-50"
            >
              Сгенерировать видео
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
