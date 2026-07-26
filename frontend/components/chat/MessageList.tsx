"use client";

import { ChatMessage } from "@/components/chat/ChatMessage";
import type { Message } from "@/lib/types";
import { usePreferencesStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ThinkingIndicator } from "@/components/chat/ThinkingIndicator";

interface MessageListProps {
  messages: Message[];
  userName: string;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onRegenerate: (id: string) => void;
  onPin?: (id: string) => void;
  onContinue?: (id: string) => void;
  isGenerating?: boolean;
}

export function MessageList({ messages, userName, onEdit, onDelete, onRegenerate, onPin, onContinue, isGenerating }: MessageListProps) {
  const compactMode = usePreferencesStore((s) => s.compactMode);

  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  return (
    <div className={cn("mx-auto w-full max-w-3xl flex-1", compactMode ? "py-2" : "py-3 sm:py-4")}>
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          userName={userName}
          onEdit={message.role === "user" ? onEdit : undefined}
          onDelete={onDelete}
          onRegenerate={message.role === "assistant" && message.id === lastAssistantId ? onRegenerate : undefined}
          onPin={onPin}
          onContinue={message.role === "assistant" && message.id === lastAssistantId ? onContinue : undefined}
        />
      ))}
      {isGenerating && messages[messages.length - 1]?.role === "user" && (
        <div className="flex w-full py-2">
          <ThinkingIndicator />
        </div>
      )}
    </div>
  );
}
