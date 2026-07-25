export type ModelId = "claude";
export type ModeId = "fast" | "smart" | "reasoning" | "research" | "vision" | "video";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  tokens_used: number;
}

export interface ProfileStats {
  user: User;
  chat_count: number;
  message_count: number;
}

export interface Attachment {
  file_id: string;
  url: string;
  name: string;
  content_type: string;
  kind: "image" | "document";
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model: string | null;
  mode: string | null;
  attachments: Attachment[] | null;
  is_edited: boolean;
  is_pinned?: boolean;
  created_at: string;
  streaming?: boolean;
}

export interface Folder {
  id: string;
  name: string;
  color?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  folder_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatSessionDetail extends ChatSession {
  messages: Message[];
}

export interface MemoryEntry {
  id: string;
  category: string;
  content: string;
  created_at: string;
}

export interface SearchResult {
  session_id: string;
  session_title: string;
  message_id: string;
  snippet: string;
  created_at: string;
}

export interface Instructions {
  instructions_about_me: string;
  instructions_response_style: string;
  default_model: ModelId;
  default_mode: ModeId;
}
