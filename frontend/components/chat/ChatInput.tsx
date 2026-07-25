"use client";

import { ArrowUp, File as FileIcon, Paperclip, Square, X } from "lucide-react";
import { useRef, useState } from "react";
import { apiRequest, ApiError } from "@/lib/api";
import { useToastStore } from "@/lib/store";
import type { Attachment } from "@/lib/types";

interface ChatInputProps {
  onSend: (content: string, attachments: Attachment[]) => void;
  isStreaming: boolean;
  onStop: () => void;
  disabledMessage?: string;
}

export function ChatInput({ onSend, isStreaming, onStop, disabledMessage }: ChatInputProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pushToast = useToastStore((s) => s.push);

  function handleSubmit() {
    if (isStreaming) return;
    if (!text.trim() && attachments.length === 0) return;
    onSend(text.trim(), attachments);
    setText("");
    setAttachments([]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const uploaded = await apiRequest<Attachment>("/uploads", { method: "POST", body: formData });
        setAttachments((prev) => [...prev, uploaded]);
      }
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : "Не удалось загрузить файл", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeAttachment(fileId: string) {
    setAttachments((prev) => prev.filter((a) => a.file_id !== fileId));
  }

  return (
    <div className="bg-bg px-4 pb-4 pt-2">
      {disabledMessage ? (
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-2 rounded-3xl border border-red-500/50 bg-red-500/10 p-4 text-center">
          <p className="text-sm text-red-200 font-medium">{disabledMessage}</p>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 rounded-3xl border border-border bg-card p-3 shadow-sm focus-within:shadow-md transition-shadow">
          {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1">
            {attachments.map((a) => (
              <div key={a.file_id} className="flex items-center gap-2 rounded-xl border border-border bg-bg px-2 py-1.5 text-xs">
                {a.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.url} alt={a.name} className="h-6 w-6 rounded object-cover" />
                ) : (
                  <FileIcon className="h-4 w-4 text-text-secondary" />
                )}
                <span className="max-w-[140px] truncate text-text-secondary">{a.name}</span>
                <button onClick={() => removeAttachment(a.file_id)} className="text-text-secondary hover:text-text">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/markdown,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/json"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mb-1 shrink-0 rounded-xl p-2 text-text-secondary transition-colors hover:bg-card-hover hover:text-text disabled:opacity-50"
            title="Прикрепить файл"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Напишите сообщение..."
            rows={1}
            className="max-h-48 min-h-[2.5rem] flex-1 resize-none bg-transparent py-2 text-sm text-text placeholder:text-text-secondary outline-none"
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
          />

          {isStreaming ? (
            <button
              onClick={onStop}
              className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-black transition-colors hover:bg-white/90"
              title="Остановить генерацию"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={uploading || (!text.trim() && attachments.length === 0)}
              className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-black transition-colors hover:bg-white/90 disabled:opacity-40"
              title="Отправить"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      )}
      {!disabledMessage && (
        <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-text-secondary">
          Dreyze AI может ошибаться. Проверяйте важную информацию.
        </p>
      )}
    </div>
  );
}
