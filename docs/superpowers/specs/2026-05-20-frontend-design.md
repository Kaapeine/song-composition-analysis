# Music Analyzer — Frontend Design Spec

**Date:** 2026-05-20
**Status:** Approved
**Audience:** Frontend implementer
**Backend base URL (local):** `http://localhost:8000`
**Design reference:** `docs/design_handoff_music_analyzer/` (hi-fi prototype + README)

---

## What We're Building

A Vite + React + TypeScript SPA that lets a user upload an audio file, monitor a 60–120s analysis pipeline, and explore a rich musical breakdown: key, BPM, sections, chord progression, pitch class histogram, instrument classification, dynamics time-series, tension curve, section comparison, and transposition suggestions. Audio playback is a first-class feature — the waveform, transport, and signal lanes all sync to the playing position.

---

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Vite + React + TypeScript | No SSR needed; all content is per-job and client-side. Avoids a Node runtime in production. |
| Styling | CSS custom properties (port `theme.css` verbatim) | The design uses CSS variables heavily; mapping to Tailwind adds friction without benefit. |
| Component library | None | Design is too specific — skeuomorphic tokens, custom shadows, SVG charts. Fighting a library costs more than hand-rolling. |
| State / async | TanStack Query | Natural fit for the polling pattern (`refetchInterval`) and result caching. |
| Charts | Hand-rolled SVG | All shapes are polylines and rects from `[time, value][]` arrays. A chart library adds bundle weight for no benefit. |
| Audio | Single `<audio>` in `AudioProvider` context | All components (waveform, transport, signal lanes) share one source of truth for `currentTime`. |
| Production serving | FastAPI `StaticFiles` mount | `npm run build` → `frontend/dist/` → mounted at `/`. One process, one port. |
| Auth/payments | Stubbed — `get_current_user` already in place | `GET /jobs` returns all jobs now; scoped to user when auth lands. |

---

## Monorepo Layout

```
song_composition_analysis/
├── app/                        # FastAPI backend (existing)
│   ├── analysis/
│   ├── api/
│   └── ...
├── frontend/                   # New — Vite + React app
│   ├── src/
│   │   ├── api/                # Typed fetch wrappers
│   │   │   ├── upload.ts
│   │   │   ├── analyze.ts
│   │   │   ├── jobs.ts
│   │   │   └── results.ts
│   │   ├── components/         # Stateless primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Toggle.tsx
│   │   │   ├── Pill.tsx
│   │   │   ├── ConfidenceDots.tsx
│   │   │   ├── Screen.tsx
│   │   │   ├── Knob.tsx
│   │   │   └── Icon.tsx
│   │   ├── features/
│   │   │   ├── upload/
│   │   │   │   ├── UploadPage.tsx
│   │   │   │   ├── Dropzone.tsx
│   │   │   │   ├── OptionRow.tsx
│   │   │   │   ├── ProgressPanel.tsx
│   │   │   │   └── RecentUploads.tsx
│   │   │   └── results/
│   │   │       ├── ResultsPage.tsx
│   │   │       ├── SubHeader.tsx
│   │   │       ├── HeroSummary.tsx
│   │   │       ├── WaveformCard.tsx
│   │   │       ├── SectionRibbon.tsx
│   │   │       ├── Waveform.tsx
│   │   │       ├── Transport.tsx
│   │   │       ├── SignalsCard.tsx
│   │   │       ├── SignalLane.tsx
│   │   │       ├── ChordLane.tsx
│   │   │       ├── BeatRuler.tsx
│   │   │       ├── PitchClassCard.tsx
│   │   │       ├── InstrumentsCard.tsx
│   │   │       ├── SectionComparison.tsx
│   │   │       └── TranspositionCard.tsx
│   │   ├── hooks/
│   │   │   ├── useAudio.ts
│   │   │   ├── usePollJob.ts
│   │   │   ├── useResults.ts
│   │   │   └── useCrosshair.ts
│   │   ├── types/
│   │   │   └── api.ts
│   │   ├── styles/
│   │   │   ├── theme.css       # Design tokens — accent swap point lives here
│   │   │   └── globals.css
│   │   ├── App.tsx             # Router + AudioProvider
│   │   └── main.tsx
│   ├── public/
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
└── docs/
```

---

## Dev & Production Workflow

