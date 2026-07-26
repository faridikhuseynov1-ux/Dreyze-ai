import asyncio
import sys
import os

# Add backend directory to Python path
sys.path.insert(0, os.path.abspath("/root/project/backend"))

from app.services.ai_service import stream_completion

async def main():
    print("Starting...")
    try:
        async for chunk in stream_completion([{"role":"user", "content":"Привет"}], "claude", "smart", False):
            print(chunk, end="", flush=True)
        print("\nDone")
    except Exception as e:
        print(f"\nError: {e}")

asyncio.run(main())
