from fastapi import APIRouter
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
import edge_tts

router = APIRouter(prefix="/tts", tags=["tts"])

class TTSRequest(BaseModel):
    text: str

@router.post("/")
async def generate_tts_post(req: TTSRequest):
    return generate_tts_response(req.text)

@router.get("/")
async def generate_tts_get(text: str):
    return generate_tts_response(text)

def generate_tts_response(text: str):
    async def stream_audio():
        try:
            communicate = edge_tts.Communicate(text, "ru-RU-DmitryNeural", rate="+20%")
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    yield chunk["data"]
        except Exception as e:
            print("Edge TTS Stream Exception:", e)
            yield b""

    return StreamingResponse(stream_audio(), media_type="audio/mpeg")
