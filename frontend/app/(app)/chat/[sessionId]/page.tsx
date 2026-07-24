"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageList } from "@/components/chat/MessageList";
import { TopBar } from "@/components/layout/TopBar";
import { PipWrapper } from "@/components/layout/PipWrapper";
import { useChatSession } from "@/hooks/useChatSession";
import { useAuthStore, usePendingMessageStore, useUIStore } from "@/lib/store";
import { estimateTokens } from "@/lib/utils";

export default function ChatSessionPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const user = useAuthStore((s) => s.user);
  const consumePending = usePendingMessageStore((s) => s.consumePending);
  const { messages, loading, isStreaming, isGenerating, sendMessage, regenerate, stop, editMessage, deleteMessage, pinMessage } =
    useChatSession(sessionId);
  const sentPendingRef = useRef(false);

  useEffect(() => {
    sentPendingRef.current = false;
  }, [sessionId]);

  useEffect(() => {
    if (sentPendingRef.current) return;
    const pending = consumePending(sessionId);
    if (pending) {
      sentPendingRef.current = true;
      sendMessage(pending.content, pending.attachments);
    }
  }, [sessionId, consumePending, sendMessage]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 150;
    isAtBottomRef.current = atBottom;
    if (showScrollButton === atBottom) {
      setShowScrollButton(!atBottom);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const lastMessageContent = messages[messages.length - 1]?.content;

  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg) return;

    if (lastMsg.role === "user" || isAtBottomRef.current) {
      scrollToBottom();
    }
  }, [messages, lastMessageContent]);

  const tokenCount = messages.reduce((acc, msg) => acc + estimateTokens(msg.content), 0);
  const pipWindow = useUIStore((s) => s.pipWindow);

  const handleContinue = () => {
    sendMessage("Продолжи пожалуйста", []);
  };

  const hasForbiddenContent = messages.some(
    (m) =>
      m.role === "assistant" &&
      (m.content.toLowerCase().includes("я не могу ответить") ||
       m.content.toLowerCase().includes("запрещен") ||
       m.content.toLowerCase().includes("cannot answer that") ||
       m.content.toLowerCase().includes("as an ai, i"))
  );
  const disabledMessage = hasForbiddenContent ? "ИИ решила, что вы спрашиваете что-то запрещенное." : undefined;

  return (
    <PipWrapper pipWindow={pipWindow}>
      <div className="flex h-full flex-col">
      <TopBar tokenCount={tokenCount} />
      <div className="flex-1 overflow-y-auto" ref={scrollRef} onScroll={handleScroll}>
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-white" />
          </div>
        ) : (
          <MessageList
            messages={messages}
            userName={user?.name || ""}
            onEdit={editMessage}
            onDelete={deleteMessage}
            onRegenerate={regenerate}
            onPin={pinMessage}
            onContinue={handleContinue}
            isGenerating={isGenerating}
          />
        )}
      </div>
      <div className="relative">
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute -top-12 left-1/2 -translate-x-1/2 rounded-full bg-border/80 p-2 text-white shadow-lg backdrop-blur hover:bg-border transition-all"
            aria-label="Scroll to bottom"
          >
            <ChevronDown size={20} />
          </button>
        )}
        <ChatInput onSend={sendMessage} isStreaming={isStreaming} onStop={stop} disabledMessage={disabledMessage} />
      </div>
    </div>
    </PipWrapper>
  );
}
