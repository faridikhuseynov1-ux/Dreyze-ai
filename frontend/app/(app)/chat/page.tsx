"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChatInput } from "@/components/chat/ChatInput";
import { EmptyState } from "@/components/chat/EmptyState";
import { TopBar } from "@/components/layout/TopBar";
import { apiRequest, ApiError } from "@/lib/api";
import { usePendingMessageStore, useSessionsStore, useToastStore, usePreferencesStore } from "@/lib/store";
import { VideoGenerator } from "@/components/chat/VideoGenerator";
import type { Attachment, ChatSession } from "@/lib/types";

export default function NewChatPage() {
  const router = useRouter();
  const upsertSession = useSessionsStore((s) => s.upsertSession);
  const setPending = usePendingMessageStore((s) => s.setPending);
  const pushToast = useToastStore((s) => s.push);
  const mode = usePreferencesStore((s) => s.mode);
  const [creating, setCreating] = useState(false);

  if (mode === "video") {
    return (
      <div className="flex h-full flex-col">
        <TopBar />
        <VideoGenerator />
      </div>
    );
  }

  async function handleSend(content: string, attachments: Attachment[]) {
    if (creating) return;
    setCreating(true);
    try {
      const session = await apiRequest<ChatSession>("/chat/sessions", { method: "POST", body: JSON.stringify({}) });
      upsertSession(session);
      setPending(session.id, { content, attachments });
      router.push(`/chat/${session.id}`);
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : "Не удалось создать чат", "error");
      setCreating(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <EmptyState />
      <ChatInput onSend={handleSend} isStreaming={creating} onStop={() => {}} />
    </div>
  );
}
