from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.services.sandbox import sandbox_manager

router = APIRouter(prefix="/sandbox", tags=["sandbox"])

class StartSandboxRequest(BaseModel):
    code: str
    lang: str

@router.post("/start")
async def start_sandbox(req: StartSandboxRequest):
    try:
        res = await sandbox_manager.start(req.code, req.lang)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop/{sandbox_id}")
async def stop_sandbox(sandbox_id: str):
    await sandbox_manager.stop(sandbox_id)
    return {"message": "Sandbox stopped"}
