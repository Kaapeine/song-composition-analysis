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

from app.api import upload, analyze, jobs, files
app.include_router(upload.router)
app.include_router(analyze.router)
app.include_router(jobs.router)
app.include_router(files.router)

if settings.SERVE_FRONTEND:
    from pathlib import Path
    from fastapi.staticfiles import StaticFiles
    FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"
    if not FRONTEND_DIST.exists():
        raise RuntimeError(
            f"SERVE_FRONTEND=true but no dist folder found at {FRONTEND_DIST}. "
            "Run `cd frontend && npm run build` first."
        )
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
    print("Frontend pages are being served.")
