# Music Composition Analysis Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Python FastAPI backend that accepts audio uploads and returns comprehensive musical analysis via a staged background processing pipeline.

**Architecture:** FastAPI handles HTTP; analysis runs as a synchronous function dispatched via FastAPI BackgroundTasks (runs in thread pool so the server stays responsive during long jobs); job state and results stored in PostgreSQL; files stored via a StorageBackend ABC (LocalStorageBackend for PoC, S3StorageBackend later). Tests are deferred per design spec — each task ends with a manual verification step.

**Tech Stack:** Python 3.11+, FastAPI, SQLAlchemy 2.0 (async for API, sync/psycopg2 for worker), Alembic, PostgreSQL 16, Docker Compose, allin1/Demucs, librosa, madmom, basic-pitch, pyloudnorm, scipy, music21.

---

## File Map

| File | Responsibility |
|---|---|
| `app/config.py` | All env vars via pydantic-settings |
| `app/main.py` | FastAPI app, CORS, router registration |
| `app/database.py` | Async engine (API) + sync engine (worker) |
| `app/storage.py` | StorageBackend ABC, LocalStorageBackend, S3StorageBackend stub |
| `app/dependencies.py` | `get_storage()`, `get_db()`, `get_current_user()` |
| `app/tasks.py` | `dispatch_task()`, `run_analysis()`, `set_progress()`, `set_done()`, `set_failed()` |
| `app/models/db.py` | SQLAlchemy ORM: File, Job |
| `app/models/schemas.py` | Pydantic request/response schemas |
| `app/api/upload.py` | `POST /upload` |
| `app/api/analyze.py` | `POST /analyze` |
| `app/api/jobs.py` | `GET /jobs/{id}`, `GET /results/{id}` |
| `app/analysis/preprocess.py` | Stage 0: FFmpeg → 44100Hz mono WAV |
| `app/analysis/structure.py` | Stage 1: allin1 (BPM, beats, sections) |
| `app/analysis/key.py` | Stage 2: librosa chroma + K-S templates |
| `app/analysis/chords.py` | Stage 3: madmom chord detection + Roman numerals |
| `app/analysis/pitch.py` | Stage 4: basic-pitch pitch range + histogram |
| `app/analysis/instruments.py` | Stage 5: stem classification |
| `app/analysis/dynamics.py` | Stage 6: RMS, LUFS, brightness, density |
| `app/analysis/tension.py` | Stage 7: chord + melodic + dynamic tension blend |
| `app/analysis/aggregate.py` | Stage 8: section stats + transposition suggestions |

---

## Task 1: Project Scaffolding

**Files:**
- Create: `requirements.txt`
- Create: `docker-compose.yml`
- Create: `Dockerfile`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `app/__init__.py`
- Create: `app/config.py`
- Create: `app/main.py`

- [ ] **Step 1: Create `requirements.txt`**

```
# API
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
pydantic>=2.7.0
pydantic-settings>=2.2.0
python-multipart>=0.0.9

# Database
sqlalchemy>=2.0.0
asyncpg>=0.29.0
psycopg2-binary>=2.9.9
alembic>=1.13.0

# Storage
boto3>=1.34.0

# Audio conversion
ffmpeg-python>=0.2.0

# Analysis — install after torch
numpy>=1.26.0
scipy>=1.13.0
soundfile>=0.12.3
librosa>=0.10.0
pyloudnorm>=0.1.1
music21>=9.1.0

# Install these manually in order (see README):
# 1. pip install torch torchaudio  (GPU/MPS version matching your system)
# 2. pip install ninja
# 3. pip install git+https://github.com/CPJKU/madmom
# 4. pip install basic-pitch
# 5. pip install allin1  (or allin1fix for PyTorch 2.x)
```

- [ ] **Step 2: Create `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: musicanalyzer
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

- [ ] **Step 3: Create `Dockerfile`**

```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    ffmpeg git build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 4: Create `.env.example`**

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/musicanalyzer

# Storage
STORAGE_BACKEND=local
STORAGE_LOCAL_DIR=./data

# S3 / Cloudflare R2 (only when STORAGE_BACKEND=s3)
S3_BUCKET=music-analyzer
S3_ENDPOINT_URL=https://<account>.r2.cloudflarestorage.com
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_REGION=auto

# Upload limits
MAX_UPLOAD_SIZE_MB=100
MAX_DURATION_SEC=600
MIN_DURATION_SEC=10

# Stems
KEEP_STEMS=true
STEMS_TTL_DAYS=7

# Temp work directory for analysis pipeline
WORK_DIR=/tmp/music-analyzer

# CORS
ALLOWED_ORIGINS=http://localhost:3000
```

- [ ] **Step 5: Create `.gitignore`**

```
__pycache__/
*.pyc
.env
data/
/tmp/music-analyzer/
*.egg-info/
.venv/
dist/
```

- [ ] **Step 6: Create `app/__init__.py`** (empty file)

- [ ] **Step 7: Create `app/config.py`**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost:5432/musicanalyzer"
    STORAGE_BACKEND: str = "local"
    STORAGE_LOCAL_DIR: str = "./data"
    S3_BUCKET: str = ""
    S3_ENDPOINT_URL: str = ""
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    S3_REGION: str = "auto"
    MAX_UPLOAD_SIZE_MB: int = 100
    MAX_DURATION_SEC: int = 600
    MIN_DURATION_SEC: int = 10
    KEEP_STEMS: bool = True
    STEMS_TTL_DAYS: int = 7
    WORK_DIR: str = "/tmp/music-analyzer"
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
```

- [ ] **Step 8: Create `app/main.py`**

```python
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
```

- [ ] **Step 9: Start Postgres and verify connection**

```bash
cp .env.example .env
docker compose up -d
docker compose ps
```

Expected: `postgres` service shows `running`.

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "feat: project scaffold — config, docker-compose, requirements"
```

---

## Task 2: Database Models and Migrations

**Files:**
- Create: `app/database.py`
- Create: `app/models/__init__.py`
- Create: `app/models/db.py`
- Create: `app/models/schemas.py`
- Create: `migrations/` (Alembic)

- [ ] **Step 1: Install base Python deps (API framework + DB drivers)**

```bash
pip install fastapi uvicorn[standard] pydantic pydantic-settings python-multipart \
            sqlalchemy asyncpg psycopg2-binary alembic boto3
```

- [ ] **Step 2: Create `app/database.py`**

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.config import settings

# Async engine — used by FastAPI route handlers
async_engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(async_engine, expire_on_commit=False)

# Sync engine — used by background worker (run_analysis runs in a thread pool)
_sync_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
sync_engine = create_engine(_sync_url, echo=False)
SyncSessionLocal = sessionmaker(sync_engine)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
```

- [ ] **Step 3: Create `app/models/__init__.py`** (empty)

- [ ] **Step 4: Create `app/models/db.py`**

```python
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, BigInteger, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class File(Base):
    __tablename__ = "files"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    original_name: Mapped[str | None] = mapped_column(String(255))
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)
    duration_sec: Mapped[float | None] = mapped_column(Float)
    size_bytes: Mapped[int | None] = mapped_column(BigInteger)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("files.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="queued")
    stage: Mapped[str | None] = mapped_column(String(60))
    progress: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text)
    result: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
```

- [ ] **Step 5: Create `app/models/schemas.py`**

