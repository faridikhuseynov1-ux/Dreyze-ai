import io
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, status, Body
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import httpx

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.db.session import get_db
from app.models.chat import ChatSession, Message
from app.models.memory import MemoryEntry
from app.models.settings import UserSettings
from app.models.user import User
from app.schemas.chat import ChatSessionDetail
from app.schemas.user import (
    InstructionsOut,
    ProfileStats,
    UpdateInstructionsRequest,
    UpdatePasswordRequest,
    UpdateProfileRequest,
    UserOut,
    GithubOut,
    UpdateGithubRequest,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)):
    return user


@router.get("/me/profile", response_model=ProfileStats)
async def get_profile(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    chat_count = await db.scalar(
        select(func.count()).select_from(ChatSession).where(ChatSession.user_id == user.id)
    )
    message_count = await db.scalar(
        select(func.count())
        .select_from(Message)
        .join(ChatSession, Message.session_id == ChatSession.id)
        .where(ChatSession.user_id == user.id)
    )
    return ProfileStats(user=UserOut.model_validate(user), chat_count=chat_count or 0, message_count=message_count or 0)


@router.patch("/me", response_model=UserOut)
async def update_profile(
    payload: UpdateProfileRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    if payload.email and payload.email != user.email:
        existing = await db.execute(select(User).where(User.email == payload.email))
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Email already in use")
        user.email = payload.email

    if payload.name:
        user.name = payload.name

    await db.commit()
    await db.refresh(user)
    return user


@router.post("/me/password")
async def update_password(
    payload: UpdatePasswordRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect")

    user.password_hash = hash_password(payload.new_password)
    await db.commit()
    return {"message": "Password updated"}


ALLOWED_AVATAR_TYPES = {"image/png", "image/jpeg", "image/webp"}


@router.post("/me/avatar", response_model=UserOut)
async def upload_avatar(
    file: UploadFile, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unsupported image type")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Avatar must be under 5MB")

    upload_dir = Path(settings.UPLOAD_DIR) / "avatars"
    upload_dir.mkdir(parents=True, exist_ok=True)
    extension = Path(file.filename or "avatar.png").suffix or ".png"
    filename = f"{user.id}{extension}"
    (upload_dir / filename).write_bytes(contents)

    user.avatar_url = f"/uploads/avatars/{filename}"
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/me")
async def delete_account(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.delete(user)
    await db.commit()
    return {"message": "Account deleted"}


@router.delete("/me/history")
async def delete_history(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(delete(ChatSession).where(ChatSession.user_id == user.id))
    await db.commit()
    return {"message": "History deleted"}


@router.delete("/me/memory")
async def delete_all_memory(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(delete(MemoryEntry).where(MemoryEntry.user_id == user.id))
    await db.commit()
    return {"message": "Memory cleared"}


@router.get("/me/export")
async def export_history(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChatSession)
        .options(selectinload(ChatSession.messages))
        .where(ChatSession.user_id == user.id)
        .order_by(ChatSession.created_at)
    )
    sessions = result.scalars().unique().all()

    export_data = [ChatSessionDetail.model_validate(s).model_dump(mode="json") for s in sessions]
    import json

    buffer = io.BytesIO(json.dumps(export_data, ensure_ascii=False, indent=2).encode("utf-8"))
    return Response(
        content=buffer.getvalue(),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=chat_history_export.json"},
    )


@router.get("/me/instructions", response_model=InstructionsOut)
async def get_instructions(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == user.id))
    user_settings = result.scalar_one_or_none()
    if user_settings is None:
        user_settings = UserSettings(user_id=user.id)
        db.add(user_settings)
        await db.commit()
        await db.refresh(user_settings)
    return user_settings


@router.put("/me/instructions", response_model=InstructionsOut)
async def update_instructions(
    payload: UpdateInstructionsRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == user.id))
    user_settings = result.scalar_one_or_none()
    if user_settings is None:
        user_settings = UserSettings(user_id=user.id)
        db.add(user_settings)

    user_settings.instructions_about_me = payload.instructions_about_me
    user_settings.instructions_response_style = payload.instructions_response_style
    await db.commit()
    await db.refresh(user_settings)
    return user_settings


@router.get("/me/github", response_model=GithubOut)
async def get_github(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == user.id))
    user_settings = result.scalar_one_or_none()
    
    if user_settings is None:
        return GithubOut(github_token=None, is_connected=False)
        
    return GithubOut(
        github_token=user_settings.github_token,
        is_connected=bool(user_settings.github_token)
    )

@router.put("/me/github", response_model=GithubOut)
async def update_github(
    payload: UpdateGithubRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == user.id))
    user_settings = result.scalar_one_or_none()
    
    if user_settings is None:
        user_settings = UserSettings(user_id=user.id)
        db.add(user_settings)
        
    user_settings.github_token = payload.github_token
    await db.commit()
    
    return GithubOut(
        github_token=user_settings.github_token,
        is_connected=bool(user_settings.github_token)
    )

@router.post("/me/github/action")
async def github_action(
    payload: dict = Body(...), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    action = payload.get("action")
    if action != "push":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unsupported action")
        
    repo = payload.get("repo")
    message = payload.get("message", "Update from Dreyze AI")
    files = payload.get("files", [])
    
    if not repo or not files:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Missing repo or files")
        
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == user.id))
    user_settings = result.scalar_one_or_none()
    
    if not user_settings or not user_settings.github_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "GitHub token not found in settings")
        
    token = user_settings.github_token
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }
    
    async with httpx.AsyncClient() as client:
        # 1. Get default branch
        repo_res = await client.get(f"https://api.github.com/repos/{repo}", headers=headers)
        if repo_res.status_code != 200:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"Repository not found or access denied: {repo_res.text}")
        default_branch = repo_res.json().get("default_branch", "main")
        
        # 2. Get ref for default branch
        ref_res = await client.get(f"https://api.github.com/repos/{repo}/git/ref/heads/{default_branch}", headers=headers)
        if ref_res.status_code != 200:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not get branch ref")
        commit_sha = ref_res.json()["object"]["sha"]
        
        # 3. Get base tree
        commit_res = await client.get(f"https://api.github.com/repos/{repo}/git/commits/{commit_sha}", headers=headers)
        tree_sha = commit_res.json()["tree"]["sha"]
        
        # 4. Create blobs and build tree array
        tree_items = []
        for file in files:
            content = file.get("content", "")
            path = file.get("path")
            if not path:
                continue
            
            # create blob
            blob_res = await client.post(
                f"https://api.github.com/repos/{repo}/git/blobs",
                headers=headers,
                json={"content": content, "encoding": "utf-8"}
            )
            blob_sha = blob_res.json()["sha"]
            tree_items.append({
                "path": path,
                "mode": "100644",
                "type": "blob",
                "sha": blob_sha
            })
            
        if not tree_items:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "No valid files provided")
            
        # 5. Create new tree
        new_tree_res = await client.post(
            f"https://api.github.com/repos/{repo}/git/trees",
            headers=headers,
            json={"base_tree": tree_sha, "tree": tree_items}
        )
        new_tree_sha = new_tree_res.json()["sha"]
        
        # 6. Create commit
        new_commit_res = await client.post(
            f"https://api.github.com/repos/{repo}/git/commits",
            headers=headers,
            json={"message": message, "tree": new_tree_sha, "parents": [commit_sha]}
        )
        new_commit_sha = new_commit_res.json()["sha"]
        
        # 7. Update ref
        update_ref_res = await client.patch(
            f"https://api.github.com/repos/{repo}/git/refs/heads/{default_branch}",
            headers=headers,
            json={"sha": new_commit_sha}
        )
        
        if update_ref_res.status_code != 200:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to update ref")
            
    return {"message": "Success", "commit_sha": new_commit_sha, "url": f"https://github.com/{repo}/commit/{new_commit_sha}"}
