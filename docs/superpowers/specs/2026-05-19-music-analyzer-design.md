# Music Composition Analysis Backend — Design Spec

**Date:** 2026-05-19
**Status:** Approved

---

## Overview

A Python backend that accepts audio file uploads and returns a comprehensive musical analysis: key, BPM, song sections, chord progressions, instrument classification, dynamics, tension curve, and arrangement density. A separate Next.js frontend (out of scope) consumes the REST API. This spec covers the PoC phase only.

---

## Goals & Constraints

- **PoC scope:** Single-user, local development only. No authentication, no rate limiting, no production deployment.
- **Extensibility:** Every major swap point (auth, task dispatch, file storage) is abstracted so production features can be added without restructuring the codebase.
- **PyTorch only:** No TensorFlow or other ML frameworks. All models must be compatible with PyTorch + Apple MPS (M2 support).
- **Tests deferred:** No test suite during PoC. `tests/` directory scaffolded for later. Short fixture WAV files (`tests/fixtures/`) created alongside each stage for manual testing.
- **No Redis, no Celery:** Background processing via FastAPI `BackgroundTasks`. Postgres holds all job state.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| API framework | FastAPI | Async, automatic OpenAPI docs |
| Background tasks | FastAPI BackgroundTasks | Runs in-process thread pool; swappable for Celery later |
| Database | PostgreSQL | Job state + JSONB result storage |
| File storage | LocalStorageBackend (PoC) | Abstracted; S3StorageBackend added when deploying |
| Audio conversion | FFmpeg | System install required |
| Structure analysis | allin1 | BPM, beats, sections, runs Demucs internally |
| Key detection | librosa | Chroma + Krumhansl-Schmuckler templates |
| Chord detection | madmom | CNNChordFeatureProcessor + CRFChordRecognitionProcessor |
| Pitch tracking | basic-pitch (Spotify) | PyTorch/ONNX, no separate model download |
| Instrument classification | PaSST | PyTorch, replaces YAMNet (avoids TensorFlow) |
| Dynamics | librosa + pyloudnorm | RMS, LUFS, spectral centroid, onset density |
| Tension | custom blend | Chord + melodic + dynamic tension components |
| Local dev infra | Docker Compose | Postgres only (no Redis) |

---

## Repository Structure

```
song_composition_analysis/
├── app/
│   ├── main.py                  # FastAPI app, lifespan, CORS
│   ├── config.py                # pydantic-settings (all env vars)
│   ├── database.py              # SQLAlchemy async setup
│   ├── storage.py               # StorageBackend ABC + Local/S3 impls
│   ├── dependencies.py          # get_storage(), get_current_user() stubs
│   ├── tasks.py                 # dispatch_task() + run_analysis()
│   ├── api/
│   │   ├── upload.py            # POST /upload
│   │   ├── analyze.py           # POST /analyze
│   │   └── jobs.py              # GET /jobs/{id}, GET /results/{id}
│   ├── models/
│   │   ├── db.py                # SQLAlchemy ORM models
│   │   └── schemas.py           # Pydantic request/response schemas
│   └── analysis/
│       ├── preprocess.py        # Stage 0: FFmpeg conversion + validation
│       ├── structure.py         # Stage 1: allin1 (BPM, beats, sections)
│       ├── key.py               # Stage 2: key + mode fingerprint
│       ├── chords.py            # Stage 3: madmom chord detection
│       ├── pitch.py             # Stage 4: pitch range + histogram
│       ├── instruments.py       # Stage 5: PaSST classification
│       ├── dynamics.py          # Stage 6: RMS, LUFS, brightness, density
│       ├── tension.py           # Stage 7: tension curve
│       └── aggregate.py         # Stage 8: section comparison + transposition
├── tests/
│   ├── fixtures/                # Short WAV clips for manual stage testing
│   ├── conftest.py
│   ├── test_api.py
│   └── analysis/
│       ├── test_key.py
│       ├── test_chords.py
│       └── test_dynamics.py
├── data/                        # LocalStorageBackend writes here (gitignored)
├── docker-compose.yml           # Postgres only
├── Dockerfile
├── requirements.txt
├── .env.example
└── README.md
```

---

## Storage Abstraction

`StorageBackend` is an ABC with three methods. `LocalStorageBackend` is the active implementation for the PoC. `S3StorageBackend` is a stub that raises `NotImplementedError` — it defines the interface and makes the swap point explicit.

