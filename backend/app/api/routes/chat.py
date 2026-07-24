import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.chat import ChatSession, Message
from app.models.folder import Folder
from app.models.user import User
from app.schemas.chat import (
    ChatSessionDetail,
    ChatSessionOut,
    CreateSessionRequest,
    EditMessageRequest,
    MessageOut,
    SearchResult,
    UpdateSessionRequest,
)

router = APIRouter(prefix="/chat", tags=["chat"])


async def _get_owned_session(session_id: uuid.UUID, user: User, db: AsyncSession) -> ChatSession:
    result = await db.execute(
        select(ChatSession)
        .options(selectinload(ChatSession.messages))
        .where(ChatSession.id == session_id, ChatSession.user_id == user.id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Chat session not found")
    return session


@router.get("/sessions", response_model=list[ChatSessionOut])
async def list_sessions(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChatSession).where(ChatSession.user_id == user.id).order_by(ChatSession.updated_at.desc())
    )
    return result.scalars().all()


@router.post("/sessions", response_model=ChatSessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: CreateSessionRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    folder_id = None
    if payload.folder_id is not None:
        folder_result = await db.execute(
            select(Folder).where(Folder.id == payload.folder_id, Folder.user_id == user.id)
        )
        folder = folder_result.scalar_one_or_none()
        if folder is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Folder not found")
        folder_id = payload.folder_id

    session = ChatSession(user_id=user.id, title=payload.title or "New chat", folder_id=folder_id)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("/sessions/{session_id}", response_model=ChatSessionDetail)
async def get_session(
    session_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    return await _get_owned_session(session_id, user, db)


@router.patch("/sessions/{session_id}", response_model=ChatSessionOut)
async def rename_session(
    session_id: uuid.UUID,
    payload: UpdateSessionRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _get_owned_session(session_id, user, db)

    if payload.title is not None:
        session.title = payload.title

    if "folder_id" in payload.model_fields_set:
        if payload.folder_id is not None:
            folder_result = await db.execute(
                select(Folder).where(Folder.id == payload.folder_id, Folder.user_id == user.id)
            )
            folder = folder_result.scalar_one_or_none()
            if folder is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Folder not found")
        session.folder_id = payload.folder_id

    await db.commit()
    await db.refresh(session)
    return session


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    session = await _get_owned_session(session_id, user, db)
    await db.delete(session)
    await db.commit()
    return {"message": "Session deleted"}


@router.patch("/messages/{message_id}", response_model=MessageOut)
async def edit_message(
    message_id: uuid.UUID,
    payload: EditMessageRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Message)
        .join(ChatSession, Message.session_id == ChatSession.id)
        .where(Message.id == message_id, ChatSession.user_id == user.id)
    )
    message = result.scalar_one_or_none()
    if message is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Message not found")

    message.content = payload.content
    message.is_edited = True
    await db.commit()
    await db.refresh(message)
    return message


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Message)
        .join(ChatSession, Message.session_id == ChatSession.id)
        .where(Message.id == message_id, ChatSession.user_id == user.id)
    )
    message = result.scalar_one_or_none()
    if message is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Message not found")

    await db.delete(message)
    await db.commit()
    return {"message": "Message deleted"}


@router.post("/messages/{message_id}/pin", response_model=MessageOut)
async def pin_message(
    message_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Message)
        .join(ChatSession, Message.session_id == ChatSession.id)
        .where(Message.id == message_id, ChatSession.user_id == user.id)
    )
    message = result.scalar_one_or_none()
    if message is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Message not found")

    # Unpin all other messages in the same session
    from sqlalchemy import update
    await db.execute(
        update(Message)
        .where(Message.session_id == message.session_id)
        .values(is_pinned=False)
    )

    # Pin this one
    message.is_pinned = True
    await db.commit()
    await db.refresh(message)
    return message


@router.get("/search", response_model=list[SearchResult])
async def search_messages(q: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not q.strip():
        return []

    like_pattern = f"%{q.strip()}%"
    result = await db.execute(
        select(Message, ChatSession.title)
        .join(ChatSession, Message.session_id == ChatSession.id)
        .where(
            ChatSession.user_id == user.id,
            or_(Message.content.ilike(like_pattern), ChatSession.title.ilike(like_pattern)),
        )
        .order_by(Message.created_at.desc())
        .limit(50)
    )

    results = []
    for message, session_title in result.all():
        snippet = message.content[:180]
        results.append(
            SearchResult(
                session_id=message.session_id,
                session_title=session_title,
                message_id=message.id,
                snippet=snippet,
                created_at=message.created_at,
            )
        )
    return results