```python
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Any


class FileResponse(BaseModel):
    file_id: UUID
    filename: str
    duration_sec: float
    size_bytes: int


class AnalyzeOptions(BaseModel):
    detect_mode: bool = True
    include_stems: bool = False


class AnalyzeRequest(BaseModel):
    file_id: UUID
    options: AnalyzeOptions = AnalyzeOptions()


class AnalyzeResponse(BaseModel):
    job_id: UUID
    status: str


class JobStatusResponse(BaseModel):
    job_id: UUID
    status: str
    stage: str | None = None
    progress: int = 0
    created_at: datetime
    result: Any | None = None
    error: str | None = None

    model_config = {"from_attributes": True}
```

- [ ] **Step 6: Initialize Alembic**

```bash
alembic init migrations
```

- [ ] **Step 7: Edit `alembic.ini` — set sqlalchemy.url**

Find the line `sqlalchemy.url = driver://user:pass@localhost/dbname` and replace it with:
```ini
sqlalchemy.url = postgresql+psycopg2://user:pass@localhost:5432/musicanalyzer
```

- [ ] **Step 8: Edit `migrations/env.py` — wire in models**

Replace the entire file content with:

```python
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from app.database import Base
import app.models.db  # registers models with Base.metadata

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 9: Generate and apply migration**

```bash
alembic revision --autogenerate -m "create files and jobs tables"
alembic upgrade head
```

Expected output ends with: `Running upgrade  -> <hash>, create files and jobs tables`

- [ ] **Step 10: Verify tables exist**

```bash
docker compose exec postgres psql -U user -d musicanalyzer -c "\dt"
```

Expected: shows `files` and `jobs` tables.

- [ ] **Step 11: Commit**

```bash
git add app/database.py app/models/ migrations/ alembic.ini
git commit -m "feat: database models and Alembic migrations"
```

---

## Task 3: Storage Layer

**Files:**
- Create: `app/storage.py`
- Create: `app/dependencies.py`

- [ ] **Step 1: Create `app/storage.py`**

```python
from abc import ABC, abstractmethod
from pathlib import Path
from functools import lru_cache
import boto3
from app.config import settings


class StorageBackend(ABC):
    @abstractmethod
    def save(self, key: str, data: bytes) -> str:
        """Persist data under key. Returns the key."""

    @abstractmethod
    def load(self, key: str) -> bytes:
        """Load data by key."""

    @abstractmethod
    def get_url(self, key: str) -> str:
        """Return a URL to access the stored file."""


class LocalStorageBackend(StorageBackend):
    def __init__(self, base_dir: str = "./data"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def save(self, key: str, data: bytes) -> str:
        path = self.base_dir / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return key

    def load(self, key: str) -> bytes:
        return (self.base_dir / key).read_bytes()

    def get_url(self, key: str) -> str:
        return f"file://{(self.base_dir / key).resolve()}"


class S3StorageBackend(StorageBackend):
    def __init__(self, bucket: str, endpoint_url: str, region: str):
        self.bucket = bucket
        self.client = boto3.client("s3", endpoint_url=endpoint_url, region_name=region)

    def save(self, key: str, data: bytes) -> str:
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data)
        return key

    def load(self, key: str) -> bytes:
        response = self.client.get_object(Bucket=self.bucket, Key=key)
        return response["Body"].read()

    def get_url(self, key: str) -> str:
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=3600,
        )


@lru_cache
def _make_storage() -> StorageBackend:
    if settings.STORAGE_BACKEND == "s3":
        return S3StorageBackend(
            bucket=settings.S3_BUCKET,
            endpoint_url=settings.S3_ENDPOINT_URL,
            region=settings.S3_REGION,
        )
    return LocalStorageBackend(settings.STORAGE_LOCAL_DIR)
```

- [ ] **Step 2: Create `app/dependencies.py`**

```python
from app.storage import StorageBackend, _make_storage
from app.database import get_db  # re-export for convenience


def get_storage() -> StorageBackend:
    return _make_storage()


async def get_current_user():
    """Auth stub. Replace this function body when adding authentication."""
    return None
```

- [ ] **Step 3: Verify storage works in a Python REPL**

```bash
python3 -c "
from app.storage import _make_storage
s = _make_storage()
s.save('test/hello.txt', b'hello')
print(s.load('test/hello.txt'))
print(s.get_url('test/hello.txt'))
"
```

Expected: `b'hello'` and a `file://` path.

- [ ] **Step 4: Commit**

```bash
git add app/storage.py app/dependencies.py
git commit -m "feat: storage abstraction layer with LocalStorageBackend"
```

---

## Task 4: Task Dispatch and Stub Pipeline

**Files:**
- Create: `app/tasks.py`
- Create: `app/analysis/__init__.py`
- Create: `app/analysis/preprocess.py` (stub)
- Create: `app/analysis/structure.py` (stub)
- Create: `app/analysis/key.py` (stub)
- Create: `app/analysis/chords.py` (stub)
- Create: `app/analysis/pitch.py` (stub)
- Create: `app/analysis/instruments.py` (stub)
- Create: `app/analysis/dynamics.py` (stub)
- Create: `app/analysis/tension.py` (stub)
- Create: `app/analysis/aggregate.py` (stub)

- [ ] **Step 1: Create `app/analysis/__init__.py`** (empty)

- [ ] **Step 2: Create stub analysis modules**

Create each file below. These stubs return empty/zero values so the pipeline runs end-to-end before any real ML code exists.

`app/analysis/preprocess.py`:
```python
from pathlib import Path


def preprocess(raw_path: Path, work_dir: Path) -> tuple[Path, float]:
    """Stage 0 stub. Returns (wav_path, duration_sec)."""
    wav_path = work_dir / "audio.wav"
    wav_path.write_bytes(b"")  # placeholder
    return wav_path, 0.0
```

`app/analysis/structure.py`:
```python
from pathlib import Path


def analyze_structure(wav_path: Path) -> dict:
    """Stage 1 stub."""
    return {
        "bpm": 0.0,
        "time_signature": "4/4",
        "beats": [],
        "downbeats": [],
        "sections": [],
    }
```

`app/analysis/key.py`:
```python
from pathlib import Path


def detect_key(wav_path: Path) -> dict:
    """Stage 2 stub. Returns key info + internal chroma for downstream stages."""
    return {
        "key": {
            "root": "C",
            "mode_quality": "major",
            "mode_name": "ionian",
            "mode_confidence": 0.0,
            "key_confidence": 0.0,
        },
        "_chroma": None,   # numpy array added by real implementation
        "_tonic_idx": 0,   # int 0-11
    }
```

`app/analysis/chords.py`:
```python
from pathlib import Path


def detect_chords(wav_path: Path, key_result: dict) -> dict:
    """Stage 3 stub."""
    return {
        "progression_fingerprint": "",
        "chords": [],
    }
```

`app/analysis/pitch.py`:
```python
from pathlib import Path


def analyze_pitch(stems_dir: Path, key_result: dict) -> dict:
    """Stage 4 stub."""
    return {
        "pitch_ranges": {},
        "pitch_class_histogram": {},
        "_vocal_midi_range": None,  # (min_midi, max_midi) for transposition
    }
```

`app/analysis/instruments.py`:
```python
from pathlib import Path


def classify_instruments(stems_dir: Path) -> dict:
    """Stage 5 stub."""
    return {}
```

`app/analysis/dynamics.py`:
```python
from pathlib import Path


def compute_dynamics(wav_path: Path, stems_dir: Path) -> dict:
    """Stage 6 stub."""
    return {
        "rms": [],
        "loudness_lufs": [],
        "brightness": [],
        "onset_density": [],
        "arrangement_density": [],
    }
```

`app/analysis/tension.py`:
```python
def compute_tension(chords_result: dict, pitch_result: dict, dynamics_result: dict) -> list:
    """Stage 7 stub."""
    return []
```

