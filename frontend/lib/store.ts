import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiRequest } from "@/lib/api";
import type { Attachment, ChatSession, Folder, ModeId, ModelId, User } from "@/lib/types";

interface AuthState {
  accessToken: string | null;
  user: User | null;
  hydrated: boolean;
  setAccessToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  clear: () => void;
  setHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      hydrated: false,
      setAccessToken: (token) => set({ accessToken: token }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: null, user: null }),
      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: "dreyz-ai-auth",
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);

interface UIState {
  sidebarOpen: boolean;
  hotkeysModalOpen: boolean;
  pipWindow: Window | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setHotkeysModalOpen: (open: boolean) => void;
  setPipWindow: (win: Window | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  hotkeysModalOpen: false,
  pipWindow: null,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setHotkeysModalOpen: (open) => set({ hotkeysModalOpen: open }),
  setPipWindow: (win) => set({ pipWindow: win }),
}));

interface PreferencesState {
  model: ModelId;
  mode: ModeId;
  compactMode: boolean;
  setModel: (m: ModelId) => void;
  setMode: (m: ModeId) => void;
  setCompactMode: (compact: boolean) => void;
  toggleCompactMode: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      model: "claude",
      mode: "smart",
      compactMode: false,
      setModel: (m) => set({ model: m }),
      setMode: (m) => set({ mode: m }),
      setCompactMode: (compact) => set({ compactMode: compact }),
      toggleCompactMode: () => set((s) => ({ compactMode: !s.compactMode })),
    }),
    { name: "dreyz-ai-preferences" }
  )
);

interface SessionsState {
  sessions: ChatSession[];
  setSessions: (sessions: ChatSession[]) => void;
  upsertSession: (session: ChatSession) => void;
  removeSession: (id: string) => void;
}

export const useSessionsStore = create<SessionsState>((set) => ({
  sessions: [],
  setSessions: (sessions) => set({ sessions }),
  upsertSession: (session) =>
    set((s) => {
      const exists = s.sessions.some((x) => x.id === session.id);
      const next = exists ? s.sessions.map((x) => (x.id === session.id ? session : x)) : [session, ...s.sessions];
      next.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      return { sessions: next };
    }),
  removeSession: (id) => set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) })),
}));

interface FolderState {
  folders: Folder[];
  setFolders: (folders: Folder[]) => void;
  fetchFolders: () => Promise<void>;
  createFolder: (name: string, color?: string) => Promise<Folder | null>;
  deleteFolder: (id: string) => Promise<void>;
  moveSessionToFolder: (sessionId: string, folderId: string | null) => Promise<void>;
}

export const useFolderStore = create<FolderState>((set) => ({
  folders: [],
  setFolders: (folders) => set({ folders }),
  fetchFolders: async () => {
    try {
      const data = await apiRequest<Folder[]>("/folders");
      if (Array.isArray(data)) {
        set({ folders: data });
      }
    } catch {
      /* ignore endpoint errors */
    }
  },
  createFolder: async (name: string, color = "#3b82f6") => {
    try {
      const folder = await apiRequest<Folder>("/folders", {
        method: "POST",
        body: JSON.stringify({ name, color }),
      });
      if (folder && folder.id) {
        set((s) => ({ folders: [...s.folders, folder] }));
        return folder;
      }
    } catch {
      /* fallback store update if backend endpoint not active */
      const localFolder: Folder = {
        id: crypto.randomUUID(),
        name,
        color,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      set((s) => ({ folders: [...s.folders, localFolder] }));
      return localFolder;
    }
    return null;
  },
  deleteFolder: async (id: string) => {
    try {
      await apiRequest(`/folders/${id}`, { method: "DELETE" });
    } catch {
      /* fallback */
    }
    set((s) => ({ folders: s.folders.filter((f) => f.id !== id) }));
    const currentSessions = useSessionsStore.getState().sessions;
    const updated = currentSessions.map((sess) => (sess.folder_id === id ? { ...sess, folder_id: null } : sess));
    useSessionsStore.getState().setSessions(updated);
  },
  moveSessionToFolder: async (sessionId: string, folderId: string | null) => {
    try {
      await apiRequest(`/chat/sessions/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ folder_id: folderId }),
      });
    } catch {
      /* fallback */
    }
    const currentSessions = useSessionsStore.getState().sessions;
    const updated = currentSessions.map((sess) => (sess.id === sessionId ? { ...sess, folder_id: folderId } : sess));
    useSessionsStore.getState().setSessions(updated);
  },
}));

interface ThemeState {
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      setTheme: (theme) => {
        set({ theme });
        if (typeof document !== "undefined") {
          if (theme === "dark") {
            document.documentElement.classList.add("dark");
            document.documentElement.setAttribute("data-theme", "dark");
          } else {
            document.documentElement.classList.remove("dark");
            document.documentElement.setAttribute("data-theme", "light");
          }
        }
      },
      toggleTheme: () => {
        const next = get().theme === "dark" ? "light" : "dark";
        get().setTheme(next);
      },
    }),
    { name: "dreyz-ai-theme" }
  )
);

export type ToastVariant = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, variant?: ToastVariant) => void;
  dismiss: (id: string) => void;
}

interface PendingMessage {
  content: string;
  attachments: Attachment[];
}

interface PendingMessageState {
  pending: Record<string, PendingMessage>;
  setPending: (sessionId: string, message: PendingMessage) => void;
  consumePending: (sessionId: string) => PendingMessage | null;
}

export const usePendingMessageStore = create<PendingMessageState>((set, get) => ({
  pending: {},
  setPending: (sessionId, message) => set((s) => ({ pending: { ...s.pending, [sessionId]: message } })),
  consumePending: (sessionId) => {
    const message = get().pending[sessionId] ?? null;
    if (message) {
      set((s) => {
        const next = { ...s.pending };
        delete next[sessionId];
        return { pending: next };
      });
    }
    return message;
  },
}));

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, variant = "info") =>
    set((s) => ({ toasts: [...s.toasts, { id: crypto.randomUUID(), message, variant }] })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
