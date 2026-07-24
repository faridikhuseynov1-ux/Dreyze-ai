import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

MemoryCategory = Literal["name", "topic", "preference", "style", "project", "goal", "interest"]


class MemoryOut(BaseModel):
    id: uuid.UUID
    category: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateMemoryRequest(BaseModel):
    category: MemoryCategory
    content: str = Field(min_length=1, max_length=1000)