`app/analysis/aggregate.py`:
```python
def aggregate(
    structure: dict,
    key_result: dict,
    chords_result: dict,
    pitch_result: dict,
    dynamics_result: dict,
    tension_result: list,
) -> dict:
    """Stage 8 stub."""
    return {
        "section_comparison": [],
        "transposition": {},
    }
```

- [ ] **Step 3: Create `app/tasks.py`**

```python
import uuid
import shutil
from pathlib import Path
from fastapi import BackgroundTasks
from sqlalchemy.orm import Session
from app.config import settings
from app.database import SyncSessionLocal
from app.models.db import Job
from app.dependencies import get_storage

from app.analysis.preprocess import preprocess
from app.analysis.structure import analyze_structure
from app.analysis.key import detect_key
from app.analysis.chords import detect_chords
from app.analysis.pitch import analyze_pitch
from app.analysis.instruments import classify_instruments
from app.analysis.dynamics import compute_dynamics
from app.analysis.tension import compute_tension
from app.analysis.aggregate import aggregate


# ── DB helpers (sync — called from background thread) ────────────────────────

def _update_job(job_id: str, **kwargs) -> None:
    with SyncSessionLocal() as db:
        job = db.get(Job, uuid.UUID(job_id))
        for k, v in kwargs.items():
            setattr(job, k, v)
        db.commit()


def set_progress(job_id: str, stage: str, progress: int) -> None:
    _update_job(job_id, status="processing", stage=stage, progress=progress)


def set_done(job_id: str, result: dict) -> None:
    _update_job(job_id, status="done", stage="Done", progress=100, result=result)


def set_failed(job_id: str, stage: str, error: str) -> None:
    _update_job(job_id, status="failed", stage=stage, error=error)


# ── Dispatch ─────────────────────────────────────────────────────────────────

async def dispatch_task(
    background_tasks: BackgroundTasks,
    job_id: str,
    storage_key: str,
    options: dict,
) -> None:
    """
    Thin dispatch wrapper. To swap in Celery later, change only this function:
        celery_app.send_task("run_analysis", args=[job_id, storage_key, options])
    BackgroundTasks runs sync functions in a thread pool automatically.
    """
    background_tasks.add_task(run_analysis, job_id, storage_key, options)


# ── Pipeline ─────────────────────────────────────────────────────────────────

def run_analysis(job_id: str, storage_key: str, options: dict) -> None:
    """Main analysis pipeline. Runs in a thread pool via BackgroundTasks."""
    work_dir = Path(settings.WORK_DIR) / job_id
    work_dir.mkdir(parents=True, exist_ok=True)
    try:
        _pipeline(job_id, storage_key, work_dir, options)
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


def _pipeline(job_id: str, storage_key: str, work_dir: Path, options: dict) -> None:
    storage = get_storage()

    # Stage 0 — Preprocess
    try:
        set_progress(job_id, "Preprocessing", 0)
        audio_bytes = storage.load(storage_key)
        raw_path = work_dir / "input_audio"
        raw_path.write_bytes(audio_bytes)
        wav_path, duration = preprocess(raw_path, work_dir)
    except Exception as e:
        set_failed(job_id, "preprocess", str(e))
        return

    # Stage 1 — Structure
    try:
        set_progress(job_id, "Analyzing structure", 10)
        structure = analyze_structure(wav_path)
        stems_dir = wav_path.parent / "htdemucs" / wav_path.stem
    except Exception as e:
        set_failed(job_id, "structure", str(e))
        return

    # Stage 2 — Key
    try:
        set_progress(job_id, "Detecting key", 70)
        key_result = detect_key(wav_path)
    except Exception as e:
        set_failed(job_id, "key", str(e))
        return

    # Stage 3 — Chords
    try:
        set_progress(job_id, "Detecting chords", 74)
        chords_result = detect_chords(wav_path, key_result)
    except Exception as e:
        set_failed(job_id, "chords", str(e))
        return

    # Stage 4 — Pitch
    try:
        set_progress(job_id, "Analyzing pitch ranges", 78)
        pitch_result = analyze_pitch(stems_dir, key_result)
    except Exception as e:
        set_failed(job_id, "pitch", str(e))
        return

    # Stage 5 — Instruments
    try:
        set_progress(job_id, "Classifying instruments", 83)
        instruments_result = classify_instruments(stems_dir)
    except Exception as e:
        set_failed(job_id, "instruments", str(e))
        return

    # Stage 6 — Dynamics
    try:
        set_progress(job_id, "Computing dynamics", 87)
        dynamics_result = compute_dynamics(wav_path, stems_dir)
    except Exception as e:
        set_failed(job_id, "dynamics", str(e))
        return

    # Stage 7 — Tension
    try:
        set_progress(job_id, "Computing tension", 91)
        tension_result = compute_tension(chords_result, pitch_result, dynamics_result)
    except Exception as e:
        set_failed(job_id, "tension", str(e))
        return

    # Stage 8 — Aggregate
    try:
        set_progress(job_id, "Aggregating sections", 94)
        aggregate_result = aggregate(structure, key_result, chords_result, pitch_result, dynamics_result, tension_result)
    except Exception as e:
        set_failed(job_id, "aggregate", str(e))
        return

    # Stage 9 — Stem upload (optional)
    stems_urls: dict[str, str] = {}
    if options.get("include_stems") and stems_dir.exists():
        try:
            set_progress(job_id, "Uploading stems", 97)
            for stem_name in ["vocals", "drums", "bass", "other"]:
                stem_path = stems_dir / f"{stem_name}.wav"
                if stem_path.exists():
                    key = f"stems/{job_id}/{stem_name}.wav"
                    storage.save(key, stem_path.read_bytes())
                    stems_urls[stem_name] = storage.get_url(key)
        except Exception as e:
            set_failed(job_id, "stem_upload", str(e))
            return

    stems = {**instruments_result}
    for stem_name, url in stems_urls.items():
        stems.setdefault(stem_name, {})["download_url"] = url
    if pitch_result.get("pitch_ranges"):
        for stem_name, pitch_data in pitch_result["pitch_ranges"].items():
            stems.setdefault(stem_name, {})["pitch_range"] = pitch_data

    result = {
        "job_id": job_id,
        "duration_sec": duration,
        "key": key_result["key"],
        "bpm": structure["bpm"],
        "time_signature": structure["time_signature"],
        "beats": structure["beats"],
        "downbeats": structure["downbeats"],
        "sections": structure["sections"],
        "harmonic": chords_result,
        "stems": stems,
        "pitch_class_histogram": pitch_result.get("pitch_class_histogram", {}),
        "dynamics": dynamics_result,
        "tension_curve": tension_result,
        "section_comparison": aggregate_result["section_comparison"],
        "transposition": aggregate_result["transposition"],
    }

    set_done(job_id, result)
```

- [ ] **Step 4: Commit**

```bash
git add app/tasks.py app/analysis/
git commit -m "feat: task dispatch and stub analysis pipeline"
```

---

## Task 5: Upload Endpoint

**Files:**
- Create: `app/api/__init__.py`
- Create: `app/api/upload.py`
- Modify: `app/main.py`

- [ ] **Step 1: Create `app/api/__init__.py`** (empty)

- [ ] **Step 2: Create `app/api/upload.py`**

