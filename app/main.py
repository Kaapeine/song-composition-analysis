from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    from app.database import async_engine
    await async_engine.dispose()


app = FastAPI(title="Music Analyzer API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api import upload, analyze, jobs
app.include_router(upload.router)
app.include_router(analyze.router)
app.include_router(jobs.router)
