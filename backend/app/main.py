from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded

from app.api.routes.auth import router as auth_router
from app.api.routes.chat import router as chat_router
from app.api.routes.folders import router as folders_router
from app.api.routes.memory import router as memory_router
from app.api.routes.uploads import router as uploads_router
from app.api.routes.users import router as users_router
from app.api.websocket import router as websocket_router
from app.api.routes.sandbox import router as sandbox_router
from app.core.config import settings
from app.core.rate_limit import limiter
from app.db.session import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    await init_db()
    yield


app = FastAPI(title="Dreyze AI Chat API", version="1.0.0", lifespan=lifespan)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"detail": "Too many requests, please slow down."})


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
# Uploads are no longer served publicly via StaticFiles

from app.api.routes.tts import router as tts_router

app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(folders_router, prefix="/api")
app.include_router(memory_router, prefix="/api")
app.include_router(uploads_router, prefix="/api")
app.include_router(sandbox_router, prefix="/api")
app.include_router(tts_router, prefix="/api")
app.include_router(websocket_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
