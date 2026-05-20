# Music Analysis Backend — Build Plan

## Project Overview

A Python backend for a music composition analysis tool. Musicians upload a song and receive a
comprehensive analysis: key, BPM, song sections, chord progressions, instrument ranges, dynamics,
tension curve, arrangement density, and more. The frontend is a separate Next.js app (not in scope
here) that consumes this backend's REST API.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| API framework | FastAPI | Async, automatic OpenAPI docs |
| Task queue | Celery | Background job processing |
| Message broker | Redis | Celery broker + job progress storage |
| Database | PostgreSQL | Job metadata + JSONB result storage |
| File storage | Cloudflare R2 (or AWS S3) | Uploads + separated stems |
| Audio conversion | FFmpeg | System-level install required |
| Deployment | Modal (recommended) or Fly.io | GPU on-demand for allin1 + Demucs |

---

## Repository Structure

```
music-analyzer/
├── app/
│   ├── main.py                  # FastAPI app entry point
│   ├── config.py                # Settings via pydantic-settings
│   ├── database.py              # SQLAlchemy setup
│   ├── storage.py               # S3/R2 client helpers
│   ├── api/
│   │   ├── __init__.py
│   │   ├── upload.py            # POST /upload
│   │   ├── analyze.py           # POST /analyze
│   │   └── jobs.py              # GET /jobs/{id}, GET /results/{id}
│   ├── models/
│   │   ├── __init__.py
│   │   ├── db.py                # SQLAlchemy ORM models
│   │   └── schemas.py           # Pydantic request/response schemas
│   ├── worker/
│   │   ├── __init__.py
│   │   ├── celery_app.py        # Celery app + Redis config
│   │   ├── tasks.py             # Main analysis task
│   │   └── progress.py          # Progress reporting helpers
│   └── analysis/
│       ├── __init__.py
│       ├── preprocess.py        # Stage 0: FFmpeg conversion
│       ├── structure.py         # Stage 1: allin1 (BPM, beats, sections)
│       ├── key.py               # Stage 2: Key + mode fingerprint
│       ├── chords.py            # Stage 3: Chord detection + Roman numerals
│       ├── pitch.py             # Stage 4: Pitch range + pitch class histogram
│       ├── instruments.py       # Stage 5: Instrument classification
│       ├── dynamics.py          # Stage 6: Dynamics + arrangement density
│       ├── tension.py           # Stage 7: Tension curve
│       └── aggregate.py         # Stage 8: Section comparison + transposition
├── tests/
│   ├── conftest.py
│   ├── test_api.py
│   └── analysis/
│       ├── test_key.py
│       ├── test_chords.py
│       └── test_dynamics.py
├── docker-compose.yml           # Local dev: postgres + redis
├── Dockerfile
├── requirements.txt
├── .env.example
└── README.md
```

---

## Dependencies

```
# requirements.txt

# API
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
pydantic>=2.7.0
pydantic-settings>=2.2.0
python-multipart>=0.0.9       # multipart file uploads

# Queue
celery>=5.4.0
redis>=5.0.0

# Database
sqlalchemy>=2.0.0
asyncpg>=0.29.0               # async postgres driver
alembic>=1.13.0               # migrations

# Storage
boto3>=1.34.0                 # S3/R2 client

# Audio analysis — install in this order
torch>=2.0.0                  # install first, GPU version if available
allin1>=2.0.0                 # or allin1fix for PyTorch 2.x compat
librosa>=0.10.0
basic-pitch>=0.3.0            # Spotify pitch tracker
pyloudnorm>=0.1.1
music21>=9.1.0
scipy>=1.13.0
numpy>=1.26.0
soundfile>=0.12.3

# FFmpeg wrapper
ffmpeg-python>=0.2.0          # Python bindings (still needs system ffmpeg)
```

**System dependencies (must be installed separately):**
- `ffmpeg` — audio conversion
- CUDA toolkit if using GPU locally