```python
import uuid
import subprocess
import json
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.storage import StorageBackend
from app.dependencies import get_storage, get_current_user
from app.models.db import File as FileModel
from app.models.schemas import FileResponse
from app.config import settings

router = APIRouter()

ACCEPTED_MIME_TYPES = {
    "audio/mpeg", "audio/wav", "audio/flac",
    "audio/aiff", "audio/x-aiff", "audio/x-wav",
}


def _ffprobe_duration(data: bytes, suffix: str) -> float:
    """Write data to a temp file, run ffprobe, return duration in seconds."""
    import tempfile, os
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
        f.write(data)
        tmp = f.name
    try:
        out = subprocess.check_output(
            [
                "ffprobe", "-v", "quiet", "-print_format", "json",
                "-show_format", tmp,
            ],
            stderr=subprocess.DEVNULL,
        )
        info = json.loads(out)
        return float(info["format"]["duration"])
    finally:
        os.unlink(tmp)


@router.post("/upload", response_model=FileResponse)
async def upload_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
    _user=Depends(get_current_user),
):
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    if file.content_type not in ACCEPTED_MIME_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported format: {file.content_type}")

    data = await file.read()
    if len(data) > max_bytes:
        raise HTTPException(status_code=413, detail="File exceeds 100MB limit")

    suffix = "." + (file.filename or "audio").rsplit(".", 1)[-1]
    try:
        duration = _ffprobe_duration(data, suffix)
    except Exception:
        raise HTTPException(status_code=422, detail="Could not read audio duration")

    if duration < settings.MIN_DURATION_SEC:
        raise HTTPException(status_code=422, detail=f"Audio too short (min {settings.MIN_DURATION_SEC}s)")
    if duration > settings.MAX_DURATION_SEC:
        raise HTTPException(status_code=422, detail=f"Audio too long (max {settings.MAX_DURATION_SEC}s)")

    file_id = uuid.uuid4()
    storage_key = f"uploads/{file_id}{suffix}"
    storage.save(storage_key, data)

    record = FileModel(
        id=file_id,
        original_name=file.filename,
        storage_key=storage_key,
        duration_sec=duration,
        size_bytes=len(data),
    )
    db.add(record)
    await db.commit()

    return FileResponse(
        file_id=file_id,
        filename=file.filename or "",
        duration_sec=duration,
        size_bytes=len(data),
    )
```

- [ ] **Step 3: Register router in `app/main.py`**

Add these lines at the bottom of `app/main.py`:
```python
from app.api import upload
app.include_router(upload.router)
```

- [ ] **Step 4: Start the server and test upload**

```bash
uvicorn app.main:app --reload --port 8000
```

In a second terminal, upload an audio file:
```bash
curl -X POST http://localhost:8000/upload \
  -F "file=@/path/to/any-audio.mp3"
```

Expected: `{"file_id": "...", "filename": "...", "duration_sec": ..., "size_bytes": ...}`

- [ ] **Step 5: Commit**

```bash
git add app/api/ app/main.py
git commit -m "feat: POST /upload endpoint with FFprobe validation"
```

---

## Task 6: Job Endpoints + API Milestone

**Files:**
- Create: `app/api/analyze.py`
- Create: `app/api/jobs.py`
- Modify: `app/main.py`

- [ ] **Step 1: Create `app/api/analyze.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from fastapi import BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.dependencies import get_storage, get_current_user
from app.models.db import File, Job
from app.models.schemas import AnalyzeRequest, AnalyzeResponse
from app.tasks import dispatch_task

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse, status_code=202)
async def start_analysis(
    body: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    result = await db.execute(select(File).where(File.id == body.file_id))
    file = result.scalar_one_or_none()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    job = Job(file_id=file.id)
    db.add(job)
    await db.commit()
    await db.refresh(job)

    await dispatch_task(
        background_tasks,
        str(job.id),
        file.storage_key,
        body.options.model_dump(),
    )

    return AnalyzeResponse(job_id=job.id, status=job.status)
```

- [ ] **Step 2: Create `app/api/jobs.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user
from app.models.db import Job
from app.models.schemas import JobStatusResponse
import uuid

router = APIRouter()


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobStatusResponse(
        job_id=job.id,
        status=job.status,
        stage=job.stage,
        progress=job.progress,
        created_at=job.created_at,
        result=job.result if job.status == "done" else None,
        error=job.error,
    )


@router.get("/results/{job_id}")
async def get_results(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    job = await db.get(Job, job_id)
    if not job or job.status != "done":
        raise HTTPException(status_code=404, detail="Results not available")
    return job.result
```

- [ ] **Step 3: Register routers in `app/main.py`**

Replace the router import lines at the bottom of `app/main.py` with:
```python
from app.api import upload, analyze, jobs
app.include_router(upload.router)
app.include_router(analyze.router)
app.include_router(jobs.router)
```

- [ ] **Step 4: End-to-end test of the stub pipeline**

```bash
# Upload a file
FILE_ID=$(curl -s -X POST http://localhost:8000/upload \
  -F "file=@/path/to/audio.mp3" | python3 -c "import sys,json; print(json.load(sys.stdin)['file_id'])")

# Start analysis
JOB_ID=$(curl -s -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d "{\"file_id\": \"$FILE_ID\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['job_id'])")

# Poll for completion
curl http://localhost:8000/jobs/$JOB_ID
```

Expected: job moves from `queued` → `processing` → `done` with an empty-but-valid result JSON. The stub pipeline completes in under a second.

> **API milestone reached.** All endpoints are functional. The frontend can integrate against this contract now.

- [ ] **Step 5: Commit**

```bash
git add app/api/analyze.py app/api/jobs.py app/main.py
git commit -m "feat: POST /analyze and GET /jobs endpoints — API contract complete"
```

---

## Task 7: Stage 0 — Preprocess

**Files:**
- Modify: `app/analysis/preprocess.py`

- [ ] **Step 1: Install FFmpeg Python bindings**

```bash
pip install ffmpeg-python soundfile
```

Verify system FFmpeg is installed: `ffmpeg -version`

- [ ] **Step 2: Replace stub in `app/analysis/preprocess.py`**

```python
import json
import subprocess
from pathlib import Path


def preprocess(raw_path: Path, work_dir: Path) -> tuple[Path, float]:
    """
    Convert input audio to 44100Hz mono WAV.
    Returns (wav_path, duration_sec).
    Raises on unsupported format or ffmpeg failure.
    """
    wav_path = work_dir / "audio.wav"

    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(raw_path),
            "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le",
            str(wav_path),
        ],
        check=True,
        capture_output=True,
    )

    duration = _ffprobe_duration(wav_path)
    return wav_path, duration


def _ffprobe_duration(path: Path) -> float:
    out = subprocess.check_output(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", str(path)],
        stderr=subprocess.DEVNULL,
    )
    return float(json.loads(out)["format"]["duration"])
```

- [ ] **Step 3: Manual verification**

```bash
python3 -c "
from pathlib import Path
import tempfile, shutil
from app.analysis.preprocess import preprocess

tmp = Path(tempfile.mkdtemp())
raw = tmp / 'test_audio'
raw.write_bytes(open('/path/to/audio.mp3','rb').read())
wav, dur = preprocess(raw, tmp)
print('WAV path:', wav)
print('Duration:', dur)
print('WAV exists:', wav.exists())
shutil.rmtree(tmp)
"
```

Expected: WAV path and a non-zero duration printed. No errors.

- [ ] **Step 4: Commit**

```bash
git add app/analysis/preprocess.py
git commit -m "feat: Stage 0 — FFmpeg audio preprocessing"
```

---

## Task 8: Stage 1 — Structure (allin1)

**Files:**
- Modify: `app/analysis/structure.py`

> **Important:** allin1 has a complex install. Do this before writing any code.

