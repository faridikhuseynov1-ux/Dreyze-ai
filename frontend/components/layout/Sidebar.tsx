"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Folder as FolderIcon,
  Keyboard,
  MessageSquare,
  Moon,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { UserDropdown } from "@/components/layout/UserDropdown";
import { EditProfileModal } from "@/components/layout/EditProfileModal";
import { SettingsModal } from "@/components/layout/SettingsModal";
import { apiRequest, ApiError } from "@/lib/api";
import {
  useAuthStore,
  useFolderStore,
  useSessionsStore,
  usePreferencesStore,
  useThemeStore,
  useToastStore,
  useUIStore,
} from "@/lib/store";
import type { ChatSession, SearchResult } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";

const FOLDER_COLORS = ["#ffffff", "#d4d4d4", "#a3a3a3", "#737373", "#525252", "#262626"];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const setHotkeysModalOpen = useUIStore((s) => s.setHotkeysModalOpen);

  const sessions = useSessionsStore((s) => s.sessions);
  const setSessions = useSessionsStore((s) => s.setSessions);
  const removeSession = useSessionsStore((s) => s.removeSession);

  const folders = useFolderStore((s) => s.folders);
  const fetchFolders = useFolderStore((s) => s.fetchFolders);
  const createFolder = useFolderStore((s) => s.createFolder);
  const deleteFolder = useFolderStore((s) => s.deleteFolder);
  const moveSessionToFolder = useFolderStore((s) => s.moveSessionToFolder);

  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const clearAuth = useAuthStore((s) => s.clear);
  const pushToast = useToastStore((s) => s.push);
  const compactMode = usePreferencesStore((s) => s.compactMode);

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const [activeMenuSessionId, setActiveMenuSessionId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    apiRequest<ChatSession[]>("/chat/sessions")
      .then(setSessions)
      .catch(() => {});
    fetchFolders();
  }, [setSessions, fetchFolders]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await apiRequest<SearchResult[]>(`/chat/search?q=${encodeURIComponent(query)}`);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      }
    }, 250);
  }, [query]);

  const filteredSessions = useMemo(() => {
    if (!query.trim()) return sessions;
    const lower = query.toLowerCase();
    return sessions.filter((s) => s.title.toLowerCase().includes(lower));
  }, [sessions, query]);

  const toggleFolderExpand = (folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: prev[folderId] === undefined ? false : !prev[folderId],
    }));
  };

  async function handleNewChat() {
    setSidebarOpen(false);
    router.push("/chat");
  }

  async function handleCreateFolderSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await createFolder(newFolderName.trim(), newFolderColor);
      setNewFolderName("");
      setIsCreatingFolder(false);
      pushToast("Папка создана", "success");
    } catch {
      pushToast("Не удалось создать папку", "error");
    }
  }

  async function handleDeleteFolderClick(id: string, name: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Удалить папку "${name}"? Чат-сессии останутся без папки.`)) return;
    try {
      await deleteFolder(id);
      pushToast("Папка удалена", "info");
    } catch {
      pushToast("Не удалось удалить папку", "error");
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Удалить этот чат?")) return;
    try {
      await apiRequest(`/chat/sessions/${id}`, { method: "DELETE" });
      removeSession(id);
      if (pathname === `/chat/${id}`) router.push("/chat");
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : "Не удалось удалить чат", "error");
    }
  }

  function startRename(session: ChatSession, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setRenamingId(session.id);
    setRenameValue(session.title);
    setActiveMenuSessionId(null);
  }

  async function commitRename(id: string) {
    const title = renameValue.trim();
    setRenamingId(null);
    if (!title) return;
    try {
      const updated = await apiRequest<ChatSession>(`/chat/sessions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      });
      setSessions(sessions.map((s) => (s.id === id ? updated : s)));
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : "Не удалось переименовать чат", "error");
    }
  }

  async function handleLogout() {
    clearAuth();
    setSidebarOpen(false);
    router.replace("/login");

    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
  }

  // Render individual session item
  const renderSessionItem = (session: ChatSession) => {
    const active = pathname === `/chat/${session.id}`;
    return (
      <div key={session.id} className="relative group">
        <Link
          href={`/chat/${session.id}`}
          onClick={() => setSidebarOpen(false)}
          className={cn(
            "flex min-h-10 items-center gap-2 rounded-xl transition-colors",
            compactMode ? "px-2.5 py-1 text-xs" : "px-3 py-2 text-sm",
            active ? "bg-card-hover text-text shadow-sm" : "text-text-secondary hover:bg-card-hover hover:text-text"
          )}
        >
          <MessageSquare className={cn("shrink-0", compactMode ? "h-3.5 w-3.5" : "h-4 w-4")} />
          {renamingId === session.id ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => commitRename(session.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename(session.id);
                if (e.key === "Escape") setRenamingId(null);
              }}
              onClick={(e) => e.preventDefault()}
              className="w-full bg-transparent text-sm outline-none"
            />
          ) : (
            <span className="flex-1 truncate">{session.title}</span>
          )}

          <span className="flex shrink-0 items-center gap-1 opacity-80 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveMenuSessionId(activeMenuSessionId === session.id ? null : session.id);
              }}
              className="rounded-md p-1 text-text-secondary hover:text-text"
              title="Меню"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => startRename(session, e)}
              className="rounded-md p-1 text-text-secondary hover:text-text"
              title="Переименовать"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => handleDelete(session.id, e)}
              className="rounded-md p-1 text-text-secondary hover:text-red-400"
              title="Удалить"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </span>
          <span className="hidden shrink-0 text-xs text-text-secondary sm:inline sm:group-hover:hidden">
            {formatRelativeTime(session.updated_at)}
          </span>
        </Link>

        {/* Dropdown Menu for moving to folder */}
        {activeMenuSessionId === session.id && (
          <div className="absolute right-2 top-8 z-30 w-48 rounded-2xl border border-border bg-card p-2 shadow-xl">
            <p className="px-2 py-1 text-xs font-semibold text-text-secondary">Переместить в папку</p>
            <button
              onClick={async () => {
                await moveSessionToFolder(session.id, null);
                setActiveMenuSessionId(null);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-xs transition-colors hover:bg-card-hover",
                !session.folder_id ? "text-text font-medium" : "text-text-secondary"
              )}
            >
              <FolderIcon className="h-3.5 w-3.5" />
              Без папки
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={async () => {
                  await moveSessionToFolder(session.id, f.id);
                  setActiveMenuSessionId(null);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-xs transition-colors hover:bg-card-hover",
                  session.folder_id === f.id ? "text-text font-medium" : "text-text-secondary"
                )}
              >
                <FolderIcon className="h-3.5 w-3.5" style={{ color: f.color || "currentColor" }} />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const content = (
    <div className="flex h-full w-full flex-col bg-card/88 shadow-2xl shadow-black/10 backdrop-blur-3xl md:bg-card/72 md:shadow-none">
      <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Dreyze AI" width={28} height={28} className="h-7 w-7 object-contain" />
          <span className="text-sm font-semibold tracking-tight">Dreyze AI</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-1.5 text-text-secondary hover:text-text hover:bg-card-hover"
            title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setHotkeysModalOpen(true)}
            className="rounded-lg p-1.5 text-text-secondary hover:text-text hover:bg-card-hover"
            title="Горячие клавиши (Ctrl+/)"
          >
            <Keyboard className="h-4 w-4" />
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-text-secondary hover:text-text md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-2">
          <button
            onClick={handleNewChat}
            className={cn(
            "flex w-full items-center gap-2 rounded-2xl bg-text font-medium text-bg shadow-sm transition-colors hover:opacity-90",
            compactMode ? "px-3 py-1.5 text-xs" : "px-3 py-2.5 text-sm"
          )}
        >
          <Plus className={cn("shrink-0", compactMode ? "h-3.5 w-3.5" : "h-4 w-4")} />
          Новый чат
        </button>

        <button
          onClick={() => setIsCreatingFolder(!isCreatingFolder)}
          className="flex w-full items-center gap-2 rounded-xl bg-transparent px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-card-hover hover:text-text"
        >
          <FolderPlus className="h-3.5 w-3.5" />
          Новая папка
        </button>
      </div>

      {isCreatingFolder && (
        <form onSubmit={handleCreateFolderSubmit} className="mx-4 mb-3 rounded-2xl border border-border bg-bg p-3">
          <p className="text-xs font-semibold text-text mb-2">Новая папка</p>
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Название папки"
            className="w-full rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-text outline-none focus:border-accent"
          />
          <div className="mt-2 flex items-center justify-between">
            <div className="flex gap-1">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewFolderColor(c)}
                  className={cn(
                    "h-4 w-4 rounded-full transition-transform",
                    newFolderColor === c && "scale-125 ring-2 ring-white"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setIsCreatingFolder(false)}
                className="rounded-lg px-2 py-1 text-xs text-text-secondary hover:text-text"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="rounded-lg bg-text px-2 py-1 text-xs font-medium text-bg hover:opacity-90"
              >
                Создать
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 rounded-xl bg-card-hover px-3 py-2">
          <Search className="h-4 w-4 text-text-secondary shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск..."
            className="w-full bg-transparent text-sm text-text placeholder:text-text-secondary outline-none"
          />
        </div>
      </div>

      <div className={cn("flex-1 overflow-y-auto px-2 pb-2", compactMode ? "space-y-1.5" : "space-y-3")}>
        {searchResults && searchResults.length > 0 && (
          <div className="mb-2">
            <p className="px-2 py-1 text-xs uppercase tracking-wide text-text-secondary">Сообщения</p>
            {searchResults.map((r) => (
              <Link
                key={r.message_id}
                href={`/chat/${r.session_id}`}
                onClick={() => setSidebarOpen(false)}
                className="block rounded-xl px-3 py-2 text-sm text-text-secondary hover:bg-card-hover hover:text-text"
              >
                <p className="truncate font-medium text-text">{r.session_title}</p>
                <p className="truncate text-xs">{r.snippet}</p>
              </Link>
            ))}
            <div className="my-2 border-t border-border" />
          </div>
        )}

        {/* Folders Section */}
        {folders.map((folder) => {
          const folderSessions = filteredSessions.filter((s) => s.folder_id === folder.id);
          const isExpanded = expandedFolders[folder.id] !== false; // expanded by default

          return (
            <div key={folder.id} className="space-y-1">
              <div
                onClick={() => toggleFolderExpand(folder.id)}
                className="group flex items-center justify-between rounded-xl px-2 py-1.5 text-xs font-medium text-text-secondary hover:bg-card-hover hover:text-text cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                  <FolderIcon className="h-3.5 w-3.5 shrink-0" style={{ color: folder.color || "currentColor" }} />
                  <span className="truncate text-text font-semibold">{folder.name}</span>
                  <span className="rounded-full bg-bg px-1.5 py-0.5 text-[10px] text-text-secondary">
                    {folderSessions.length}
                  </span>
                </div>

                <button
                  onClick={(e) => handleDeleteFolderClick(folder.id, folder.name, e)}
                  className="hidden rounded-md p-1 hover:text-red-400 group-hover:block"
                  title="Удалить папку"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>

              {isExpanded && (
                <div className="pl-3 space-y-0.5 border-l border-border/40 ml-3">
                  {folderSessions.map(renderSessionItem)}
                  {folderSessions.length === 0 && (
                    <p className="py-1 px-3 text-xs text-text-secondary italic">Пустая папка</p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Ungrouped / All Chats Section */}
        <div className="space-y-1">
          {folders.length > 0 && (
            <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Без папки ({filteredSessions.filter((s) => !s.folder_id).length})
            </div>
          )}

          {filteredSessions
            .filter((s) => (folders.length > 0 ? !s.folder_id : true))
            .map(renderSessionItem)}
        </div>

        {filteredSessions.length === 0 && !searchResults && (
          <p className="px-3 py-6 text-center text-sm text-text-secondary">Пока нет чатов</p>
        )}
      </div>

      <div className="border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <UserDropdown 
          onOpenProfile={() => setIsProfileModalOpen(true)} 
          onOpenSettings={() => setIsSettingsModalOpen(true)} 
          onLogout={handleLogout}
        />
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden h-full w-72 shrink-0 border-r border-border md:block lg:w-80">{content}</aside>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 z-50 w-[min(86vw,21rem)] border-r border-border md:hidden"
            >
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isProfileModalOpen && (
          <EditProfileModal onClose={() => setIsProfileModalOpen(false)} />
        )}
        {isSettingsModalOpen && (
          <SettingsModal onClose={() => setIsSettingsModalOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
