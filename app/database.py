from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.config import settings

def _with_driver(url: str, driver: str) -> str:
    for prefix in ("postgresql+asyncpg://", "postgresql+psycopg2://", "postgresql://", "postgres://"):
        if url.startswith(prefix):
            return f"postgresql+{driver}://" + url[len(prefix):]
    return url

# Async engine — used by FastAPI route handlers
async_engine = create_async_engine(_with_driver(settings.DATABASE_URL, "asyncpg"), echo=False)
AsyncSessionLocal = async_sessionmaker(async_engine, expire_on_commit=False)

# Sync engine — used by background worker (run_analysis runs in a thread pool)
sync_engine = create_engine(_with_driver(settings.DATABASE_URL, "psycopg2"), echo=False)
SyncSessionLocal = sessionmaker(sync_engine)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