- [ ] **Step 1: Install allin1 and its dependencies**

```bash
# Install in this exact order
pip install torch torchaudio  # GPU/MPS version for your system — see pytorch.org
pip install ninja
pip install git+https://github.com/CPJKU/madmom
# Clone and build NATTEN from source: https://github.com/SHI-Labs/NATTEN
# Then:
pip install allin1  # use allin1fix if on PyTorch 2.x
```

Verify: `python3 -c "import allin1; print('allin1 ok')`

- [ ] **Step 2: Replace stub in `app/analysis/structure.py`**

```python
from pathlib import Path
from collections import Counter
import torch


def analyze_structure(wav_path: Path) -> dict:
    """
    Run allin1 on wav_path. Returns BPM, beats, downbeats, time signature, sections.
    allin1 runs Demucs internally — stems land at wav_path.parent/htdemucs/wav_path.stem/.
    Pass keep_byproducts=True so subsequent stages reuse those stems.
    """
    import allin1

    device = _get_device()
    result = allin1.analyze(str(wav_path), keep_byproducts=True, device=device)

    time_sig = _infer_time_signature(result.beat_positions)

    sections = [
        {"start": float(seg.start), "end": float(seg.end), "label": _normalize_label(seg.label)}
        for seg in result.segments
    ]

    return {
        "bpm": float(result.bpm),
        "time_signature": time_sig,
        "beats": [float(b) for b in result.beats],
        "downbeats": [float(b) for b in result.downbeats],
        "sections": sections,
    }


def _get_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def _infer_time_signature(beat_positions: list) -> str:
    if not beat_positions:
        return "4/4"
    max_pos = max(beat_positions)
    return f"{max_pos}/4"


_LABEL_MAP = {
    "pre-chorus": "verse",
    "post-chorus": "chorus",
    "instrumental": "inst",
}

def _normalize_label(label: str) -> str:
    label = label.lower().strip()
    return _LABEL_MAP.get(label, label)
```

- [ ] **Step 3: Run end-to-end and verify structure output**

```bash
# Upload and trigger analysis (same as Task 6 Step 4)
# Then fetch results and check structure fields:
curl http://localhost:8000/results/$JOB_ID | python3 -m json.tool | grep -A5 '"bpm"'
```

Expected: non-zero BPM, populated beats/sections arrays. This stage takes 60–90s.

- [ ] **Step 4: Commit**

```bash
git add app/analysis/structure.py
git commit -m "feat: Stage 1 — allin1 structure analysis (BPM, beats, sections)"
```

---

## Task 9: Stage 2 — Key Detection

**Files:**
- Modify: `app/analysis/key.py`

- [ ] **Step 1: Install librosa**

```bash
pip install librosa
```

- [ ] **Step 2: Replace stub in `app/analysis/key.py`**

```python
from pathlib import Path
import numpy as np
import librosa


# Krumhansl-Schmuckler profiles
_MAJOR = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
_MINOR = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

_MODE_TEMPLATES = {
    "ionian":     np.array([1,0,1,0,1,1,0,1,0,1,0,1], dtype=float),
    "dorian":     np.array([1,0,1,1,0,1,0,1,0,1,1,0], dtype=float),
    "phrygian":   np.array([1,1,0,1,0,1,0,1,1,0,1,0], dtype=float),
    "lydian":     np.array([1,0,1,0,1,0,1,1,0,1,0,1], dtype=float),
    "mixolydian": np.array([1,0,1,0,1,1,0,1,0,1,1,0], dtype=float),
    "aeolian":    np.array([1,0,1,1,0,1,0,1,1,0,1,0], dtype=float),
    "locrian":    np.array([1,1,0,1,0,1,1,0,1,0,1,0], dtype=float),
}


def detect_key(wav_path: Path) -> dict:
    y, sr = librosa.load(str(wav_path), sr=None)
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, bins_per_octave=36)
    mean_chroma = chroma.mean(axis=1)  # shape (12,)

    best_score = -np.inf
    best_root = 0
    best_quality = "major"

    for i in range(12):
        maj = np.corrcoef(np.roll(_MAJOR, i), mean_chroma)[0, 1]
        min_score = np.corrcoef(np.roll(_MINOR, i), mean_chroma)[0, 1]
        if maj > best_score:
            best_score, best_root, best_quality = maj, i, "major"
        if min_score > best_score:
            best_score, best_root, best_quality = min_score, i, "minor"

    mode_name, mode_confidence = _detect_mode(mean_chroma, best_root)

    return {
        "key": {
            "root": _NOTES[best_root],
            "mode_quality": best_quality,
            "mode_name": mode_name,
            "mode_confidence": round(float(mode_confidence), 3),
            "key_confidence": round(float(best_score), 3),
        },
        "_chroma": mean_chroma,
        "_tonic_idx": best_root,
    }


def _detect_mode(mean_chroma: np.ndarray, tonic_idx: int) -> tuple[str, float]:
    tonic_relative = np.roll(mean_chroma, -tonic_idx)
    best_mode = "ionian"
    best_score = -np.inf
    for mode_name, template in _MODE_TEMPLATES.items():
        score = np.corrcoef(template, tonic_relative)[0, 1]
        if score > best_score:
            best_score, best_mode = score, mode_name
    return best_mode, float(best_score)
```

- [ ] **Step 3: Verify**

```bash
curl http://localhost:8000/results/$JOB_ID | python3 -m json.tool | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('Key:', d['key'])
"
```

Expected: `{"root": "A", "mode_quality": "minor", ...}` with real values.

- [ ] **Step 4: Commit**

```bash
git add app/analysis/key.py
git commit -m "feat: Stage 2 — key and mode detection via chroma + K-S templates"
```

---

## Task 10: Stage 3 — Chord Detection

**Files:**
- Modify: `app/analysis/chords.py`

- [ ] **Step 1: Verify madmom and music21 are installed**

```bash
python3 -c "import madmom; import music21; print('ok')"
```

If not: `pip install git+https://github.com/CPJKU/madmom music21`

- [ ] **Step 2: Replace stub in `app/analysis/chords.py`**

```python
from pathlib import Path
import numpy as np
import madmom.features.chords as mchords
from music21 import harmony, roman, key as m21key


_DISSONANCE = {
    "maj": 0.1, "min": 0.2, "dom7": 0.5, "maj7": 0.3,
    "min7": 0.35, "dim": 0.8, "hdim7": 0.7, "aug": 0.6,
    "sus2": 0.25, "sus4": 0.25,
}

_DISTANCE = {
    "I": 0.0, "IV": 0.15, "V": 0.2, "II": 0.25, "VI": 0.25,
    "III": 0.3, "VII": 0.35,
}


def detect_chords(wav_path: Path, key_result: dict) -> dict:
    proc = mchords.CNNChordFeatureProcessor()
    decode = mchords.CRFChordRecognitionProcessor()
    features = proc(str(wav_path))
    raw = decode(features)
    # raw: structured array with dtype [('time', '<f8'), ('duration', '<f8'), ('label', '<U25')]
    # each row is (onset_sec, duration_sec, chord_label)

    root_str = key_result["key"]["root"]
    quality = key_result["key"]["mode_quality"]
    key_str = f"{root_str} {quality}"

    chords = []
    for onset, duration, label in raw:
        if label in ("N", "X"):
            continue
        offset = float(onset) + float(duration)
        roman_str = _to_roman(label, key_str)
        tension = _chord_tension(label, roman_str)
        chords.append({
            "start": round(float(onset), 3),
            "end": round(offset, 3),
            "chord": label,
            "roman": roman_str,
            "tension": round(tension, 3),
        })

    fingerprint = _progression_fingerprint(chords)
    return {"progression_fingerprint": fingerprint, "chords": chords}


def _to_roman(chord_label: str, key_str: str) -> str:
    try:
        k = m21key.Key(key_str)
        cs = harmony.ChordSymbol(chord_label)
        rn = roman.romanNumeralFromChord(cs, k)
        return rn.figure
    except Exception:
        return chord_label


def _chord_tension(label: str, roman_str: str) -> float:
    quality = "maj"
    for q in _DISSONANCE:
        if q in label.lower():
            quality = q
            break
    dissonance = _DISSONANCE.get(quality, 0.3)
    distance = 0.2
    for numeral, d in _DISTANCE.items():
        if roman_str.upper().startswith(numeral):
            distance = d
            break
    return dissonance * (1 + distance)


def _progression_fingerprint(chords: list[dict]) -> str:
    seen: list[str] = []
    for c in chords:
        r = c["roman"]
        if not seen or seen[-1] != r:
            seen.append(r)
    return "–".join(seen[:8])
```

