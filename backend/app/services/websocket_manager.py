import asyncio
import uuid

from fastapi import WebSocket


class ConnectionManager:
    """Tracks active generation tasks so the client can request a stop."""

    def __init__(self) -> None:
        self._tasks: dict[str, asyncio.Task] = {}

    def register(self, connection_id: str, task: asyncio.Task) -> None:
        self._tasks[connection_id] = task

    def unregister(self, connection_id: str) -> None:
        self._tasks.pop(connection_id, None)

    def stop(self, connection_id: str) -> bool:
        task = self._tasks.get(connection_id)
        if task and not task.done():
            task.cancel()
            return True
        return False


manager = ConnectionManager()


def new_connection_id() -> str:
    return uuid.uuid4().hex


async def safe_send_json(ws: WebSocket, payload: dict) -> None:
    try:
        await ws.send_json(payload)
    except RuntimeError:
        pass
