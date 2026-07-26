import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserOut(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    avatar_url: str | None
    created_at: datetime
    tokens_used: int = 0
    plan: str = "free"
    is_admin: bool = False

    model_config = {"from_attributes": True}


class ProfileStats(BaseModel):
    user: UserOut
    chat_count: int
    message_count: int


class UpdateProfileRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    email: EmailStr | None = None

class AdminPlanUpdateRequest(BaseModel):
    plan: str


class UpdatePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class UpdateInstructionsRequest(BaseModel):
    instructions_about_me: str = Field(default="", max_length=4000)
    instructions_response_style: str = Field(default="", max_length=4000)


class InstructionsOut(BaseModel):
    instructions_about_me: str
    instructions_response_style: str
    default_model: str
    default_mode: str

    model_config = {"from_attributes": True}


class UpdateGithubRequest(BaseModel):
    github_token: str | None = None


class GithubOut(BaseModel):
    github_token: str | None = None
    is_connected: bool

    model_config = {"from_attributes": True}