**Dev:**
```bash
# Terminal 1
uvicorn app.main:app --reload --port 8000

# Terminal 2
cd frontend && npm run dev   # Vite on :3000, proxies API calls to :8000
```

`vite.config.ts` proxy:
```ts
server: {
  proxy: {
    '/upload':  'http://localhost:8000',
    '/analyze': 'http://localhost:8000',
    '/jobs':    'http://localhost:8000',
    '/results': 'http://localhost:8000',
    '/files':   'http://localhost:8000',
  }
}
```

**Production:**
```bash
cd frontend && npm run build
# FastAPI serves frontend/dist/ at "/"
```

`app/main.py` addition (conditional — backend still starts cleanly before frontend is built):
```python
from pathlib import Path
dist = Path(__file__).parent.parent / "frontend" / "dist"
if dist.exists():
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=str(dist), html=True), name="frontend")
```

---

## Routes

| Route | Component | Description |
|---|---|---|
| `/` | `UploadPage` | Upload form (idle) + progress panel (analyzing) |
| `/results/:jobId` | `ResultsPage` | Full analysis screen with audio playback |

### Upload page states

The upload page manages two states via the `?job` query param:

- **Idle** (no `?job` param): Dropzone + options + recent uploads visible.
- **Analyzing** (`?job=<jobId>` present): Dropzone/options hidden, `ProgressPanel` prominent. Polls `GET /jobs/:jobId` every 2.5s. On `status === 'done'` → `router.replace('/results/:jobId')`. On `status === 'failed'` → error card with stage, message, and "try again" CTA.

The `?job` param means a page refresh during analysis recovers correctly.

---

## TypeScript Types

```ts
// src/types/api.ts

export type TimeSeries = [number, number][]

export type SectionLabel =
  | 'intro' | 'verse' | 'chorus' | 'bridge'
  | 'inst' | 'outro' | 'solo' | 'start' | 'end'

export interface Section {
  start: number
  end: number
  label: SectionLabel
}

export interface Chord {
  start: number
  end: number
  chord: string
  roman: string
  tension: number
}

export interface Stem {
  instrument_label: string
  instrument_confidence: number
  instrument_alternative?: string
  instrument_alternative_confidence?: number
  pitch_range?: { min: string; max: string; median: string }
  download_url?: string
}

export interface Key {
  root: string
  mode_quality: 'major' | 'minor'
  mode_name: string
  mode_confidence: number
  key_confidence: number
}

export interface PitchClassHistogram {
  tonic_relative: boolean
  values: Record<string, number>
  avoid_notes: string[]
}

export interface SectionStat {
  label: string
  instances: number
  avg_loudness_lufs: number
  avg_brightness: number
  avg_tension: number
  avg_density: number
  peak_rms: number
  chord_change_rate: number
}

export interface TranspositionSuggestion {
  semitones: number
  new_key: string
  vocal_range: { min: string; max: string }
  fits_voice_types: string[]
}

export interface TranspositionResult {
  vocal_range_original: { min: string; max: string; span_semitones: number }
  suggestions: TranspositionSuggestion[]
}

export interface AnalysisResult {
  job_id: string
  duration_sec: number
  playback_url: string           // e.g. "/files/{file_id}/audio" — streams the original upload
  key: Key
  bpm: number
  time_signature: string
  beats: number[]
  downbeats: number[]
  sections: Section[]
  harmonic: {
    progression_fingerprint: string
    chords: Chord[]
  }
  stems: Record<string, Stem>
  pitch_class_histogram: PitchClassHistogram
  dynamics: {
    rms: TimeSeries
    loudness_lufs: TimeSeries
    brightness: TimeSeries
    onset_density: TimeSeries
    arrangement_density: TimeSeries
  }
  tension_curve: TimeSeries
  section_comparison: SectionStat[]
  transposition: TranspositionResult | Record<string, never>
}

export interface JobStatus {
  job_id: string
  status: 'queued' | 'processing' | 'done' | 'failed'
  stage: string | null
  progress: number
  created_at: string
  result: AnalysisResult | null
  error: string | null
}

export interface FileResponse {
  file_id: string
  filename: string
  duration_sec: number
  size_bytes: number
}

export interface AnalyzeOptions {
  detect_mode: boolean
  include_stems: boolean
}
```

---

## API Client

Thin typed wrappers in `src/api/`. No library — just `fetch`. All functions throw on non-2xx with the parsed FastAPI error detail.