**Install notes:**
- `allin1` depends on `madmom` and `NATTEN`. Install in this order:
  1. `pip install torch` (GPU version matching your CUDA)
  2. `pip install ninja`
  3. `pip install git+https://github.com/CPJKU/madmom`
  4. Clone and build NATTEN from source
  5. `pip install allin1` (or `allin1fix` for PyTorch 2.x)
- `basic-pitch` ships its own TF/ONNX model; no separate model download needed

---

## Database Schema

```sql
-- Run via Alembic migrations

CREATE TABLE jobs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id       UUID NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'queued',
                  -- queued | processing | done | failed
    stage         VARCHAR(60),          -- human-readable current stage
    progress      INTEGER DEFAULT 0,    -- 0–100
    error         TEXT,
    result        JSONB,                -- full result stored here when done
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE files (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_name VARCHAR(255),
    s3_key        VARCHAR(512) NOT NULL,
    duration_sec  FLOAT,
    size_bytes    BIGINT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_file_id ON jobs(file_id);
CREATE INDEX idx_jobs_status  ON jobs(status);
```

---

## API Specification

### `POST /upload`

Accepts a multipart audio file. Validates format and duration, uploads to S3/R2, records
in the `files` table.

**Request:** `multipart/form-data` with field `file` (audio file)

**Validation:**
- Accepted MIME types: `audio/mpeg`, `audio/wav`, `audio/flac`, `audio/aiff`, `audio/x-aiff`
- Max file size: 100MB
- Duration check: after FFprobe, reject if < 10s or > 600s

**Response `200`:**
```json
{
  "file_id": "uuid",
  "filename": "my_song.mp3",
  "duration_sec": 214.3,
  "size_bytes": 8421376
}
```

**Errors:** `413` file too large, `415` unsupported format, `422` too short/long

---

### `POST /analyze`

Enqueues an analysis job for a previously uploaded file.

**Request body:**
```json
{
  "file_id": "uuid",
  "options": {
    "detect_mode": true,         // scale/mode fingerprint
    "include_stems": true        // upload separated stems to S3
  }
}
```

**Response `202`:**
```json
{
  "job_id": "uuid",
  "status": "queued"
}
```

**Error:** `404` if `file_id` not found

---

### `GET /jobs/{job_id}`

Poll this endpoint while analysis is running.

**Response `200`:**
```json
{
  "job_id": "uuid",
  "status": "processing",
  "stage": "Detecting chords...",
  "progress": 45,
  "created_at": "2024-01-01T12:00:00Z"
}
```

When `status == "done"`, also includes the full `result` object (see Result Schema below).
When `status == "failed"`, includes `"error": "human-readable message"`.

---

### `GET /results/{job_id}`

Returns the full result JSON for a completed job. Returns `404` if not done yet.

---

## Analysis Pipeline (Celery Task)

Located in `worker/tasks.py`. Each stage calls into `app/analysis/`. Progress is written to
Redis after each stage so `/jobs/{id}` can report it in real time.

```
Stage 0  [ 0%] Preprocess
Stage 1  [10%] Analyzing structure (BPM, beats, sections)   ← slow, ~60–90s
Stage 2  [70%] Detecting key and mode
Stage 3  [74%] Detecting chords
Stage 4  [78%] Analyzing pitch ranges
Stage 5  [83%] Classifying instruments
Stage 6  [87%] Computing dynamics
Stage 7  [91%] Computing tension curve
Stage 8  [94%] Comparing sections
Stage 9  [97%] Uploading stems
Stage 10[100%] Done
```

### Progress helper pattern

```python
# worker/progress.py
def update_progress(redis_client, job_id: str, stage: str, pct: int):
    redis_client.hset(f"job:{job_id}", mapping={
        "stage": stage,
        "progress": pct
    })
```

### Stem reuse pattern (critical for performance)

`allin1` runs Demucs internally. Pass `keep_byproducts=True` to retain stems on disk.
All subsequent stages that need per-stem audio (pitch analysis, instrument classification,
arrangement density) must read from this cached location rather than re-running separation.

