from fastapi import APIRouter
from app.api.routes.folders import router as folders_router

router = APIRouter(prefix="/api")
router.include_router(folders_router)

__all__ = ["folders_router", "router"]
