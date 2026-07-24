import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class FolderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    color: str | None = Field(default=None, max_length=30)
    icon: str | None = Field(default=None, max_length=50)


class FolderUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = Field(default=None, max_length=30)
    icon: str | None = Field(default=None, max_length=50)


class FolderResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    color: str | None = None
    icon: str | None = None
    created_at: datetime
    updated_at: datetime
    session_count: int = 0
    session_ids: list[uuid.UUID] = []

    model_config = {"from_attributes": True}


# Alias for output standard naming
FolderOut = FolderResponse