```python
class StorageBackend(ABC):
    def save(self, key: str, data: bytes) -> str: ...   # returns the key
    def load(self, key: str) -> bytes: ...
    def get_url(self, key: str) -> str: ...              # local: file:// path, S3: presigned URL

class LocalStorageBackend(StorageBackend):
    # writes to ./data/<key>, creates parent dirs as needed
    def get_url(self, key): return f"file://{self.base_dir / key}"

class S3StorageBackend(StorageBackend):
    # boto3 put_object / get_object / generate_presigned_url
    # implemented when deploying to production
```

The active backend is selected by `STORAGE_BACKEND=local|s3` in `.env`, resolved once in `dependencies.py` via `get_storage()`, and injected into routes via `Depends(get_storage)`.

---

## Task Dispatch Abstraction

`dispatch_task()` is a single function. All routes call it instead of `background_tasks.add_task()` directly. To add Celery later, only this function changes.

```python
# app/tasks.py
async def dispatch_task(background_tasks: BackgroundTasks, fn, *args):
    background_tasks.add_task(fn, *args)

# Future Celery swap — only this function changes:
# def dispatch_task(background_tasks, fn, *args):
#     celery_app.send_task(fn.__name__, args=args)
```

---

## Auth Stub

Every route declares `get_current_user` as a dependency. It currently returns `None` and is unused. When auth is added, only `get_current_user` changes — no routes are touched.

```python
# app/dependencies.py
async def get_current_user():
    return None  # replace with API key / JWT logic when ready
```

---

## Database Schema

```sql
CREATE TABLE files (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_name VARCHAR(255),
    storage_key   VARCHAR(512) NOT NULL,   -- key within StorageBackend
    duration_sec  FLOAT,
    size_bytes    BIGINT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE jobs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id       UUID NOT NULL REFERENCES files(id),
    status        VARCHAR(20) NOT NULL DEFAULT 'queued',
                  -- queued | processing | done | failed
    stage         VARCHAR(60),            -- human-readable current stage name
    progress      INTEGER DEFAULT 0,      -- 0–100
    error         TEXT,                   -- set on failure, null otherwise
    result        JSONB,                  -- full result written here on completion
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_file_id ON jobs(file_id);
CREATE INDEX idx_jobs_status  ON jobs(status);
```

---

## API Specification

### `POST /upload`
Validates format and duration, saves to `StorageBackend`, writes `files` row.

- **Accepted formats:** `audio/mpeg`, `audio/wav`, `audio/flac`, `audio/aiff`, `audio/x-aiff`
- **Max size:** 100MB (`413` if exceeded)
- **Duration:** 10s–600s via FFprobe (`422` if out of range)
- **Response 200:** `{ file_id, filename, duration_sec, size_bytes }`

### `POST /analyze`
Creates a `jobs` row, calls `dispatch_task()` to start background processing.

- **Request:** `{ file_id, options: { detect_mode, include_stems } }`
- **Response 202:** `{ job_id, status: "queued" }`
- **Error:** `404` if `file_id` not found

### `GET /jobs/{job_id}`
Client polls this while analysis runs.

- **Response 200:** `{ job_id, status, stage, progress, created_at }`
- When `status == "done"`: includes full `result` object
- When `status == "failed"`: includes `error` string

### `GET /results/{job_id}`
Returns the full result JSON. Returns `404` if job is not yet done.

---

## Analysis Pipeline

Located in `app/tasks.py`. Each stage calls into `app/analysis/`. Progress is written to the `jobs` table after each stage. Every stage starts as a stub returning an empty typed value (`{}` or `[]`) and is replaced with a real implementation one at a time. The pipeline always runs to completion even with stub stages, so the API contract is testable from day one.

```
Stage 0  [ 0%] Preprocess              (FFmpeg → 44100Hz mono WAV, FFprobe validation)
Stage 1  [10%] Analyzing structure     (allin1: BPM, beats, downbeats, sections) ← slowest ~60–90s
Stage 2  [70%] Detecting key           (librosa chroma + Krumhansl-Schmuckler)
Stage 3  [74%] Detecting chords        (madmom CNN + CRF, Roman numerals via music21)
Stage 4  [78%] Analyzing pitch ranges  (basic-pitch on stems, reuses Stage 2 chroma)
Stage 5  [83%] Classifying instruments (PaSST on each stem)
Stage 6  [87%] Computing dynamics      (RMS, LUFS, brightness, onset density, arrangement density)
Stage 7  [91%] Computing tension       (chord + melodic + dynamic blend)
Stage 8  [94%] Aggregating sections    (per-section stats, transposition suggestions)
Stage 9  [97%] Uploading stems         (only if include_stems=true)
Stage 10[100%] Done
```

