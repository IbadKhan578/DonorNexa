import pytest
import pytest_asyncio
from app.db.session import async_engine

@pytest_asyncio.fixture(autouse=True)
async def cleanup_db_connections():
    yield
    # Dispose engine so connections are not leaked across test loops
    await async_engine.dispose()
