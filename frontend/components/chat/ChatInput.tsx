"use client";

import { ArrowUp, File as FileIcon, Paperclip, Square, X, Headphones } from "lucide-react";
import { useRef, useState } from "react";
import { apiRequest, ApiError } from "@/lib/api";
import { useToastStore } from "@/lib/store";
import type { Attachment } from "@/lib/types";

interface ChatInputProps {
  onSend: (content: string, attachments: Attachment[]) => void;
  isStreaming: boolean;
  onStop: () => void;
  disabledMessage?: string;
  onVoiceModeToggle?: () => void;
}

export function ChatInput({ onSend, isStreaming, onStop, disabledMessage, onVoiceModeToggle }: ChatInputProps) {
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
    <div className="bg-bg/92 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl sm:px-4 sm:pb-4">
      {disabledMessage ? (
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-2 rounded-3xl border border-red-500/50 bg-red-500/10 p-4 text-center">
          <p className="text-sm text-red-200 font-medium">{disabledMessage}</p>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 rounded-[1.6rem] border border-border bg-card/96 p-2 shadow-lg shadow-black/5 transition-shadow focus-within:border-accent/60 focus-within:shadow-xl sm:p-3">
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

        <div className="flex items-end gap-1.5 sm:gap-2">
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
            className="max-h-40 min-h-[2.75rem] flex-1 resize-none bg-transparent py-2.5 text-base text-text outline-none placeholder:text-text-secondary sm:max-h-48 sm:min-h-[2.5rem] sm:py-2 sm:text-sm"
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
          />

          {onVoiceModeToggle && !text.trim() && attachments.length === 0 && !isStreaming && (
            <button
              onClick={onVoiceModeToggle}
              className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-card-hover hover:text-text sm:h-9 sm:w-9"
              title="Голосовой режим"
            >
              <Headphones className="h-5 w-5" />
            </button>
          )}

          {isStreaming ? (
            <button
              onClick={onStop}
              className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-text text-bg transition-colors hover:opacity-90 sm:h-9 sm:w-9"
              title="Остановить генерацию"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={uploading || (!text.trim() && attachments.length === 0)}
              className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-text text-bg transition-colors hover:opacity-90 disabled:opacity-40 sm:h-9 sm:w-9"
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