```ts
export const uploadFile = (file: File): Promise<FileResponse>
export const startAnalysis = (fileId: string, options: AnalyzeOptions): Promise<{ job_id: string; status: string }>
export const getJob = (jobId: string): Promise<JobStatus>
export const getResults = (jobId: string): Promise<AnalysisResult>
export const getRecentJobs = (): Promise<JobStatus[]>
```

---

## TanStack Query Hooks

```ts
// Polls every 2.5s; stops when status is done or failed
usePollJob(jobId: string | null): { job: JobStatus | undefined, isLoading: boolean }

// Single fetch, cached indefinitely (results never change)
useResults(jobId: string): { result: AnalysisResult | undefined, isLoading: boolean }

// Short stale time (30s) for the recent uploads card
useRecentJobs(): { jobs: JobStatus[], isLoading: boolean }
```

---

## Context Providers

### `AudioProvider`

Wraps `ResultsPage`. Holds a single `<audio>` element ref. Loads `result.playback_url` on mount.

```ts
interface AudioContextValue {
  currentTime: number   // updated on timeupdate (~4Hz)
  duration: number
  playing: boolean
  play: () => void
  pause: () => void
  seek: (t: number) => void
}
```

All components that need playback position read from this context — `Waveform`, `Transport`, `SectionRibbon`, `SignalLane`, `BeatRuler`.

### `CrosshairProvider`

Wraps `SignalsCard` only. Shared hover time between all signal lanes:

```ts
interface CrosshairContextValue {
  hoverTime: number | null
  setHoverTime: (t: number | null) => void
  playTime: number   // from AudioContext — crosshair snaps here on mouse-leave
}
```

---

## Accent — Global Swap Point

The accent is defined once in `theme.css`. To change it, update these 4 lines in both the light and dark blocks:

```css
/* theme.css — ACCENT SWAP POINT */
--accent:       #a8541f;   /* copper — change this to switch accent */
--accent-2:     #b96a37;
--accent-soft:  #f1cba8;
--accent-ink:   #6a3210;
```

Dark theme equivalents are in the `[data-theme="dark"]` block immediately below. Every component uses these variables — nothing hardcodes a color value.

---

## Component Specifications

### Upload Screen

**`Dropzone`**
- Dashed border drop area. States: default → hover/drag (accent border + tinted bg) → file selected (filename + size + remove button).
- Validates MIME type client-side before upload (MP3, WAV, FLAC, AIFF).
- On drop or file-picker select: stores `File` object in state.
- Error pill above dropzone on 413/415/422 responses.

**`OptionRow`** (×2)
- `detect_mode` (default ON) and `include_stems` (default OFF).
- Skeuomorphic toggle with brass thumb, 160ms `cubic-bezier(.5,.2,.3,1.4)` overshoot easing.

**`ProgressPanel`**
- Appears when `?job` param is present.
- Tape-deck progress bar: 28px tall, diagonal copper hatch fill, mono `{stage} · {pct}%` overlay text, 240ms ease width transition.
- Stage tiles grid: 10 tiles (one per pipeline stage), each showing stage name + progress threshold. States: done (sage), active (accent-soft), pending (paper-3).
- Explainer: *"The biggest jump is structure → key (10% → 70%). That's the heavy listen — about 60 to 90 seconds."*
- On `status === 'failed'`: replaces tile grid with an error card showing `stage` + `error` message + "try again" CTA (clears `?job` param).

**`RecentUploads`**
- Fetches from `GET /jobs` via `useRecentJobs`.
- Each row: filename + key/BPM/duration | relative timestamp | "open →" ghost button → `/results/:jobId`.

### Results Screen

**`HeroSummary`** — 4-panel strip divided by 1px hairlines:

1. **Key** — root note (68px display) + quality in accent italic + mode name. 5-dot `ConfidenceDots`. Uncertainty pill if `key_confidence < 0.6`. Mode name line hidden if `mode_confidence < 0.5`.
2. **Tempo** — BPM (56px mono) + time signature. Pulsing accent dot with period = `60 / bpm` seconds. Italic "steady" descriptor.
3. **Progression** — Roman numeral fingerprint (30px mono). No prose description.
4. **Duration** — formatted MM:SS + section count + beat count + filename + file size.

**`WaveformCard`**

