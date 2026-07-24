# Project: Dreyze AI

3# Architecture
- Frontend: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Zustand v5.
- Backend: Python FastAPI, SQLAlchemy 2.0 (async), PostgreSQL, Pydantic v2.
- Core Client State: Zustand `usePreferencesStore`, `useUIStore`, `useSessionsStore` in `frontend/lib/store.ts`.
- Core Components: `ChatMessage.tsx`, `MessageList.tsx`, `Sidebar.tsx`, `SettingsSection.tsx`, `app/(app)/settings/page.tsx`.

3# Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-----------------------------------------------------------------------------------------------------|-------------|--------|
| 1 | Core UX Enhancements | Features 4, 5, 6 (Copy assistant msg, Code block Copy/Download header, Compact Mode) | none | IN_PROGRESS |
| 2 | Chat Interaction & Controls | Features 7-13 (Smart Scroll, Token Count, PIP, Continue Btn, Pinned Rules, Dislike/Feedback, Context Menu) | M1 | PLANNED |
| 3 | UI Feedback & Customization | Features 14-21 (Skeletons, Sound FX, Personas, Temp Slider, Slash Prompts, Smooth Tables, Themes, Color Accents) | M1, M2 | PLANNED |
| 4 | Smart Features & Analytics | Features 22-26 (Auto-Summary, Chat Mood, Philosophical Qs, Pre-send Linters, Diff Blocks) | M1, M2, M3 | PLANNED |
| 5 | Chat Management & Offline Support | Features 27-32 (Multi-select Delete, In-chat Search, Typing Animation, Archive Chats, Bookmarks, PWA Offline) | M1-M4 | PLANNED |

3# Interface Contracts
### PreferencesStore Extensions
- compactMode: boolean (default false)
- setCompactMode: (compact: boolean) => void
- toggleCompactMode: () => void

### CodeBlock Interface & Language Extensions
- extractText(children: ReactNode): string
- handleDownloadCode(codeText: string, lang: string): void
-  LANGUAGE_EXTENSIONS: Map of programming languages to file extensions.

## Code Layout
- Frontend Root: /root/project/frontend
- Stores: frontend/lib/store.ts
- Chat Components: frontend/components/chat/ChatMessage.tsx, MessageList.tsx
- Layout Components: frontend/components/layout/Sidebar.tsx
- Settings Pages: frontend/app/(app)/settings/page.tsx
