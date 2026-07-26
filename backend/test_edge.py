import asyncio
import edge_tts

async def main():
    communicate = edge_tts.Communicate("Привет", "ru-RU-DmitryNeural")
    with open("test2.mp3", "wb") as file:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                file.write(chunk["data"])

asyncio.run(main())