- [ ] **Step 3: Verify**

```bash
curl http://localhost:8000/results/$JOB_ID | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('Fingerprint:', d['harmonic']['progression_fingerprint'])
print('First chord:', d['harmonic']['chords'][:1])
"
```

- [ ] **Step 4: Commit**

```bash
git add app/analysis/chords.py
git commit -m "feat: Stage 3 — madmom chord detection with Roman numerals and tension"
```

---

## Task 11: Stage 4 — Pitch Analysis

**Files:**
- Modify: `app/analysis/pitch.py`

- [ ] **Step 1: Install basic-pitch**

```bash
pip install basic-pitch
```

- [ ] **Step 2: Replace stub in `app/analysis/pitch.py`**

```python
from pathlib import Path
import numpy as np
import librosa


_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
_INTERVAL_NAMES = ["1 (root)", "b2", "2", "b3", "3", "4", "b5", "5", "b6", "6", "b7", "7"]


def analyze_pitch(stems_dir: Path, key_result: dict) -> dict:
    from basic_pitch.inference import predict
    from basic_pitch import ICASSP_2022_MODEL_PATH

    tonic_idx = key_result["_tonic_idx"]
    mean_chroma = key_result["_chroma"]

    pitch_ranges: dict[str, dict] = {}
    vocal_midi_range = None

    for stem_name in ("vocals", "other"):
        stem_path = stems_dir / f"{stem_name}.wav"
        if not stem_path.exists():
            continue

        _, _, note_events = predict(
            str(stem_path),
            ICASSP_2022_MODEL_PATH,
            onset_threshold=0.5,
            frame_threshold=0.3,
            minimum_note_length=58,
        )

        if not note_events:
            continue

        midi_pitches = [n[2] for n in note_events if n[4] >= 0.5]  # filter low confidence
        if not midi_pitches:
            continue

        min_midi = int(min(midi_pitches))
        max_midi = int(max(midi_pitches))
        median_midi = int(np.median(midi_pitches))

        pitch_ranges[stem_name] = {
            "min": librosa.midi_to_note(min_midi),
            "max": librosa.midi_to_note(max_midi),
            "median": librosa.midi_to_note(median_midi),
        }

        if stem_name == "vocals":
            vocal_midi_range = (min_midi, max_midi)

    histogram = _build_histogram(mean_chroma, tonic_idx)

    return {
        "pitch_ranges": pitch_ranges,
        "pitch_class_histogram": histogram,
        "_vocal_midi_range": vocal_midi_range,
    }


def _build_histogram(mean_chroma: np.ndarray | None, tonic_idx: int) -> dict:
    if mean_chroma is None:
        return {}
    rotated = np.roll(mean_chroma, -tonic_idx)
    max_val = rotated.max()
    if max_val == 0:
        return {}
    normalized = (rotated / max_val).tolist()
    values = {_INTERVAL_NAMES[i]: round(float(v), 3) for i, v in enumerate(normalized)}
    avoid = [name for name, v in values.items() if v < 0.15]
    return {"tonic_relative": True, "values": values, "avoid_notes": avoid}
```

- [ ] **Step 3: Verify**

```bash
curl http://localhost:8000/results/$JOB_ID | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('Pitch ranges:', d['stems'])
print('Histogram:', list(d['pitch_class_histogram'].get('values', {}).items())[:4])
"
```

- [ ] **Step 4: Commit**

```bash
git add app/analysis/pitch.py
git commit -m "feat: Stage 4 — basic-pitch pitch ranges and tonic-relative histogram"
```

---

## Task 12: Stage 5 — Instrument Classification

**Files:**
- Modify: `app/analysis/instruments.py`

> Known stems (vocals/drums/bass) get their label directly. `other.wav` is classified via spectral features. Replace with a full PaSST model when ready.

- [ ] **Step 1: Replace stub in `app/analysis/instruments.py`**

```python
from pathlib import Path
import numpy as np
import librosa


_KNOWN_LABELS = {
    "vocals": ("vocals", 0.98),
    "drums": ("drum kit", 0.97),
    "bass": ("bass guitar", 0.92),
}


def classify_instruments(stems_dir: Path) -> dict:
    result = {}
    for stem_name, (label, confidence) in _KNOWN_LABELS.items():
        stem_path = stems_dir / f"{stem_name}.wav"
        if stem_path.exists():
            result[stem_name] = {
                "instrument_label": label,
                "instrument_confidence": confidence,
            }

    other_path = stems_dir / "other.wav"
    if other_path.exists():
        label, confidence = _classify_other(other_path)
        result["other"] = {"instrument_label": label, "instrument_confidence": confidence}

    return result


def _classify_other(stem_path: Path) -> tuple[str, float]:
    """
    Heuristic classification of the 'other' stem using spectral centroid.
    High centroid (>3000Hz) → guitar/synth lead; low centroid → piano/pad.
    Replace with PaSST model for production accuracy.
    """
    try:
        y, sr = librosa.load(str(stem_path), sr=22050, duration=30.0)
        centroid = librosa.feature.spectral_centroid(y=y, sr=sr).mean()
        rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr, roll_percent=0.85).mean()

        if centroid > 3500:
            return "electric guitar", 0.55
        elif centroid > 2500:
            return "synthesizer", 0.50
        elif rolloff < 4000:
            return "piano", 0.52
        else:
            return "piano", 0.45
    except Exception:
        return "unknown", 0.0
```

- [ ] **Step 2: Verify**

```bash
curl http://localhost:8000/results/$JOB_ID | python3 -c "
import sys, json
d = json.load(sys.stdin)
for stem, info in d['stems'].items():
    print(stem, '→', info.get('instrument_label'), info.get('instrument_confidence'))
"
```

- [ ] **Step 3: Commit**

```bash
git add app/analysis/instruments.py
git commit -m "feat: Stage 5 — instrument classification (heuristic, PaSST-ready)"
```

---

## Task 13: Stage 6 — Dynamics

**Files:**
- Modify: `app/analysis/dynamics.py`

- [ ] **Step 1: Install audio analysis libs**

```bash
pip install pyloudnorm soundfile scipy
```

- [ ] **Step 2: Replace stub in `app/analysis/dynamics.py`**

