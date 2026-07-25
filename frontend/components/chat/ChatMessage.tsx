"use client";

import { motion } from "framer-motion";
import { Check, Copy, Download, Pencil, RotateCcw, Trash2, Pin, Play, Globe } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CodePreviewModal } from "@/components/chat/CodePreviewModal";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { MermaidDiagram } from "@/components/chat/MermaidDiagram";
import { Button } from "@/components/ui/Button";
import { usePreferencesStore, useToastStore } from "@/lib/store";
import { apiRequest, ApiError } from "@/lib/api";
import type { Message } from "@/lib/types";
import { cn, initialsFromName } from "@/lib/utils";

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  js: "js",
  javascript: "js",
  ts: "ts",
  typescript: "ts",
  jsx: "jsx",
  tsx: "tsx",
  py: "py",
  python: "py",
  html: "html",
  css: "css",
  json: "json",
  md: "md",
  markdown: "md",
  sh: "sh",
  bash: "sh",
  zsh: "sh",
  sql: "sql",
  cpp: "cpp",
  c: "c",
  cs: "cs",
  csharp: "cs",
  java: "java",
  go: "go",
  rs: "rs",
  rust: "rs",
  php: "php",
  ruby: "rb",
  rb: "rb",
  yaml: "yaml",
  yml: "yaml",
  xml: "xml",
};

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (!node) return "";
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (typeof node === "object" && node !== null && "props" in node) {
    const props = (node as { props?: { children?: React.ReactNode } }).props;
    if (props && props.children) {
      return extractText(props.children);
    }
  }
  return "";
}

interface ChatMessageProps {
  message: Message;
  userName: string;
  onEdit?: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
  onRegenerate?: (id: string) => void;
  onPin?: (id: string) => void;
  onContinue?: (id: string) => void;
}

