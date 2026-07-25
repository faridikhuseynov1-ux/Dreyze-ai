import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.file import UploadedFile
from app.models.user import User

router = APIRouter(prefix="/uploads", tags=["uploads"])

IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}
DOCUMENT_TYPES = {
    "application/pdf",
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/json",
}
ALLOWED_TYPES = IMAGE_TYPES | DOCUMENT_TYPES


@router.post("")
async def upload_file(
    file: UploadFile, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unsupported file type: {file.content_type}")

    contents = await file.read()
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"File exceeds {settings.MAX_UPLOAD_MB}MB limit")

    kind = "image" if file.content_type in IMAGE_TYPES else "document"
    user_dir = Path(settings.UPLOAD_DIR) / str(user.id)
    user_dir.mkdir(parents=True, exist_ok=True)

    extension = Path(file.filename or "file").suffix
    stored_name = f"{uuid.uuid4().hex}{extension}"
    (user_dir / stored_name).write_bytes(contents)

    record = UploadedFile(
        user_id=user.id,
        filename=stored_name,
        original_name=file.filename or stored_name,
        content_type=file.content_type,
        size_bytes=len(contents),
        kind=kind,
        url=f"/uploads/{user.id}/{stored_name}",
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return {
        "file_id": record.id,
        "url": record.url,
        "name": record.original_name,
        "content_type": record.content_type,
        "kind": record.kind,
    }

from fastapi.responses import FileResponse

@router.get("/{user_id}/{filename}")
async def get_uploaded_file(
    user_id: str,
    filename: str,
    user: User = Depends(get_current_user),
):
    # Only allow users to view files if they are authenticated.
    # Optionally, you can add logic here to only allow the owner to view their own files:
    # if str(user.id) != user_id: raise HTTPException(status.HTTP_403_FORBIDDEN)
    
    file_path = Path(settings.UPLOAD_DIR) / user_id / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
        
    return FileResponse(path=file_path)