```python
from pathlib import Path
import numpy as np
import librosa
import soundfile as sf
import pyloudnorm as pyln
from scipy.ndimage import uniform_filter1d


_HOP = 512       # ~11ms at 44100Hz
_TARGET_RES = 0.1  # downsample to one point per 100ms


def compute_dynamics(wav_path: Path, stems_dir: Path) -> dict:
    y, sr = librosa.load(str(wav_path), sr=None)

    rms = _rms_series(y, sr)
    loudness = _lufs_series(wav_path, sr)
    brightness = _brightness_series(y, sr)
    onset_density = _onset_density_series(y, sr)
    arrangement_density = _arrangement_density(stems_dir, sr)

    return {
        "rms": rms,
        "loudness_lufs": loudness,
        "brightness": brightness,
        "onset_density": onset_density,
        "arrangement_density": arrangement_density,
    }


def _downsample(times: np.ndarray, values: np.ndarray, target_res: float) -> list[list[float]]:
    if len(times) == 0:
        return []
    step = max(1, int(target_res / (times[1] - times[0]))) if len(times) > 1 else 1
    t = times[::step]
    v = values[::step]
    return [[round(float(ti), 3), round(float(vi), 4)] for ti, vi in zip(t, v)]


def _rms_series(y: np.ndarray, sr: int) -> list:
    rms = librosa.feature.rms(y=y, hop_length=_HOP)[0]
    times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=_HOP)
    return _downsample(times, rms, _TARGET_RES)


def _lufs_series(wav_path: Path, sr: int) -> list:
    data, rate = sf.read(str(wav_path))
    if data.ndim == 1:
        data = data[:, np.newaxis]
    meter = pyln.Meter(rate, block_size=0.4)
    chunk_size = int(rate * 0.4)
    hop = int(rate * _TARGET_RES)
    results = []
    for i in range(0, len(data) - chunk_size, hop):
        chunk = data[i : i + chunk_size]
        try:
            lufs = meter.integrated_loudness(chunk)
            if not np.isinf(lufs):
                results.append([round(i / rate, 3), round(float(lufs), 2)])
        except Exception:
            pass
    return results


def _brightness_series(y: np.ndarray, sr: int) -> list:
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=_HOP)[0]
    times = librosa.frames_to_time(np.arange(len(centroid)), sr=sr, hop_length=_HOP)
    return _downsample(times, centroid, _TARGET_RES)


def _onset_density_series(y: np.ndarray, sr: int) -> list:
    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=_HOP)
    smooth_frames = int(0.5 * sr / _HOP)
    smoothed = uniform_filter1d(onset_env, size=smooth_frames)
    times = librosa.frames_to_time(np.arange(len(smoothed)), sr=sr, hop_length=_HOP)
    return _downsample(times, smoothed, _TARGET_RES)


def _arrangement_density(stems_dir: Path, sr: int) -> list:
    stem_names = ["vocals", "drums", "bass", "other"]
    stem_rms: dict[str, np.ndarray] = {}
    ref_len = None

    for name in stem_names:
        path = stems_dir / f"{name}.wav"
        if path.exists():
            y, _ = librosa.load(str(path), sr=sr)
            rms = librosa.feature.rms(y=y, hop_length=_HOP)[0]
            stem_rms[name] = rms
            if ref_len is None:
                ref_len = len(rms)

    if not stem_rms or ref_len is None:
        return []

    density = np.zeros(ref_len)
    for rms in stem_rms.values():
        active = (rms[: ref_len] > 0.01).astype(float)
        density += active

    times = librosa.frames_to_time(np.arange(ref_len), sr=sr, hop_length=_HOP)
    return _downsample(times, density, _TARGET_RES)
```

- [ ] **Step 3: Verify**

```bash
curl http://localhost:8000/results/$JOB_ID | python3 -c "
import sys, json
d = json.load(sys.stdin)
dyn = d['dynamics']
print('RMS points:', len(dyn['rms']))
print('LUFS points:', len(dyn['loudness_lufs']))
print('First RMS:', dyn['rms'][:2])
"
```

Expected: hundreds of data points, sensible values.

- [ ] **Step 4: Commit**

```bash
git add app/analysis/dynamics.py
git commit -m "feat: Stage 6 — RMS, LUFS, brightness, onset density, arrangement density"
```

---

## Task 14: Stage 7 — Tension Curve

**Files:**
- Modify: `app/analysis/tension.py`

- [ ] **Step 1: Replace stub in `app/analysis/tension.py`**

```python
import numpy as np
from scipy.ndimage import gaussian_filter1d


_SEMITONE_TENSION = {
    0: 0.0, 1: 0.9, 2: 0.3, 3: 0.2, 4: 0.15,
    5: 0.1, 6: 1.0, 7: 0.05, 8: 0.15, 9: 0.2,
    10: 0.4, 11: 0.85,
}


def compute_tension(chords_result: dict, pitch_result: dict, dynamics_result: dict) -> list:
    """
    Three-component blend:
      40% chord tension (from chord quality + distance from tonic)
      35% melodic tension (semitone distance from nearest chord tone)
      25% dynamic tension (normalized RMS)
    """
    rms_series = dynamics_result.get("rms", [])
    if not rms_series:
        return []

    times = np.array([p[0] for p in rms_series])
    rms_vals = np.array([p[1] for p in rms_series])

    chord_curve = _interpolate_chord_tension(chords_result.get("chords", []), times)
    dynamic_curve = _normalize(rms_vals)
    melodic_curve = _melodic_tension(pitch_result, chords_result.get("chords", []), times)

    tension = 0.4 * chord_curve + 0.25 * dynamic_curve + 0.35 * melodic_curve
    tension_smooth = gaussian_filter1d(tension, sigma=10)

    return [[round(float(t), 3), round(float(v), 4)] for t, v in zip(times, tension_smooth)]


def _interpolate_chord_tension(chords: list[dict], times: np.ndarray) -> np.ndarray:
    result = np.zeros(len(times))
    for chord in chords:
        mask = (times >= chord["start"]) & (times < chord["end"])
        result[mask] = chord.get("tension", 0.2)
    return result


def _normalize(arr: np.ndarray) -> np.ndarray:
    max_val = arr.max()
    return arr / max_val if max_val > 0 else arr


def _melodic_tension(pitch_result: dict, chords: list[dict], times: np.ndarray) -> np.ndarray:
    """Approximate: use pitch histogram avoid-note prevalence as melodic tension proxy."""
    histogram = pitch_result.get("pitch_class_histogram", {})
    avoid_notes = set(histogram.get("avoid_notes", []))
    values = histogram.get("values", {})

    if not values:
        return np.zeros(len(times))

    avoid_weight = sum(values.get(n, 0) for n in avoid_notes)
    total = sum(values.values()) or 1
    base_tension = avoid_weight / total

    return np.full(len(times), base_tension)
```

- [ ] **Step 2: Verify**

```bash
curl http://localhost:8000/results/$JOB_ID | python3 -c "
import sys, json
d = json.load(sys.stdin)
tc = d['tension_curve']
print('Tension points:', len(tc))
print('First 3:', tc[:3])
print('Max tension:', max(v for _, v in tc))
"
```

Expected: smooth curve with values between 0 and 1, same number of points as the dynamics series.

- [ ] **Step 3: Commit**

```bash
git add app/analysis/tension.py
git commit -m "feat: Stage 7 — tension curve (chord + melodic + dynamic blend)"
```

---

## Task 15: Stage 8 — Aggregate

**Files:**
- Modify: `app/analysis/aggregate.py`

- [ ] **Step 1: Replace stub in `app/analysis/aggregate.py`**

