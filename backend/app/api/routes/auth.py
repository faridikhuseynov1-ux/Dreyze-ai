import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.rate_limit import limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    generate_csrf_token,
    generate_reset_token,
    generate_verification_code,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.settings import UserSettings
from app.models.user import User
from app.models.verification import PasswordResetToken, VerificationCode
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    RegisterResponse,
    ResendCodeRequest,
    ResetPasswordRequest,
    TokenResponse,
    VerifyCodeRequest,
)
from app.services.email_service import send_password_reset, send_verification_code

router = APIRouter(prefix="/auth", tags=["auth"])

CODE_TTL_MINUTES = 10
RESET_TTL_HOURS = 1
MAX_CODE_ATTEMPTS = 5

REFRESH_COOKIE = "refresh_token"
CSRF_COOKIE = "csrf_token"


def _set_auth_cookies(response: Response, refresh_token: str) -> str:
    csrf_token = generate_csrf_token()
    secure = not settings.FRONTEND_URL.startswith("http://localhost")
    response.set_cookie(
        REFRESH_COOKIE,
        refresh_token,
        httponly=True,
        secure=secure,
        samesite="none" if secure else "lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/api/auth",
    )
    response.set_cookie(
        CSRF_COOKIE,
        csrf_token,
        httponly=False,
        secure=secure,
        samesite="none" if secure else "lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/",
    )
    return csrf_token


def _verify_csrf(request: Request) -> None:
    cookie_token = request.cookies.get(CSRF_COOKIE)
    header_token = request.headers.get("X-CSRF-Token")
    if not cookie_token or not header_token or cookie_token != header_token:
        print(f"CSRF FAIL: cookie={cookie_token}, header={header_token}"); raise HTTPException(status.HTTP_403_FORBIDDEN, "CSRF token missing or invalid")


@router.post("/register", response_model=RegisterResponse)
@limiter.limit("5/minute")
async def register(request: Request, payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if payload.password != payload.confirm_password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Passwords do not match")

    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    # Invalidate any previous pending codes for this email
    await db.execute(delete(VerificationCode).where(VerificationCode.email == payload.email))

    code = generate_verification_code()
    verification = VerificationCode(
        email=payload.email,
        name=payload.name,
        password_hash=hash_password(payload.password),
        code=code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=CODE_TTL_MINUTES),
    )
    db.add(verification)
    await db.commit()

    await send_verification_code(payload.email, code, payload.name)
    return RegisterResponse(email=payload.email)


@router.post("/resend-code", response_model=MessageResponse)
@limiter.limit("3/minute")
async def resend_code(request: Request, payload: ResendCodeRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(VerificationCode)
        .where(VerificationCode.email == payload.email, VerificationCode.consumed.is_(False))
        .order_by(VerificationCode.created_at.desc())
    )
    verification = result.scalars().first()
    if verification is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No pending registration for this email")

    verification.code = generate_verification_code()
    verification.attempts = 0
    verification.expires_at = datetime.now(timezone.utc) + timedelta(minutes=CODE_TTL_MINUTES)
    await db.commit()

    await send_verification_code(payload.email, verification.code, verification.name)
    return MessageResponse(message="Code resent")


@router.post("/verify", response_model=TokenResponse)
@limiter.limit("10/minute")
async def verify_code(
    request: Request, response: Response, payload: VerifyCodeRequest, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(VerificationCode)
        .where(VerificationCode.email == payload.email, VerificationCode.consumed.is_(False))
        .order_by(VerificationCode.created_at.desc())
    )
    verification = result.scalars().first()
    if verification is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No pending registration for this email")

    if datetime.now(timezone.utc) > verification.expires_at.replace(tzinfo=timezone.utc):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Code expired, please request a new one")

    if verification.attempts >= MAX_CODE_ATTEMPTS:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many attempts, request a new code")

    if verification.code != payload.code:
        verification.attempts += 1
        await db.commit()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid code")

    existing = await db.execute(select(User).where(User.email == verification.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    user = User(name=verification.name, email=verification.email, password_hash=verification.password_hash)
    db.add(user)
    await db.flush()

    db.add(UserSettings(user_id=user.id))
    verification.consumed = True
    await db.commit()

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))
    _set_auth_cookies(response, refresh_token)
    return TokenResponse(access_token=access_token)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, response: Response, payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))
    _set_auth_cookies(response, refresh_token)
    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    _verify_csrf(request)
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing refresh token")

    payload = decode_refresh_token(token)
    if payload is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired refresh token")

    user_id = payload["sub"]
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")

    new_access_token = create_access_token(str(user.id))
    new_refresh_token = create_refresh_token(str(user.id))
    _set_auth_cookies(response, new_refresh_token)
    return TokenResponse(access_token=new_access_token)


@router.post("/logout", response_model=MessageResponse)
async def logout(request: Request, response: Response):
    _verify_csrf(request)
    response.delete_cookie(REFRESH_COOKIE, path="/api/auth")
    response.delete_cookie(CSRF_COOKIE, path="/")
    return MessageResponse(message="Logged out")


@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit("3/minute")
async def forgot_password(request: Request, payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    # Always respond the same way to avoid leaking which emails are registered.
    if user is not None:
        await db.execute(delete(PasswordResetToken).where(PasswordResetToken.user_id == user.id))
        token = generate_reset_token()
        db.add(
            PasswordResetToken(
                user_id=user.id,
                token=token,
                expires_at=datetime.now(timezone.utc) + timedelta(hours=RESET_TTL_HOURS),
            )
        )
        await db.commit()
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        await send_password_reset(payload.email, reset_url)

    return MessageResponse(message="If this email exists, a reset link has been sent")


@router.post("/reset-password", response_model=MessageResponse)
@limiter.limit("5/minute")
async def reset_password(request: Request, payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Passwords do not match")

    result = await db.execute(select(PasswordResetToken).where(PasswordResetToken.token == payload.token))
    reset_token = result.scalar_one_or_none()

    if reset_token is None or reset_token.used:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or already used link")
    if datetime.now(timezone.utc) > reset_token.expires_at.replace(tzinfo=timezone.utc):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This link has expired")

    user_result = await db.execute(select(User).where(User.id == reset_token.user_id))
    user = user_result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    user.password_hash = hash_password(payload.new_password)
    reset_token.used = True
    await db.commit()
    return MessageResponse(message="Password updated successfully")