```python
# worker/tasks.py (sketch)
result = allin1.analyze(wav_path, keep_byproducts=True)
stems_dir = wav_path.parent / "htdemucs" / wav_path.stem
# stems_dir contains: vocals.wav, drums.wav, bass.wav, other.wav
```

---

## Stage Implementation Notes

### Stage 0 — Preprocess (`analysis/preprocess.py`)

- Use `ffmpeg-python` to convert input to 44100Hz mono WAV
- Run `ffprobe` to get exact duration and validate
- Store converted WAV path for use by all subsequent stages
- Delete original upload locally after conversion (keep S3 copy)

### Stage 1 — Structure (`analysis/structure.py`)

- Call `allin1.analyze(wav_path, keep_byproducts=True)`
- Returns: `bpm`, `beats`, `downbeats`, `beat_positions`, `segments`
- Infer time signature from beat_positions pattern (mostly 4/4; look for 3-beat cycles for 3/4)
- Normalize segment labels to: `intro | verse | chorus | bridge | break | inst | solo | outro`

### Stage 2 — Key & Mode (`analysis/key.py`)

**Key detection:**
- `librosa.feature.chroma_cqt(y, sr, bins_per_octave=36)` on the full mix
- Average chroma across time → 12-dimensional profile
- Correlate against Krumhansl-Schmuckler major + minor templates (rotated for all 12 roots)
- Pick root + mode with highest correlation; report as confidence score

**Mode fingerprint:**
- Extract chroma from the `vocals.wav` stem (cleaner pitch signal than full mix)
- If vocals stem is silent (instrumental track), fall back to `other.wav`
- Rotate chroma profile to be tonic-relative (so C=0 regardless of key)
- Correlate against 7 mode templates (ionian through locrian)
- Return best match + confidence

```python
MODE_TEMPLATES = {
    "ionian":     [1,0,1,0,1,1,0,1,0,1,0,1],
    "dorian":     [1,0,1,1,0,1,0,1,0,1,1,0],
    "phrygian":   [1,1,0,1,0,1,0,1,1,0,1,0],
    "lydian":     [1,0,1,0,1,0,1,1,0,1,0,1],
    "mixolydian": [1,0,1,0,1,1,0,1,0,1,1,0],
    "aeolian":    [1,0,1,1,0,1,0,1,1,0,1,0],
    "locrian":    [1,1,0,1,0,1,1,0,1,0,1,0],
}
```

### Stage 3 — Chords (`analysis/chords.py`)

- Use `autochord` library, or `madmom.features.chords.CNNChordFeatureProcessor` + `CRFChordRecognitionProcessor`
- For each detected chord, compute Roman numeral using `music21.roman.romanNumeralFromChord`
- Assign a dissonance weight per chord quality (used later for tension):
  ```
  major:       0.1    minor:       0.2
  dominant7:   0.5    major7:      0.3
  minor7:      0.35   diminished:  0.8
  half-dim:    0.7    augmented:   0.6
  sus2/sus4:   0.25
  ```
- Compute "distance from tonic" factor: tonic = 0.0, dominant = 0.2, tritone = 1.0 (interpolate for others)
- Store `chord_tension = dissonance_weight * (1 + distance_factor)` per chord for Stage 7

### Stage 4 — Pitch (`analysis/pitch.py`)

**Pitch range per stem:**
- Run `basic_pitch.inference.predict` on `vocals.wav` and `other.wav`
- Returns a MIDI piano roll; find min/max/median active MIDI pitch
- Convert MIDI numbers to note names: `librosa.midi_to_note(midi_num)`
- Filter out notes with confidence < 0.5 to avoid spurious detections

