# Dreyze AI Chat

Приватный AI-чат в стиле ChatGPT/Claude: Next.js 15 + FastAPI + PostgreSQL, с
множеством моделей через OpenRouter, долговременной памятью, кастомными
инструкциями, вложениями и потоковой генерацией через WebSocket.

## Стек

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Framer Motion, Lucide Icons, Zustand
- **Backend**: FastAPI, SQLAlchemy 2.0 (async), PostgreSQL, JWT (access + refresh), bcrypt
- **Realtime**: нативный WebSocket (потоковая генерация, стоп-генерация, regenerate)
- **AI**: OpenRouter (единый API-ключ на сервере, никогда не передаётся клиенту)
- **Email**: Resend (код подтверждения, сброс пароля)

## Структура проекта

```
backend/
  app/
    core/        # конфиг, security (JWT/bcrypt), rate limit
    db/          # SQLAlchemy engine/session
    models/      # ORM-модели (users, verification_codes, password_reset_tokens,
                 #   chat_sessions, messages, memory, settings, uploaded_files)
    schemas/     # Pydantic-схемы запросов/ответов
    services/    # email (Resend), ai (OpenRouter), memory, websocket manager
    api/routes/  # auth, users, chat, memory, uploads
    api/websocket.py
    main.py
frontend/
  app/(auth)/    # login, register, verify, forgot-password, reset-password
  app/(app)/     # chat, chat/[sessionId], settings, profile, memory (защищены)
  components/    # ui, layout, chat, auth, settings
  lib/           # api client, websocket client, zustand store, types, utils
  hooks/         # useChatSession
```

## 1. Backend

### 1.1 PostgreSQL

Создайте базу данных, например:

```bash
createdb aichat
```

### 1.2 Переменные окружения

Скопируйте `backend/.env.example` в `backend/.env` (в этом репозитории `.env`
уже создан и заполнен вашими реальными ключами — **не коммитьте его в git**,
он уже добавлен в `.gitignore`).

Ключевые переменные:

| Переменная | Назначение |
|---|---|
| `DATABASE_URL` | строка подключения PostgreSQL (`postgresql+asyncpg://...`) |
| `JWT_SECRET_KEY` / `JWT_REFRESH_SECRET_KEY` | секреты для access/refresh токенов (уже сгенерированы) |
| `FRONTEND_URL` | адрес фронтенда — используется в CORS и в ссылке сброса пароля |
| `RESEND_API_KEY` | ключ Resend (уже подставлен) |
| `EMAIL_FROM` | адрes отправителя, например `Dreyze AI <noreply@dreyzfarid.online>` |
| `OPENROUTER_API_KEY` | ключ OpenRouter (уже подставлен) |
| `UPLOAD_DIR` | папка для загруженных файлов/изображений |

**Важно про Resend**: чтобы письма реально доставлялись на `dreyzfarid.online`,
домен должен быть верифицирован в панели Resend (SPF/DKIM записи в DNS). Без
верификации домена отправка с адреса `@dreyzfarid.online` будет отклоняться
или попадать в спам.

### 1.3 Установка и запуск

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Таблицы создаются автоматически при старте (`init_db`), миграции не требуются
для первого запуска. Проверка: `curl https://dreyzfarid.online/api/health`.

## 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Переменные окружения в `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=https://dreyzfarid.online/api
NEXT_PUBLIC_WS_URL=wss://dreyzfarid.online
```

Для продакшена на `dreyzfarid.online` укажите реальные адреса backend, например:

```
NEXT_PUBLIC_API_URL=https://dreyzfarid.online/api
NEXT_PUBLIC_WS_URL=wss://dreyzfarid.online
```

и в `backend/.env`:

```
FRONTEND_URL=https://dreyzfarid.online
ALLOWED_ORIGINS=https://dreyzfarid.online
```

## 3. Модели ИИ

Все модели (Gemini, GPT, Claude, DeepSeek, Qwen, Llama, Grok) идут через один
серверный ключ OpenRouter — маппинг на конкретные id моделей находится в
`backend/app/services/ai_service.py::MODEL_CATALOG`. При необходимости замените
конкретные id на другие доступные в вашем аккаунте OpenRouter.

Режимы работы:

- **Быстрый** — облегчённая/дешёвая версия модели, короткие ответы
- **Умный** — базовая версия модели
- **Рассуждение** — модель "thinking"-версии + `reasoning: {effort: high}`
- **Research** — модель вызывается с суффиксом `:online` (веб-поиск OpenRouter)
- **Vision** — изображения инлайнятся как base64 data URI в модель с поддержкой vision

## 4. Память и Custom Instructions

После каждого ответа ассистента фоновая задача (`memory_service.extract_memories`)
лёгкой моделью извлекает полезные факты (имя, предпочтения, стиль, проекты,
цели, интересы) и сохраняет их в таблицу `memory`, если такого факта ещё нет.
Память и Custom Instructions автоматически добавляются в системный промпт
каждого запроса. Управление — на страницах `/memory` и `/settings`.

## 5. Безопасность

- Пароли — только bcrypt (72-байтовый лимit учтён), без сторонних либ
- JWT access (15 мин) в памяти на клиенте, refresh (30 дней) — httpOnly cookie
- CSRF — double-submit cookie для `/auth/refresh` и `/auth/logout`
- Rate limiting (slowapi) на auth-эндпоинтах
- Markdown в чате рендерится через `react-markdown` без `rehype-raw`, поэтому
  сырой HTML/скрипты из сообщений не исполняются (защита от XSS)
- SQL-инъекции исключены за счёт ORM (SQLAlchemy, параметризованные запросы)
- Загруженные файлы проверяются по MIME-типу и размеру (`MAX_UPLOAD_MB`)

## 6. Проверено вручную

В процессе разработки локально поднимались PostgreSQL, backend и frontend, и
был пройден полный цикл: регистрация → реальное письмо с кодом через Resend →
подтверждение → вход → создание чата → реальный потоковый ответ модели через
OpenRouter по WebSocket. Frontend успешно проходит `next build` и `tsc --noEmit`
без ошибок.

Визуальная проверка в headless-браузере в этой песочнице оказалась недоступна
(Chromium не запускается в данном контейнере) — рекомендуется один раз открыть
приложение в обычном браузере после деплоя, чтобы проверить анимации и
адаптивную вёрстку глазами.
