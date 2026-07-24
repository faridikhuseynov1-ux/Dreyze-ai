import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.db.session import Base, get_db
from app.core.security import create_access_token
from app.models.user import User
from app.models.folder import Folder
from app.models.chat import ChatSession

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture
async def async_session():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def test_user(async_session: AsyncSession):
    user = User(
        id=uuid.uuid4(),
        name="Test User",
        email="testfolder@example.com",
        password_hash="hashed_pw",
        is_active=True,
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user: User):
    token = create_access_token(data={"sub": str(test_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def async_client(async_session: AsyncSession):
    async def _override_get_db():
        yield async_session

    app.dependency_overrides[get_db] = _override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_create_and_list_folders(async_client: AsyncClient, auth_headers: dict):
    # 1. Create Folder (POST /api/folders) -> 201 Created
    response = await async_client.post(
        "/api/folders",
        json={"name": "Work Projects", "color": "#ff0000", "icon": "folder-work"},
        headers=auth_headers,
    )
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["name"] == "Work Projects"
    assert data["color"] == "#ff0000"
    assert data["icon"] == "folder-work"
    assert data["session_count"] == 0
    assert data["session_ids"] == []
    folder_id = data["id"]

    # 2. List Folders (GET /api/folders) -> 200 OK
    response = await async_client.get("/api/folders", headers=auth_headers)
    assert response.status_code == 200, response.text
    folders = response.json()
    assert len(folders) == 1
    assert folders[0]["id"] == folder_id


@pytest.mark.asyncio
async def test_update_and_delete_folder(async_client: AsyncClient, auth_headers: dict):
    # Create folder
    res_create = await async_client.post(
        "/api/folders",
        json={"name": "Old Name", "color": "#000000"},
        headers=auth_headers,
    )
    folder_id = res_create.json()["id"]

    # Update folder (PATCH /api/folders/{id}) -> 200 OK
    res_patch = await async_client.patch(
        f"/api/folders/{folder_id}",
        json={"name": "New Name", "color": "#ffffff", "icon": "star"},
        headers=auth_headers,
    )
    assert res_patch.status_code == 200
    updated = res_patch.json()
    assert updated["name"] == "New Name"
    assert updated["color"] == "#ffffff"
    assert updated["icon"] == "star"

    # Delete folder (DELETE /api/folders/{id}) -> 200 OK
    res_del = await async_client.delete(f"/api/folders/{folder_id}", headers=auth_headers)
    assert res_del.status_code == 200

    # Verify deleted
    res_get = await async_client.get(f"/api/folders/{folder_id}", headers=auth_headers)
    assert res_get.status_code == 404


@pytest.mark.asyncio
async def test_move_session_to_folder_and_nullify_on_delete(
    async_client: AsyncClient, auth_headers: dict, async_session: AsyncSession, test_user: User
):
    # Create folder
    res_f = await async_client.post("/api/folders", json={"name": "Chat Folder"}, headers=auth_headers)
    folder_id = res_f.json()["id"]

    # Create session
    res_s = await async_client.post("/api/chat/sessions", json={"title": "My Session"}, headers=auth_headers)
    session_id = res_s.json()["id"]
    assert res_s.json()["folder_id"] is None

    # Move session to folder via PATCH /api/chat/sessions/{session_id}
    res_move = await async_client.patch(
        f"/api/chat/sessions/{session_id}",
        json={"folder_id": folder_id},
        headers=auth_headers,
    )
    assert res_move.status_code == 200
    assert res_move.json()["folder_id"] == folder_id

    # Check folder session count
    res_f_check = await async_client.get(f"/api/folders/{folder_id}", headers=auth_headers)
    assert res_f_check.json()["session_count"] == 1
    assert session_id in res_f_check.json()["session_ids"]

    # Delete folder and verify session folder_id is set to None
    await async_client.delete(f"/api/folders/{folder_id}", headers=auth_headers)

    res_s_check = await async_client.get(f"/api/chat/sessions/{session_id}", headers=auth_headers)
    assert res_s_check.status_code == 200
    assert res_s_check.json()["folder_id"] is None