export function ChatMessage({ message, userName, onEdit, onDelete, onRegenerate, onPin, onContinue }: ChatMessageProps) {
  const compactMode = usePreferencesStore((s) => s.compactMode);
  const [copied, setCopied] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState<{ code: string; lang: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [githubExecuting, setGithubExecuting] = useState(false);
  const pushToast = useToastStore((s) => s.push);
  const [draft, setDraft] = useState(message.content);
  const isUser = message.role === "user";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy message content:", err);
    }
  }

  async function handleCopyCode(codeText: string, id: string) {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(null), 1500);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  }

  function handleDownloadCode(codeText: string, lang: string) {
    const ext = LANGUAGE_EXTENSIONS[lang.toLowerCase()] || (lang ? lang.toLowerCase() : "txt");
    const blob = new Blob([codeText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code-snippet.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function saveEdit() {
    setEditing(false);
    if (draft.trim() && draft !== message.content) onEdit?.(message.id, draft.trim());
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("group flex w-full", compactMode ? "gap-2 px-3 py-1.5" : "gap-3 px-4 py-3", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className={cn("mt-1 flex shrink-0 items-center justify-center rounded-full bg-white p-1", compactMode ? "h-6 w-6" : "h-7 w-7")}>
          <Image src="/logo.png" alt="Dreyze AI" width={20} height={20} className="h-full w-full object-contain" />
        </div>
      )}

      <div className={cn("flex w-full flex-col gap-1.5", isUser ? "max-w-[85%] sm:max-w-[75%] items-end" : "w-full")}>
        {message.is_pinned && (
          <div className="flex items-center gap-1 text-[10px] uppercase text-text-secondary font-semibold ml-2">
            <Pin className="h-3 w-3" /> Закреплено
          </div>
        )}
        {editing ? (
          <div className="w-full rounded-3xl border border-border bg-card p-3">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={Math.min(8, draft.split("\n").length + 1)}
              className="w-full resize-none bg-transparent text-sm text-text outline-none"
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs">
                Отмена
              </Button>
              <Button onClick={saveEdit} className="px-3 py-1.5 text-xs">
                Сохранить
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              compactMode ? "prose-chat prose-compact text-xs" : "prose-chat text-sm",
              isUser 
                ? (compactMode ? "px-3.5 py-2 text-xs rounded-2xl bg-user-bubble text-text" : "px-5 py-3 text-sm rounded-3xl bg-user-bubble text-text") 
                : "text-text w-full py-1"
            )}
          >
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {message.attachments.map((a) =>
                  a.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={a.file_id}
                      src={a.url}
                      alt={a.name}
                      className="max-h-48 rounded-2xl border border-border object-cover"
                    />
                  ) : (
                    <a
                      key={a.file_id}
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-border bg-bg px-3 py-2 text-xs text-text-secondary hover:text-text"
                    >
                      {a.name}
                    </a>
                  )
                )}
              </div>
            )}
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeHighlight, rehypeKatex]}
              components={{
                a: ({ ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
                code({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const lang = match ? match[1] : "";
                  const rawCode = extractText(children).replace(/\n$/, "");

                  if (!inline && lang === "mermaid") {
                    return <MermaidDiagram chart={rawCode} />;
                  }

                  if (!inline && lang === "github") {
                    let parsed: Record<string, unknown> = {};
                    try {
                      parsed = JSON.parse(rawCode);
                    } catch {
                      return <div className="text-red-500">Invalid GitHub action JSON</div>;
                    }
                    
                    const handleExecute = async () => {
                      setGithubExecuting(true);
                      try {
                        const res = await apiRequest<{commit_sha: string; url: string}>("/users/me/github/action", {
                          method: "POST",
                          body: JSON.stringify(parsed)
                        });
                        pushToast(`Успешно выполнено! Коммит: ${res.commit_sha.slice(0,7)}`, "success");
                        if (res.url) {
                          window.open(res.url, "_blank");
                        }
                      } catch (err) {
                        pushToast(err instanceof ApiError ? err.message : "Ошибка выполнения GitHub action", "error");
                      } finally {
                        setGithubExecuting(false);
                      }
                    };

                    return (
                      <div className="my-3 overflow-hidden rounded-2xl border border-border bg-card">
                        <div className="flex items-center gap-2 border-b border-border bg-card-hover px-4 py-3 text-sm font-medium text-white">
                          <Play className="h-4 w-4" /> GitHub Action: {String(parsed.action)}
                        </div>
                        <div className="p-4 flex flex-col gap-3">
                          <p className="text-xs text-text-secondary">
                            Репозиторий: <span className="text-white font-mono">{String(parsed.repo)}</span>
                          </p>
                          <p className="text-xs text-text-secondary">
                            Сообщение: <span className="text-white">{String(parsed.message)}</span>
                          </p>
                          <div className="text-xs text-text-secondary">
                            Изменения в файлах:
                            <ul className="list-disc pl-4 mt-1 text-white font-mono">
                              {Array.isArray(parsed.files) && parsed.files.map((f: {path: string}, i: number) => (
                                <li key={i}>{f.path}</li>
                              ))}
                            </ul>
                          </div>
                          <Button 
                            loading={githubExecuting} 
                            onClick={handleExecute}
                            className="self-start mt-2"
                          >
                            Выполнить {String(parsed.action)}
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  if (inline) {
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }

                  const badgeText = lang ? lang.toUpperCase() : "CODE";
                  const codeId = `${message.id}-${lang}-${rawCode.slice(0, 10)}`;
                  const isCopied = copiedCodeId === codeId;
                  const isPreviewable = ["html", "jsx", "tsx", "js", "javascript", "react", "css"].includes(lang.toLowerCase());

                  return (
                    <div className="my-3 overflow-hidden rounded-2xl border border-border bg-card">
                      <div className="flex items-center justify-between border-b border-border bg-card-hover px-4 py-2 text-xs text-text-secondary">
                        <span className="font-mono font-medium text-text-secondary">{badgeText}</span>
                        <div className="flex items-center gap-2">
                          {isPreviewable && (
                            <button
                              type="button"
                              onClick={() => setPreviewCode({ code: rawCode, lang: lang.toLowerCase() })}
                              className="flex items-center gap-1 rounded-lg px-2 py-1 transition-colors hover:bg-card hover:text-green-400 font-medium"
                            >
                              <Globe className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Preview</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopyCode(rawCode, codeId)}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 transition-colors hover:bg-card hover:text-text"
                          >
                            {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            <span className="hidden sm:inline">{isCopied ? "Copied" : "Copy"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadCode(rawCode, lang)}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 transition-colors hover:bg-card hover:text-text"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Download</span>
                          </button>
                        </div>
                      </div>
                      <div className="overflow-x-auto p-4 text-xs font-mono">
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </div>
                    </div>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
            {message.streaming && <span className="streaming-caret" />}
          </div>
        )}

        {!editing && (
          <div className="flex items-center gap-1 text-text-secondary opacity-0 transition-opacity group-hover:opacity-100">
            <button onClick={handleCopy} className="rounded-lg p-1.5 hover:bg-card hover:text-text" title="Копировать">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {isUser && onEdit && (
              <button onClick={() => setEditing(true)} className="rounded-lg p-1.5 hover:bg-card hover:text-text" title="Редактировать">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {!isUser && onRegenerate && (
              <button
                onClick={() => onRegenerate(message.id)}
                className="rounded-lg p-1.5 hover:bg-card hover:text-text"
                title="Перегенерировать ответ"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
            {onPin && (
              <button onClick={() => onPin(message.id)} className={cn("rounded-lg p-1.5 hover:bg-card", message.is_pinned ? "text-accent" : "hover:text-text")} title="Закрепить">
                <Pin className="h-3.5 w-3.5" />
              </button>
            )}
            {!isUser && onContinue && (
              <button
                onClick={() => onContinue(message.id)}
                className="rounded-lg p-1.5 hover:bg-card hover:text-text flex items-center gap-1 text-xs"
                title="Продолжить генерацию"
              >
                <Play className="h-3.5 w-3.5" /> Продолжить
              </button>
            )}
            {onDelete && (
              <button onClick={() => onDelete(message.id)} className="rounded-lg p-1.5 hover:bg-card hover:text-red-400" title="Удалить">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className={cn("mt-1 flex shrink-0 items-center justify-center rounded-full bg-card font-semibold text-text", compactMode ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-xs")}>
          {initialsFromName(userName || "U")}
        </div>
      )}

      <AnimatePresence>
        {previewCode && (
          <CodePreviewModal
            code={previewCode.code}
            language={previewCode.lang}
            onClose={() => setPreviewCode(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