*`SectionRibbon`* — flex row of buttons, `flex-grow` proportional to section duration. Click → `seek(section.start)`. Active section (contains `currentTime`) highlighted with section color.

*`Waveform`* — auto-sized SVG, 210px tall. Top to bottom:
- Section bands: colored `<rect>` elements spanning full width at section timestamps.
- Mirrored waveform peaks: ~720 bars computed from the `dynamics.rms` series.
- Beat tick row: small vertical lines at each `beats[]` timestamp; downbeats are taller and darker.
- Chord ribbon: roman numeral labels tiled across each chord's `start→end` span.
- Playhead: accent vertical line + dot + flag, redraws on `timeupdate`.
- Click → `seek(clickFraction * duration)`.
- Hover → vertical crosshair + time tooltip.
- Clicking a chord roman numeral sets `selectedChord` — highlights all matching chords in both this ribbon and `ChordLane`.

*`Transport`* — pill-shaped card:
- Prev section | Play/Pause (48px round button, radial gradient) | Next section.
- `Screen` component showing `{currentTime} / {duration}` in mono.
- Italic helper: *"drag the playhead, or click any section to jump"*.
- Prev/next snap to adjacent `sections[i].start`.

*`Annotation`* — display-only placeholder strip. Renders dummy copy. Full annotation UX is a future feature.

**`SignalsCard`** — 6 vertically-stacked lanes sharing a single horizontal time axis. All lanes render section-tinted background bands at 22% opacity.

| Lane | Height | Accent color | Data source | Y range |
|---|---|---|---|---|
| Chord | 38px | — | `harmonic.chords` | — |
| Tension | 84px | Copper (`--accent`) | `tension_curve` | 0–1 |
| Loudness | 84px | Petrol `#1f5563` | `dynamics.loudness_lufs` | −30 to −8 dB |
| Brightness | 84px | Plum `#7a3e6a` | `dynamics.brightness` | 500–5000 Hz |
| Density | 84px | Sage `#3e6433` | `dynamics.arrangement_density` | 0–4, step interpolation |
| Beat ruler | 28px | — | `beats`, `downbeats` | — |

Each lane: left label badge (uppercase mono, colored swatch), right y-range labels, dotted gridlines, italic callout at notable peak. Hover any lane → `setHoverTime(t)` fires; all lanes draw a shared dashed vertical line + value tooltip. On mouse-leave → crosshair returns to `currentTime`.

**`PitchClassCard`**
- Radial wheel: 12 segments, radius ∝ `pitch_class_histogram.values[interval]`. Tonic segment = accent color. Avoid notes = darker fill.
- Hover → tooltip: interval name + percentage + "avoid" badge if in `avoid_notes`.
- Beside wheel: horizontal bars for the 4 most-used degrees.

**`InstrumentsCard`**
- One row per stem: icon | name + pitch range (only if `pitch_range` present) | confidence % | `ConfidenceDots`.
- If `instrument_confidence < 0.6`: amber dots + italic `instrument_alternative` label (from backend).

**`SectionComparison`**
- Table: section chip | ×N instances | loudness | brightness | tension | density.
- Each numeric cell has a mini bar below it scaled to column min/max — gives at-a-glance comparison across section types.

**`TranspositionCard`**
- Hidden entirely if `transposition === {}` (no vocals detected).
- Brass `Knob` (180px) snapping to −4/−2/0/+2/+4 semitones. `Screen` shows `±N semi · NEW KEY`.
- 5-row list: semitones | key name | piano range bar (copper gradient, C2→C6) | voice type pills.
- Selected row matches knob value; gets accent-soft background + accent border.

---

## Interactions Reference

| Surface | Behavior |
|---|---|
| Dropzone | `dragover` → highlight; drop/pick → store `File` |
| Analyze button | `POST /upload` → `POST /analyze` → URL becomes `/?job=jobId` |
| Progress polling | `refetchInterval: 2500`, stops on `done` or `failed` |
| On done | `router.replace('/results/:jobId')` |
| On failed | Error card in ProgressPanel; "try again" clears `?job` param |
| Waveform click | `seek(clickFraction * duration)` |
| Section ribbon click | `seek(section.start)` |
| Transport play/pause | Toggles `audio.paused` |
| Transport prev/next | Snap to adjacent section's `start` |
| Chord cell click | Toggles `selectedChord`; highlights all instances in waveform + chord lane |
| Signal lane hover | All lanes show shared crosshair at `hoverTime` |
| Signal lane leave | Crosshair snaps back to `currentTime` |
| Pitch wheel hover | Tooltip: interval + % + avoid flag |
| Knob click/drag | Snaps to nearest of −4/−2/0/+2/+4 |
| Theme toggle | `data-theme="dark"` on `<html>`; saved to `localStorage` |
| Share link | Copy `/results/:jobId` to clipboard + toast |
| Copy JSON | `clipboard.writeText(JSON.stringify(result, null, 2))` |
| Export PDF | Button reserved, not implemented in PoC |