**Pitch class histogram:**
- Reuse the chroma average computed in Stage 2 (pass it through, don't recompute)
- Normalize to 0–1 range (divide by max value)
- Map 12 bins to note names relative to detected key (so tonic is always shown first)
- Flag "avoid notes": pitch classes with value < 0.15 that are also outside the detected scale

### Stage 5 — Instruments (`analysis/instruments.py`)

- Load each stem file and run through `yamnet` (via TensorFlow Hub) or `PaSST` model
- Average frame-level predictions for a track-level label
- Return top-3 predicted classes + confidence scores per stem
- Note: `drums.wav` and `bass.wav` are usually high-confidence; `other.wav` is the uncertain one

### Stage 6 — Dynamics (`analysis/dynamics.py`)

All computed on the full mix WAV.

**RMS energy:**
```python
rms = librosa.feature.rms(y=y, hop_length=512)[0]
times = librosa.frames_to_time(range(len(rms)), sr=sr, hop_length=512)
```

**LUFS loudness:**
```python
meter = pyloudnorm.Meter(sr, block_size=0.4)  # 400ms blocks
# Slide in 100ms hops manually for time-series
```

**Spectral brightness:**
```python
centroid = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=512)[0]
```

**Onset density (transient activity):**
```python
onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=512)
# Smooth with a 0.5s window to get local density
```

**Arrangement density:**
```python
for stem_name, stem_audio in stems.items():
    stem_rms = librosa.feature.rms(y=stem_audio, hop_length=512)[0]
    active[stem_name] = (stem_rms > 0.01).astype(int)
density = sum(active.values())   # 0–4 per frame
```

All time-series are stored as `[[time_sec, value], ...]` arrays, downsampled to one point
per 100ms (every ~4–5 frames) to keep the result JSON manageable.

### Stage 7 — Tension Curve (`analysis/tension.py`)

Three-component blend, all aligned to the same time axis as dynamics:

```python
# 1. Chord tension: interpolate chord_tension values across their time spans
# 2. Melodic tension: from basic-pitch output, compute interval from nearest chord tone
#    semitone_tension = {0: 0.0, 1: 0.9, 2: 0.3, 3: 0.2, 4: 0.15, 5: 0.1,
#                        6: 1.0, 7: 0.05, 8: 0.15, 9: 0.2, 10: 0.4, 11: 0.85}
# 3. Dynamic tension: normalize RMS to 0–1

tension = (0.4 * chord_tension_curve
         + 0.35 * melodic_tension_curve
         + 0.25 * dynamic_tension_curve)

# Smooth to avoid per-frame noise
from scipy.ndimage import gaussian_filter1d
tension_smooth = gaussian_filter1d(tension, sigma=10)  # ~1s smoothing
```

### Stage 8 — Aggregate (`analysis/aggregate.py`)

**Section comparison:** For each section from Stage 1, slice every time-series (RMS, LUFS,
brightness, tension, density) by its `[start, end]` window and compute `mean`, `max`, `std`.
Also count chord changes within the section boundaries and divide by section length in bars
to get `chord_change_rate`.

**Transposition suggestions:** Given vocal MIDI range `[min_midi, max_midi]`:
- Compute `semitones_to_C = tonic_midi - 60` for reference
- Generate 5 transposition options (−4 to +4 semitones in steps of 2)
- For each: compute new key name, new vocal range in note names
- Flag which options fit common vocal types (soprano, mezzo, tenor, baritone, bass)

**Pitch class histogram formatting:** Apply tonic rotation so the key's root note is
always index 0, making the histogram musically readable regardless of key.

---

## Result Schema (Full)

```json
{
  "job_id": "uuid",
  "file_id": "uuid",
  "duration_sec": 214.3,

  "key": {
    "root": "A",
    "mode_quality": "minor",
    "mode_name": "aeolian",
    "mode_confidence": 0.79,
    "key_confidence": 0.82
  },

  "bpm": 128.0,
  "time_signature": "4/4",

  "beats": [0.33, 0.75, 1.14],
  "downbeats": [0.33, 1.94, 3.53],

  "sections": [
    {"start": 0.0,  "end": 8.1,  "label": "intro"},
    {"start": 8.1,  "end": 36.4, "label": "verse"},
    {"start": 36.4, "end": 64.8, "label": "chorus"}
  ],

  "harmonic": {
    "progression_fingerprint": "i–VI–III–VII",
    "chords": [
      {"start": 0.0, "end": 2.1, "chord": "Am", "roman": "i",   "tension": 0.15},
      {"start": 2.1, "end": 4.0, "chord": "F",  "roman": "VI",  "tension": 0.22}
    ]
  },

  "stems": {
    "vocals": {
      "pitch_range": {"min": "C3", "max": "A5", "median": "G4"},
      "instrument_label": "vocals",
      "instrument_confidence": 0.97,
      "download_url": "https://r2.example.com/stems/abc123_vocals.wav"
    },
    "bass": {
      "pitch_range": {"min": "E1", "max": "G3", "median": "A2"},
      "instrument_label": "bass guitar",
      "instrument_confidence": 0.88,
      "download_url": "https://r2.example.com/stems/abc123_bass.wav"
    },
    "drums": {
      "instrument_label": "drum kit",
      "instrument_confidence": 0.96,
      "download_url": "https://r2.example.com/stems/abc123_drums.wav"
    },
    "other": {
      "pitch_range": {"min": "C3", "max": "E6", "median": "D5"},
      "instrument_label": "piano",
      "instrument_confidence": 0.61,
      "download_url": "https://r2.example.com/stems/abc123_other.wav"
    }
  },

  "pitch_class_histogram": {
    "tonic_relative": true,
    "values": {
      "1 (root)": 0.91, "2": 0.31, "b3": 0.78, "3": 0.05,
      "4": 0.62, "b5": 0.08, "5": 0.74, "b6": 0.12,
      "6": 0.55, "b7": 0.69, "7": 0.11, "b2": 0.04
    },
    "avoid_notes": ["3", "b5", "b2"]
  },

  "dynamics": {
    "rms":              [[0.0, 0.021], [0.1, 0.034]],
    "loudness_lufs":    [[0.0, -18.2], [0.4, -16.1]],
    "brightness":       [[0.0, 2400],  [0.1, 2650]],
    "onset_density":    [[0.0, 0.3],   [0.5, 0.8]],
    "arrangement_density": [[0.0, 1],  [0.5, 3]]
  },

  "tension_curve": [[0.0, 0.18], [0.1, 0.22]],

  "section_comparison": [
    {
      "label": "chorus",
      "instances": 3,
      "avg_loudness_lufs": -10.2,
      "avg_brightness": 3200,
      "avg_tension": 0.62,
      "avg_density": 3.4,
      "chord_change_rate": 0.8,
      "peak_rms": 0.31
    }
  ],

  "transposition": {
    "vocal_range_original": {"min": "C3", "max": "A5", "span_semitones": 33},
    "suggestions": [
      {
        "semitones": -3,
        "new_key": "F# minor",
        "vocal_range": {"min": "A2", "max": "F#5"},
        "fits_voice_types": ["baritone", "mezzo-soprano"]
      },
      {
        "semitones": 2,
        "new_key": "B minor",
        "vocal_range": {"min": "D3", "max": "B5"},
        "fits_voice_types": ["tenor", "soprano"]
      }
    ]
  }
}
```

---

## Environment Variables

```bash
# .env.example

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/musicanalyzer

# Redis
REDIS_URL=redis://localhost:6379/0

# S3 / Cloudflare R2
S3_BUCKET=music-analyzer
S3_ENDPOINT_URL=https://<account>.r2.cloudflarestorage.com
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_REGION=auto

# Analysis
MAX_UPLOAD_SIZE_MB=100
MAX_DURATION_SEC=600
MIN_DURATION_SEC=10
STEMS_TTL_DAYS=7             # auto-delete stems from S3 after N days
KEEP_STEMS=true              # set false to skip stem upload

# CORS (for Next.js frontend)
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

---

## Docker Compose (Local Dev)

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: musicanalyzer
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    ports: ["5432:5432"]
    volumes: ["postgres_data:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

volumes:
  postgres_data:
```

Run the FastAPI app and Celery worker separately:
```bash
uvicorn app.main:app --reload --port 8000
celery -A app.worker.celery_app worker --loglevel=info --concurrency=2
```

---

## Build Order

Build in this sequence to unblock frontend integration early:

1. **Project scaffolding** — directory structure, `config.py`, `database.py`, Docker Compose
2. **Migrations** — Alembic setup, create `files` and `jobs` tables
3. **Storage layer** — `storage.py` S3/R2 client, upload/download/presign helpers
4. **Upload endpoint** — `POST /upload` with FFmpeg validation, file record creation
5. **Job endpoints** — `POST /analyze`, `GET /jobs/{id}` with stubbed progress (returns mock data)
6. **Celery wiring** — `celery_app.py`, `tasks.py` skeleton that updates progress and stores a stub result
   > **At this point the API contract is fully functional. Frontend can integrate.**
7. **Stage 1** — `structure.py` (allin1). Longest stage, validates the GPU setup works.
8. **Stage 2** — `key.py` (key + mode fingerprint)
9. **Stage 3** — `chords.py` (chord detection + Roman numerals)
10. **Stage 4** — `pitch.py` (pitch range + histogram; reuses Stage 2 chroma)
11. **Stage 5** — `instruments.py` (YAMNet classification)
12. **Stage 6** — `dynamics.py` (RMS, LUFS, brightness, density)
13. **Stage 7** — `tension.py` (tension curve; depends on Stages 3, 4, 6)
14. **Stage 8** — `aggregate.py` (section comparison, transposition)
15. **Stem upload** — wire `include_stems` option into task, upload to S3, populate `download_url`
16. **Tests** — unit tests per analysis module with short fixture audio clips
17. **Error handling pass** — wrap each stage in try/except, surface clean errors to job record
18. **Performance pass** — profile with a real song, tune hop sizes and downsample rates

---

## Testing Strategy

- Keep a set of short (30s) fixture WAV files in `tests/fixtures/` covering edge cases:
  - Instrumental (no vocals)
  - Very sparse arrangement (solo piano)
  - Unusual time signature (3/4 waltz)
  - Non-Western scale
- Unit test each `analysis/` module in isolation by mocking its inputs
- Integration test the full pipeline with a single known song and assert key/BPM are within
  acceptable tolerance (key must match, BPM within ±2)
- Test the API layer with `httpx.AsyncClient` + FastAPI's `TestClient`

---

## Known Constraints & Gotchas

- **allin1 + NATTEN install is the hardest part.** Test this first before writing any other code.
  Use `allin1fix` if targeting PyTorch 2.x. Allow 30 minutes for this step.
- **Demucs stems must be reused.** Do not call any separation library twice on the same file.
  Pass stem paths explicitly to Stages 4, 5, and 6.
- **basic-pitch on `other.wav` is noisy.** Filter out notes with onset confidence < 0.5.
  The `other` stem is a catch-all and may contain harmony, pads, and noise simultaneously.
- **Mode detection is unreliable on pop music.** Most pop songs are nominally major or
  (natural) minor; dorian/mixolydian detections are common and often correct for rock/folk.
  Report confidence clearly so the frontend can show uncertainty.
- **Chord detection quality varies by genre.** Works well on pop/rock with clear harmony;
  degrades on EDM, ambient, and heavily distorted tracks. Consider adding a
  `harmonic_clarity` confidence score to the result.
- **LUFS computation is memory-intensive** for long tracks. Process in chunks if the track
  is over 5 minutes.
- **Result JSON size.** For a 4-minute song with 100ms resolution, each time-series is ~2400
  points × 2 floats. With 6 time-series that's ~29KB uncompressed, fine. Enable gzip
  compression on the FastAPI response.
