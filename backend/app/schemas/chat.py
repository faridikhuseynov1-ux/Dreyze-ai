import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

Model = Literal["gemini", "gpt", "claude", "deepseek", "qwen", "llama", "grok", "glm", "kmc/kimi-for-coding"]
Mode = Literal["fast", "smart", "reasoning", "research", "vision"]


class Attachment(BaseModel):
    file_id: uuid.UUID
    url: str
    name: str
    content_type: str
    kind: Literal["image", "document"]


class MessageOut(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    model: str | None
    mode: str | None
    attachments: list[dict] | None
    is_edited: bool
    is_pinned: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatSessionOut(BaseModel):
    id: uuid.UUID
    title: str
    folder_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# Response schema alias as specified in requirements
ChatSessionResponse = ChatSessionOut


class ChatSessionDetail(ChatSessionOut):
    messages: list[MessageOut]


class CreateSessionRequest(BaseModel):
    title: str | None = None
    folder_id: uuid.UUID | None = None


class UpdateSessionRequest(BaseModel):
    title: str | None = None
    folder_id: uuid.UUID | None = None


class SendMessageRequest(BaseModel):
    content: str
    model: Model = "gpt"
    mode: Mode = "smart"
    attachments: list[Attachment] = []


class EditMessageRequest(BaseModel):
    content: str


class SearchResult(BaseModel):
    session_id: uuid.UUID
    session_title: str
    message_id: uuid.UUID
    snippet: str
    created_at: datetime
