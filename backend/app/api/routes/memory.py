import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.memory import MemoryEntry
from app.models.user import User
from app.schemas.memory import CreateMemoryRequest, MemoryOut

router = APIRouter(prefix="/memory", tags=["memory"])


@router.get("", response_model=list[MemoryOut])
async def list_memory(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MemoryEntry).where(MemoryEntry.user_id == user.id).order_by(MemoryEntry.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=MemoryOut, status_code=status.HTTP_201_CREATED)
async def create_memory(
    payload: CreateMemoryRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    entry = MemoryEntry(user_id=user.id, category=payload.category, content=payload.content)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/{memory_id}")
async def delete_memory(
    memory_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(MemoryEntry).where(MemoryEntry.id == memory_id, MemoryEntry.user_id == user.id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Memory entry not found")

    await db.delete(entry)
    await db.commit()
    return {"message": "Deleted"}
