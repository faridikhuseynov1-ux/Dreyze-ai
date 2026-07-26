import asyncio
from app.db.session import SessionLocal
from sqlalchemy import select
from app.models.settings import UserSettings
from app.models.user import User

async def main():
    async with SessionLocal() as db:
        users = await db.execute(select(User))
        for u in users.scalars().all():
            print(f"User: {u.email}")
            settings_res = await db.execute(select(UserSettings).where(UserSettings.user_id == u.id))
            us = settings_res.scalar_one_or_none()
            if us:
                print(f"  About me: {us.instructions_about_me}")
                print(f"  Response style: {us.instructions_response_style}")
            else:
                print("  No settings")

asyncio.run(main())
