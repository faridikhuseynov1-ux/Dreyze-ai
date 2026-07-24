import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.chat import ChatSession
from app.models.folder import Folder
from app.models.user import User
from app.schemas.folder import FolderCreate, FolderResponse, FolderUpdate

router = APIRouter(prefix="/folders", tags=["folders"])


async def _get_owned_folder(folder_id: uuid.UUID, user: User, db: AsyncSession) -> Folder:
    result = await db.execute(
        select(Folder)
        .options(selectinload(Folder.chat_sessions))
        .where(Folder.id == folder_id, Folder.user_id == user.id)
    )
    folder = result.scalar_one_or_none()
    if folder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
    return folder


def _to_folder_response(folder: Folder) -> FolderResponse:
    sessions = folder.chat_sessions if folder.chat_sessions is not None else []
    session_ids = [s.id for s in sessions]
    return FolderResponse(
        id=folder.id,
        user_id=folder.user_id,
        name=folder.name,
        color=folder.color,
        icon=folder.icon,
        created_at=folder.created_at,
        updated_at=folder.updated_at,
        session_count=len(session_ids),
        session_ids=session_ids,
    )


@router.post("", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=FolderResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_folder(
    payload: FolderCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    folder = Folder(
        user_id=user.id,
        name=payload.name,
        color=payload.color,
        icon=payload.icon,
    )
    db.add(folder)
    await db.commit()
    await db.refresh(folder)

    folder.chat_sessions = []
    return _to_folder_response(folder)


@router.get("", response_model=list[FolderResponse])
@router.get("/", response_model=list[FolderResponse], include_in_schema=False)
async def list_folders(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Folder)
        .options(selectinload(Folder.chat_sessions))
        .where(Folder.user_id == user.id)
        .order_by(Folder.created_at.desc())
    )
    folders = result.scalars().all()
    return [_to_folder_response(f) for f in folders]


@router.get("/{folder_id}", response_model=FolderResponse)
async def get_folder(
    folder_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    folder = await _get_owned_folder(folder_id, user, db)
    return _to_folder_response(folder)


@router.patch("/{folder_id}", response_model=FolderResponse)
async def update_folder(
    folder_id: uuid.UUID,
    payload: FolderUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    folder = await _get_owned_folder(folder_id, user, db)

    if payload.name is not None:
        folder.name = payload.name
    if payload.color is not None:
        folder.color = payload.color
    if payload.icon is not None:
        folder.icon = payload.icon

    await db.commit()
    await db.refresh(folder)

    folder = await _get_owned_folder(folder_id, user, db)
    return _to_folder_response(folder)


@router.delete("/{folder_id}")
async def delete_folder(
    folder_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    folder = await _get_owned_folder(folder_id, user, db)

    # Set folder_id=NULL on associated sessions
    await db.execute(
        update(ChatSession)
        .where(ChatSession.folder_id == folder_id)
        .values(folder_id=None)
    )

    await db.delete(folder)
    await db.commit()

    return {"message": "Folder deleted", "id": folder_id}