---

## Error & Empty States

| Condition | Treatment |
|---|---|
| Upload 413 | "File exceeds 100MB" pill above dropzone |
| Upload 415 | "Unsupported format — use MP3, WAV, FLAC, or AIFF" |
| Upload 422 | "Duration must be 10s–10min, or audio unreadable" |
| Job failed | Progress panel shows error card: stage name + error message + "try again" |
| `transposition === {}` | TranspositionCard hidden entirely |
| `key_confidence < 0.6` | Uncertainty pill in hero ("~" prefix + amber dot) |
| `mode_confidence < 0.5` | Mode name line hidden; shows only "major"/"minor" |
| `instrument_confidence < 0.6` | Amber `ConfidenceDots` + italic `instrument_alternative` |
| No `pitch_range` on stem | Pitch range line not rendered |
| Network offline | Yellow pill in app header |

---

## Animations

| Element | Animation |
|---|---|
| Beat pulse dot (hero) | `scale` 1→1.4→1, period = `60/bpm` seconds |
| Progress bar fill | `width` 240ms ease + diagonal copper hatch pattern |
| Toggle thumb | `left` 160ms `cubic-bezier(.5,.2,.3,1.4)` (overshoot) |
| Button press | `translateY(1px)` on `:active` + shadow swap to `--shadow-press` |
| Crosshair | No transition — immediate |
| Card hover | None (intentional — cards are static) |

---

## Backend Changes Required

### 1. `GET /files/{file_id}/audio` — stream uploaded file

New endpoint in `app/api/` that streams the raw uploaded file bytes with the correct `Content-Type`. This is what the frontend `<audio>` element loads.

```python
@router.get("/files/{file_id}/audio")
async def stream_audio(file_id: uuid.UUID, db: AsyncSession = Depends(get_db), storage: StorageBackend = Depends(get_storage)):
    file = await db.get(File, file_id)
    if not file:
        raise HTTPException(status_code=404)
    data = storage.load(file.storage_key)
    suffix = file.storage_key.rsplit(".", 1)[-1].lower()
    media_type = {"mp3": "audio/mpeg", "wav": "audio/wav", "flac": "audio/flac", "aiff": "audio/aiff"}.get(suffix, "audio/mpeg")
    return Response(content=data, media_type=media_type)
```

### 2. `playback_url` field in `AnalysisResult`

The pipeline result includes `playback_url: f"/files/{file_id}/audio"` so the frontend always knows where to load audio without an extra fetch.

### 3. `GET /jobs` — list recent jobs

```python
@router.get("/jobs", response_model=list[JobStatusResponse])
async def list_jobs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).order_by(Job.created_at.desc()).limit(20))
    return result.scalars().all()
```

No auth for PoC — returns all jobs. Will be filtered by `user_id` when auth lands.

### 4. `classify_instruments` — return runner-up

`_classify_other` in `app/analysis/instruments.py` returns both the best and second-best label. Added to the stem dict as `instrument_alternative` and `instrument_alternative_confidence`. Known stems (vocals/drums/bass) omit these fields.

### 5. FastAPI `StaticFiles` mount

```python
# app/main.py — after all routers are registered
from pathlib import Path
dist = Path(__file__).parent.parent / "frontend" / "dist"
if dist.exists():
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=str(dist), html=True), name="frontend")
```

---

## Open Questions (Deferred)

- **Annotations** — visual slot reserved in `WaveformCard`. Data model and persistence undefined.
- **`GET /jobs` auth scoping** — returns all jobs now; filtered by `user_id` when auth lands.
- **Accent palette switcher UI** — token swap point is defined in `theme.css`; no picker in PoC.
- **Density mode (compact)** — `.dense` class supported by the token system; no UI toggle in PoC.
