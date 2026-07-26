import { API_URL, refreshAccessToken } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import type { Attachment, Message, ModeId, ModelId } from "@/lib/types";

const WS_BASE =
  process.env.NEXT_PUBLIC_WS_URL ||
  API_URL.replace(/^http/, "ws").replace(/\/api$/, "");

export type ServerEvent =
  | { type: "user_message"; message: Message }
  | { type: "chunk"; content: string }
  | { type: "done"; message: Message }
  | { type: "stopped"; message: Message }
  | { type: "usage_update"; tokens_used: number }
  | { type: "error"; message: string };

export interface ChatSocketHandlers {
  onUserMessage: (message: Message) => void;
  onChunk: (content: string) => void;
  onDone: (message: Message) => void;
  onStopped: (message: Message) => void;
  onUsageUpdate?: (tokensUsed: number) => void;
  onError: (message: string) => void;
  onClose?: () => void;
}

export class ChatSocket {
  private ws: WebSocket | null = null;
  private queue: string[] = [];
  private closed = false;

  constructor(
    private sessionId: string,
    private handlers: ChatSocketHandlers
  ) {}

  async connect() {
    let token = useAuthStore.getState().accessToken;
    if (!token) {
      token = await refreshAccessToken();
    }
    const url = `${WS_BASE}/ws/chat/${this.sessionId}?token=${encodeURIComponent(token || "")}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      if (this.closed) {
        this.ws?.close();
        return;
      }
      this.queue.forEach((msg) => this.ws?.send(msg));
      this.queue = [];
    };

    this.ws.onmessage = (event) => {
      const data: ServerEvent = JSON.parse(event.data);
      switch (data.type) {
        case "user_message":
          this.handlers.onUserMessage(data.message);
          break;
        case "chunk":
          this.handlers.onChunk(data.content);
          break;
        case "done":
          this.handlers.onDone(data.message);
          break;
        case "stopped":
          this.handlers.onStopped(data.message);
          break;
        case "usage_update":
          this.handlers.onUsageUpdate?.(data.tokens_used);
          break;
        case "error":
          this.handlers.onError(data.message);
          break;
      }
    };

    this.ws.onerror = () => {
      this.handlers.onError("Не удалось подключиться к AI. Обновите страницу и попробуйте еще раз.");
    };

    this.ws.onclose = (event) => {
      if (!event.wasClean && this.queue.length > 0) {
        this.handlers.onError("Соединение с AI закрылось до отправки сообщения.");
        this.queue = [];
      }
      this.handlers.onClose?.();
    };
  }

  private sendRaw(payload: object) {
    if (this.closed) {
      this.handlers.onError("Соединение с AI уже закрыто. Обновите страницу и попробуйте снова.");
      return;
    }
    const json = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(json);
    } else {
      this.queue.push(json);
    }
  }

  sendMessage(content: string, model: ModelId, mode: ModeId, attachments: Attachment[]) {
    this.sendRaw({ type: "send", content, model, mode, attachments });
  }

  regenerate(messageId: string, model: ModelId, mode: ModeId) {
    this.sendRaw({ type: "regenerate", message_id: messageId, model, mode });
  }

  stop() {
    this.sendRaw({ type: "stop" });
  }

  close() {
    this.closed = true;
    this.queue = [];
    this.ws?.close();
    this.ws = null;
  }
}