### Stem reuse (critical for performance)
`allin1` runs Demucs internally. `keep_byproducts=True` retains stems on disk. All subsequent stages that need per-stem audio read from this cached location — Demucs is never run twice.

```python
result = allin1.analyze(wav_path, keep_byproducts=True)
stems_dir = wav_path.parent / "htdemucs" / wav_path.stem
# stems_dir/vocals.wav, drums.wav, bass.wav, other.wav
```

---

## Error Handling

**API layer:** Standard FastAPI `HTTPException` with appropriate status codes. Validation errors return `422` with field-level detail from Pydantic.

**Pipeline:** Each stage is wrapped individually. On failure, the job row is updated to `status=failed` with the failing stage name and error message. The pipeline stops. Temp files (converted WAV, stems on local disk) are deleted in a `finally` block whether the pipeline succeeds or fails.

```python
try:
    structure = analyze_structure(wav_path)
except Exception as e:
    await set_failed(job_id, stage="structure", error=str(e))
    return
```

---

## Environment Variables

```bash
# .env.example

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/musicanalyzer

# Storage
STORAGE_BACKEND=local           # local | s3
STORAGE_LOCAL_DIR=./data

# S3 / Cloudflare R2 (only needed when STORAGE_BACKEND=s3)
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

# CORS (for Next.js frontend)
ALLOWED_ORIGINS=http://localhost:3000
```

---

## Docker Compose (Local Dev)

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: musicanalyzer
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    ports: ["5432:5432"]
    volumes: ["postgres_data:/var/lib/postgresql/data"]

volumes:
  postgres_data:
```

FastAPI and the analysis pipeline run outside Docker:
```bash
docker compose up -d                                      # start Postgres
uvicorn app.main:app --reload --port 8000                 # run API
```

---

## Build Order

1. Project scaffolding — directory structure, `config.py`, `database.py`, Docker Compose, `.env.example`
2. Alembic setup — migrations for `files` and `jobs` tables
3. Storage layer — `StorageBackend` ABC, `LocalStorageBackend`, `get_storage()` dependency
4. Upload endpoint — `POST /upload` with FFmpeg/FFprobe validation, file record creation
5. Job endpoints — `POST /analyze`, `GET /jobs/{id}`, `GET /results/{id}` with stub pipeline (all stages return empty values, job progresses to `done`)
   > **API contract is fully functional here. Frontend can integrate.**
6. Stage 1 — `structure.py` (allin1). Validates GPU/MPS setup. Longest stage.
7. Stage 2 — `key.py`
8. Stage 3 — `chords.py`
9. Stage 4 — `pitch.py` (reuses Stage 2 chroma output)
10. Stage 5 — `instruments.py` (PaSST)
11. Stage 6 — `dynamics.py`
12. Stage 7 — `tension.py` (depends on Stages 3, 4, 6)
13. Stage 8 — `aggregate.py`
14. Stem upload — wire `include_stems` option, upload via `StorageBackend`, populate `download_url`
15. Error handling pass — wrap each stage, surface clean messages to job record
16. Performance pass — profile with a real song, tune hop sizes and downsample rates

---

## Key Constraints & Gotchas

- **allin1 + NATTEN install is the hardest part.** Test this before writing any other code. Use `allin1fix` for PyTorch 2.x. Allow 30–60 minutes for compilation on M2.
- **Demucs stems must be reused.** Never call any separation library twice on the same file.
- **basic-pitch on `other.wav` is noisy.** Filter out notes with onset confidence < 0.5.
- **Mode detection is unreliable on pop music.** Report confidence score so the frontend can show uncertainty.
- **LUFS computation is memory-intensive** for long tracks. Process in chunks for tracks over 5 minutes.
- **Result JSON size.** Enable gzip compression on FastAPI responses. At 100ms resolution a 4-minute song produces ~29KB of time-series data uncompressed — acceptable.
- **PaSST on `other.wav`** will be uncertain (catch-all stem). Report top-3 predictions + confidence per stem, not just the top label.
