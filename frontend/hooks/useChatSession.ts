"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest, ApiError } from "@/lib/api";
import { usePreferencesStore, useSessionsStore, useToastStore } from "@/lib/store";
import type { Attachment, ChatSessionDetail, Message } from "@/lib/types";
import { ChatSocket } from "@/lib/ws";

const STREAMING_ID = "__streaming__";

export function useChatSession(sessionId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const socketRef = useRef<ChatSocket | null>(null);
  const upsertSession = useSessionsStore((s) => s.upsertSession);
  const pushToast = useToastStore((s) => s.push);
  const model = usePreferencesStore((s) => s.model);
  const mode = usePreferencesStore((s) => s.mode);

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    apiRequest<ChatSessionDetail>(`/chat/sessions/${sessionId}`)
      .then((detail) => {
        if (cancelled) return;
        setMessages(detail.messages);
        upsertSession(detail);
      })
      .catch((err) => {
        if (!cancelled) pushToast(err instanceof ApiError ? err.message : "Не удалось загрузить чат", "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const socket = new ChatSocket(sessionId, {
      onUserMessage: (message) => {
        setMessages((prev) => [...prev, message]);
      },
      onChunk: (content) => {
        setIsStreaming(true);
        setMessages((prev) => {
          const existingIndex = prev.findIndex((m) => m.id === STREAMING_ID);
          if (existingIndex === -1) {
            return [
              ...prev,
              {
                id: STREAMING_ID,
                role: "assistant",
                content,
                model: null,
                mode: null,
                attachments: null,
                is_edited: false,
                created_at: new Date().toISOString(),
                streaming: true,
              },
            ];
          }
          const next = [...prev];
          next[existingIndex] = { ...next[existingIndex], content: next[existingIndex].content + content };
          return next;
        });
      },
      onDone: (message) => {
        setIsStreaming(false);
        setIsGenerating(false);
        setMessages((prev) => prev.map((m) => (m.id === STREAMING_ID ? message : m)));
        apiRequest<ChatSessionDetail>(`/chat/sessions/${sessionId}`)
          .then((detail) => upsertSession(detail))
          .catch(() => {});
      },
      onStopped: (message) => {
        setIsStreaming(false);
        setIsGenerating(false);
        setMessages((prev) => prev.map((m) => (m.id === STREAMING_ID ? message : m)));
      },
      onError: (message) => {
        setIsStreaming(false);
        setIsGenerating(false);
        setMessages((prev) => prev.filter((m) => m.id !== STREAMING_ID));
        pushToast(message, "error");
      },
    });
    socket.connect();
    socketRef.current = socket;

    return () => {
      cancelled = true;
      socket.close();
      socketRef.current = null;
    };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback(
    (content: string, attachments: Attachment[]) => {
      setIsGenerating(true);
      socketRef.current?.sendMessage(content, model, mode, attachments);
    },
    [model, mode]
  );

  const regenerate = useCallback(
    (messageId: string) => {
      setIsGenerating(true);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      socketRef.current?.regenerate(messageId, model, mode);
    },
    [model, mode]
  );

  const stop = useCallback(() => {
    socketRef.current?.stop();
  }, []);

  const editMessage = useCallback(
    async (id: string, content: string) => {
      try {
        const updated = await apiRequest<Message>(`/chat/messages/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ content }),
        });
        setMessages((prev) => prev.map((m) => (m.id === id ? updated : m)));
      } catch (err) {
        pushToast(err instanceof ApiError ? err.message : "Не удалось изменить сообщение", "error");
      }
    },
    [pushToast]
  );

  const deleteMessage = useCallback(
    async (id: string) => {
      try {
        await apiRequest(`/chat/messages/${id}`, { method: "DELETE" });
        setMessages((prev) => prev.filter((m) => m.id !== id));
      } catch (err) {
        pushToast(err instanceof ApiError ? err.message : "Не удалось удалить сообщение", "error");
      }
    },
    [pushToast]
  );

  const pinMessage = useCallback(
    async (id: string) => {
      try {
        const pinned = await apiRequest<Message>(`/chat/messages/${id}/pin`, { method: "POST" });
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === id) return { ...m, is_pinned: true };
            return { ...m, is_pinned: false };
          })
        );
      } catch (err) {
        pushToast(err instanceof ApiError ? err.message : "Не удалось закрепить сообщение", "error");
      }
    },
    [pushToast]
  );

  return { messages, loading, isStreaming, isGenerating, sendMessage, regenerate, stop, editMessage, deleteMessage, pinMessage };
}