```python
import numpy as np
import librosa


_VOICE_RANGES = {
    "bass":           (40, 67),   # E2–G4
    "baritone":       (45, 72),   # A2–C5
    "tenor":          (48, 76),   # C3–E5
    "mezzo-soprano":  (55, 79),   # G3–G5
    "soprano":        (60, 84),   # C4–C6
}


def aggregate(
    structure: dict,
    key_result: dict,
    chords_result: dict,
    pitch_result: dict,
    dynamics_result: dict,
    tension_result: list,
) -> dict:
    section_comparison = _compare_sections(
        structure["sections"],
        dynamics_result,
        tension_result,
        chords_result.get("chords", []),
        structure.get("bpm", 120),
    )
    transposition = _transposition_suggestions(
        key_result,
        pitch_result.get("_vocal_midi_range"),
    )
    return {"section_comparison": section_comparison, "transposition": transposition}


def _slice_series(series: list, start: float, end: float) -> list[float]:
    return [v for t, v in series if start <= t < end]


def _compare_sections(
    sections: list[dict],
    dynamics: dict,
    tension: list,
    chords: list[dict],
    bpm: float,
) -> list[dict]:
    from collections import defaultdict
    label_stats: dict[str, list] = defaultdict(list)

    for sec in sections:
        start, end = sec["start"], sec["end"]
        rms_vals = _slice_series(dynamics.get("rms", []), start, end)
        lufs_vals = _slice_series(dynamics.get("loudness_lufs", []), start, end)
        brightness_vals = _slice_series(dynamics.get("brightness", []), start, end)
        density_vals = _slice_series(dynamics.get("arrangement_density", []), start, end)
        tension_vals = _slice_series(tension, start, end)

        sec_chords = [c for c in chords if c["start"] >= start and c["end"] <= end]
        duration_bars = max((end - start) / (60 / bpm / 4), 1)
        chord_change_rate = len(sec_chords) / duration_bars

        label_stats[sec["label"]].append({
            "avg_loudness_lufs": float(np.mean(lufs_vals)) if lufs_vals else 0.0,
            "avg_brightness": float(np.mean(brightness_vals)) if brightness_vals else 0.0,
            "avg_tension": float(np.mean(tension_vals)) if tension_vals else 0.0,
            "avg_density": float(np.mean(density_vals)) if density_vals else 0.0,
            "peak_rms": float(np.max(rms_vals)) if rms_vals else 0.0,
            "chord_change_rate": round(chord_change_rate, 3),
        })

    result = []
    for label, instances in label_stats.items():
        merged = {k: round(float(np.mean([i[k] for i in instances])), 3) for k in instances[0]}
        result.append({"label": label, "instances": len(instances), **merged})

    return result


def _transposition_suggestions(key_result: dict, vocal_midi_range) -> dict:
    if vocal_midi_range is None:
        return {}

    min_midi, max_midi = vocal_midi_range
    span = max_midi - min_midi
    tonic_name = key_result["key"]["root"]
    quality = key_result["key"]["mode_quality"]
    notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    tonic_idx = notes.index(tonic_name)

    suggestions = []
    for semitones in [-4, -2, 0, 2, 4]:
        new_tonic_idx = (tonic_idx + semitones) % 12
        new_key_name = f"{notes[new_tonic_idx]} {quality}"
        new_min = min_midi + semitones
        new_max = max_midi + semitones
        fits = [
            vtype for vtype, (lo, hi) in _VOICE_RANGES.items()
            if new_min >= lo and new_max <= hi
        ]
        suggestions.append({
            "semitones": semitones,
            "new_key": new_key_name,
            "vocal_range": {
                "min": librosa.midi_to_note(new_min),
                "max": librosa.midi_to_note(new_max),
            },
            "fits_voice_types": fits,
        })

    return {
        "vocal_range_original": {
            "min": librosa.midi_to_note(min_midi),
            "max": librosa.midi_to_note(max_midi),
            "span_semitones": span,
        },
        "suggestions": suggestions,
    }
```

- [ ] **Step 2: Verify full result**

```bash
curl http://localhost:8000/results/$JOB_ID | python3 -m json.tool > /tmp/result.json
cat /tmp/result.json | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('Sections:', [s['label'] for s in d['section_comparison']])
print('Transposition:', d['transposition'].get('vocal_range_original'))
"
```

Expected: section labels with per-section stats, transposition suggestions (empty if no vocals detected).

- [ ] **Step 3: Commit**

```bash
git add app/analysis/aggregate.py
git commit -m "feat: Stage 8 — section comparison and transposition suggestions"
```

---

## Task 16: Stem Upload

**Files:**
- No file changes needed — `tasks.py` already handles stem upload in Stage 9.

- [ ] **Step 1: Test with `include_stems: true`**

```bash
FILE_ID=$(curl -s -X POST http://localhost:8000/upload \
  -F "file=@/path/to/audio.mp3" | python3 -c "import sys,json; print(json.load(sys.stdin)['file_id'])")

JOB_ID=$(curl -s -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d "{\"file_id\": \"$FILE_ID\", \"options\": {\"include_stems\": true}}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['job_id'])")

# Wait for completion, then:
curl http://localhost:8000/results/$JOB_ID | python3 -c "
import sys, json
d = json.load(sys.stdin)
for stem, info in d['stems'].items():
    print(stem, '→ download_url:', info.get('download_url', 'MISSING'))
"
```

Expected: each stem shows a `file://` URL pointing to `./data/stems/<job_id>/<stem>.wav`.

- [ ] **Step 2: Commit if any fixes needed**

```bash
git add -p  # only if something needed fixing
git commit -m "fix: verify stem upload path handling"
```

---

## Task 17: Error Handling Pass

**Files:**
- No file changes needed — per-stage try/except is already wired in `tasks.py`.

- [ ] **Step 1: Test failure path — upload a non-audio file**

```bash
echo "not audio" > /tmp/fake.mp3
curl -X POST http://localhost:8000/upload \
  -F "file=@/tmp/fake.mp3;type=audio/mpeg"
```

Expected: `422` from ffprobe duration check, or `415` if MIME detection catches it.

- [ ] **Step 2: Test a stage failure — temporarily break a stage**

Edit `app/analysis/key.py` `detect_key()` to `raise RuntimeError("test error")`. Trigger an analysis job, then:

```bash
curl http://localhost:8000/jobs/$JOB_ID
```

Expected: `{"status": "failed", "stage": "key", "error": "test error"}`. Restore the real implementation after.

- [ ] **Step 3: Verify cleanup — temp files are gone after failure**

```bash
ls /tmp/music-analyzer/
```

Expected: empty (or missing). The `finally` block in `run_analysis` cleans up even on failure.

- [ ] **Step 4: Final integration run**

Upload a real 3–4 minute song, trigger analysis with `include_stems: true`, poll until done, and inspect the full result JSON. Confirm all fields are populated with real values.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: error handling verification and final integration pass"
```

---

## Manual Testing Reference

```bash
# Start services
docker compose up -d
uvicorn app.main:app --reload --port 8000

# Full flow
FILE_ID=$(curl -s -X POST http://localhost:8000/upload \
  -F "file=@song.mp3" | python3 -c "import sys,json; print(json.load(sys.stdin)['file_id'])")

JOB_ID=$(curl -s -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d "{\"file_id\":\"$FILE_ID\",\"options\":{\"include_stems\":true}}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['job_id'])")

# Poll
watch -n 3 "curl -s http://localhost:8000/jobs/$JOB_ID | python3 -m json.tool | grep -E 'status|stage|progress'"

# Results
curl http://localhost:8000/results/$JOB_ID | python3 -m json.tool
```

# OpenAPI docs
Open http://localhost:8000/docs in a browser for the interactive API explorer.
```
