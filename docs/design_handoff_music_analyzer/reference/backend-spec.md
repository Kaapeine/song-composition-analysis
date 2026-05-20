# Music Analyzer — Frontend Spec

**Date:** 2026-05-19  
**Status:** Draft  
**Audience:** Next.js frontend developer  
**Backend base URL (local):** `http://localhost:8000`

---

## What the App Does

A user uploads an audio file (MP3, WAV, FLAC, or AIFF). The backend runs a multi-stage analysis pipeline and returns a detailed musical breakdown:

- **Key and mode** — e.g. "A minor (aeolian), confidence 0.82"
- **BPM, beats, and song sections** — verse, chorus, bridge with timestamps
- **Chord progression** — time-stamped chord sequence with Roman numeral labels and tension scores
- **Pitch ranges per stem** — how high and low vocals/guitar/etc. go
- **Pitch class histogram** — which scale degrees are most used (great for visualizing key feel)
- **Instrument classification** — what's in the mix, per stem
- **Dynamics** — loudness, brightness, and onset density over time (all time-series)
- **Tension curve** — a smooth 0–1 curve showing how tense the music feels moment-to-moment
- **Section comparison** — averaged stats per section type (verse vs chorus vs bridge)
- **Transposition suggestions** — if you shifted the key ±4 semitones, what voice types could sing it?

Analysis takes **60–120 seconds** for a typical 3–4 minute song. The frontend polls for job status.

---

## Flow

```
1. User picks a file
2. POST /upload  →  get file_id
3. POST /analyze  →  get job_id
4. Poll GET /jobs/{job_id} every 2–3s until status == "done" or "failed"
5. GET /results/{job_id}  →  render the full analysis
```

---

## API Reference

### `POST /upload`

Upload an audio file. Returns a file ID to use in the next step.

**Request:** `multipart/form-data`

| Field | Type | Notes |
|-------|------|-------|
| `file` | File | Audio file (MP3, WAV, FLAC, AIFF) |

**Response `200 OK`:**
```json
{
  "file_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "filename": "my-song.mp3",
  "duration_sec": 214.5,
  "size_bytes": 8431200
}
```

**Error codes:**

| Code | Meaning |
|------|---------|
| `413` | File exceeds 100MB |
| `415` | Unsupported format |
| `422` | Duration out of range (< 10s or > 600s), or unreadable audio |

---

### `POST /analyze`

Start the analysis pipeline for an uploaded file.

**Request body (JSON):**
```json
{
  "file_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "options": {
    "detect_mode": true,
    "include_stems": false
  }
}
```

| Option | Default | Notes |
|--------|---------|-------|
| `detect_mode` | `true` | Include mode/scale detection (ionian, dorian, etc.) |
| `include_stems` | `false` | Upload separated stems (vocals, drums, bass, other) and include download URLs in result |

**Response `202 Accepted`:**
```json
{
  "job_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "status": "queued"
}
```

**Error codes:**

| Code | Meaning |
|------|---------|
| `404` | `file_id` not found |

---

### `GET /jobs/{job_id}`

Poll this endpoint while the job runs. Returns current status, stage name, and progress percentage.

**Response `200 OK` (while running):**
```json
{
  "job_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "status": "processing",
  "stage": "Analyzing structure",
  "progress": 10,
  "created_at": "2026-05-19T14:23:01.000Z",
  "result": null,
  "error": null
}
```

**Response `200 OK` (when done):**
```json
{
  "job_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "status": "done",
  "stage": "Done",
  "progress": 100,
  "created_at": "2026-05-19T14:23:01.000Z",
  "result": { ... },
  "error": null
}
```

**Response `200 OK` (on failure):**
```json
{
  "job_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "status": "failed",
  "stage": "key",
  "progress": 70,
  "created_at": "2026-05-19T14:23:01.000Z",
  "result": null,
  "error": "librosa failed to load audio: [Errno 2] No such file"
}
```

**Status values:**

| Status | Meaning |
|--------|---------|
| `queued` | Job created, pipeline hasn't started yet |
| `processing` | Pipeline is running |
| `done` | All stages complete, result is ready |
| `failed` | A stage threw an error, `error` field explains which and why |

**Stage names (in order):**

| Stage | Progress | Description |
|-------|----------|-------------|
| `Preprocessing` | 0% | Converting to WAV, validating |
| `Analyzing structure` | 10% | BPM, beats, sections (~60–90s) |
| `Detecting key` | 70% | Key and mode fingerprint |
| `Detecting chords` | 74% | Chord sequence and Roman numerals |
| `Analyzing pitch ranges` | 78% | Pitch ranges per stem |
| `Classifying instruments` | 83% | Instrument labels per stem |
| `Computing dynamics` | 87% | Loudness, brightness, density curves |
| `Computing tension` | 91% | Tension curve |
| `Aggregating sections` | 94% | Section comparison, transposition |
| `Uploading stems` | 97% | Only when `include_stems=true` |
| `Done` | 100% | Complete |

> **Polling tip:** Check every 2–3 seconds. The jump from 10% to 70% (structure stage) takes the longest — expect 60–90 seconds there.

---

### `GET /results/{job_id}`

Returns the full analysis result JSON. Returns `404` if the job is not yet done.

**Response `200 OK`:** See full result shape below.

---

## Full Analysis Result

This is the JSON returned in `GET /results/{job_id}` and also in the `result` field of `GET /jobs/{job_id}` when status is `"done"`.

```json
{
  "job_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "duration_sec": 214.5,

  "key": {
    "root": "A",
    "mode_quality": "minor",
    "mode_name": "aeolian",
    "mode_confidence": 0.74,
    "key_confidence": 0.81
  },

  "bpm": 120.4,
  "time_signature": "4/4",

  "beats": [0.25, 0.75, 1.25, 1.75, ...],
  "downbeats": [0.25, 2.25, 4.25, ...],

  "sections": [
    { "start": 0.0, "end": 14.2, "label": "intro" },
    { "start": 14.2, "end": 44.8, "label": "verse" },
    { "start": 44.8, "end": 75.3, "label": "chorus" },
    { "start": 75.3, "end": 105.9, "label": "verse" },
    { "start": 105.9, "end": 136.4, "label": "chorus" },
    { "start": 136.4, "end": 150.1, "label": "bridge" },
    { "start": 150.1, "end": 180.6, "label": "chorus" },
    { "start": 180.6, "end": 214.5, "label": "outro" }
  ],

  "harmonic": {
    "progression_fingerprint": "I–V–vi–IV",
    "chords": [
      { "start": 0.0, "end": 2.1, "chord": "A:min", "roman": "i", "tension": 0.22 },
      { "start": 2.1, "end": 4.2, "chord": "E:maj", "roman": "V", "tension": 0.24 },
      { "start": 4.2, "end": 6.3, "chord": "F:maj", "roman": "VI", "tension": 0.13 },
      { "start": 6.3, "end": 8.4, "chord": "C:maj", "roman": "III", "tension": 0.11 }
    ]
  },

  "stems": {
    "vocals": {
      "instrument_label": "vocals",
      "instrument_confidence": 0.98,
      "pitch_range": {
        "min": "A3",
        "max": "E5",
        "median": "D4"
      },
      "download_url": "file:///path/to/data/stems/job_id/vocals.wav"
    },
    "drums": {
      "instrument_label": "drum kit",
      "instrument_confidence": 0.97
    },
    "bass": {
      "instrument_label": "bass guitar",
      "instrument_confidence": 0.92
    },
    "other": {
      "instrument_label": "electric guitar",
      "instrument_confidence": 0.55
    }
  },

  "pitch_class_histogram": {
    "tonic_relative": true,
    "values": {
      "1 (root)": 1.0,
      "b2": 0.05,
      "2": 0.42,
      "b3": 0.71,
      "3": 0.08,
      "4": 0.38,
      "b5": 0.03,
      "5": 0.65,
      "b6": 0.52,
      "6": 0.11,
      "b7": 0.44,
      "7": 0.06
    },
    "avoid_notes": ["b2", "b5", "7"]
  },

  "dynamics": {
    "rms": [
      [0.0, 0.0312],
      [0.1, 0.0428],
      [0.2, 0.0519],
      ...
    ],
    "loudness_lufs": [
      [0.0, -24.1],
      [0.1, -22.8],
      ...
    ],
    "brightness": [
      [0.0, 1823.4],
      [0.1, 2041.2],
      ...
    ],
    "onset_density": [
      [0.0, 0.42],
      [0.1, 0.61],
      ...
    ],
    "arrangement_density": [
      [0.0, 1.0],
      [0.1, 2.0],
      [0.2, 3.0],
      ...
    ]
  },

  "tension_curve": [
    [0.0, 0.21],
    [0.1, 0.24],
    [0.2, 0.29],
    ...
  ],

  "section_comparison": [
    {
      "label": "verse",
      "instances": 2,
      "avg_loudness_lufs": -18.4,
      "avg_brightness": 2103.5,
      "avg_tension": 0.31,
      "avg_density": 2.4,
      "peak_rms": 0.071,
      "chord_change_rate": 1.2
    },
    {
      "label": "chorus",
      "instances": 3,
      "avg_loudness_lufs": -14.2,
      "avg_brightness": 2841.0,
      "avg_tension": 0.52,
      "avg_density": 3.8,
      "peak_rms": 0.124,
      "chord_change_rate": 2.1
    }
  ],

  "transposition": {
    "vocal_range_original": {
      "min": "A3",
      "max": "E5",
      "span_semitones": 19
    },
    "suggestions": [
      {
        "semitones": -4,
        "new_key": "F# minor",
        "vocal_range": { "min": "F#3", "max": "C#5" },
        "fits_voice_types": ["baritone", "tenor"]
      },
      {
        "semitones": -2,
        "new_key": "G minor",
        "vocal_range": { "min": "G3", "max": "D5" },
        "fits_voice_types": ["tenor", "mezzo-soprano"]
      },
      {
        "semitones": 0,
        "new_key": "A minor",
        "vocal_range": { "min": "A3", "max": "E5" },
        "fits_voice_types": ["tenor", "mezzo-soprano"]
      },
      {
        "semitones": 2,
        "new_key": "B minor",
        "vocal_range": { "min": "B3", "max": "F#5" },
        "fits_voice_types": ["mezzo-soprano", "soprano"]
      },
      {
        "semitones": 4,
        "new_key": "C# minor",
        "vocal_range": { "min": "C#4", "max": "G#5" },
        "fits_voice_types": ["soprano"]
      }
    ]
  }
}
```

---

## Field Reference

### `key`

| Field | Type | Notes |
|-------|------|-------|
| `root` | string | Note name: `C`, `C#`, `D`, `D#`, `E`, `F`, `F#`, `G`, `G#`, `A`, `A#`, `B` |
| `mode_quality` | string | `"major"` or `"minor"` |
| `mode_name` | string | Church mode: `ionian`, `dorian`, `phrygian`, `lydian`, `mixolydian`, `aeolian`, `locrian` |
| `mode_confidence` | float 0–1 | How confident the model is in the mode; show uncertainty below ~0.5 |
| `key_confidence` | float 0–1 | Pearson correlation of chroma vs K-S template; show uncertainty below ~0.6 |

### `sections[].label`

Normalized labels: `intro`, `verse`, `chorus`, `bridge`, `inst` (instrumental), `outro`.

### `harmonic.chords[].roman`

Roman numeral relative to the detected key. Examples: `i`, `V`, `VI`, `III`, `iv`, `bVII`.

### `harmonic.chords[].tension`

Float 0–1. Combines chord quality (major=low, diminished=high) with distance from tonic.

### `dynamics` time series format

All dynamics fields (`rms`, `loudness_lufs`, `brightness`, `onset_density`, `arrangement_density`) are arrays of `[time_sec, value]` pairs at ~100ms resolution.

| Field | Unit | Typical range |
|-------|------|--------------|
| `rms` | linear amplitude | 0.0 – 0.2+ |
| `loudness_lufs` | LUFS | −30 to −8 |
| `brightness` | Hz (spectral centroid) | 500 – 5000 |
| `onset_density` | normalized strength | 0.0 – 1.0+ |
| `arrangement_density` | active stem count | 0 – 4 |

### `tension_curve`

Array of `[time_sec, tension]` pairs. Same time resolution as dynamics (~100ms). Values 0–1. Gaussian-smoothed.

### `pitch_class_histogram`

- `tonic_relative: true` means index 0 = tonic (root), not C. Use interval names as labels.
- `avoid_notes`: intervals with < 15% relative weight — notes that clash with the key.

### `section_comparison`

One entry per unique section label. `instances` is how many times that section appears in the song. Stats are averaged across all instances.

### `transposition.suggestions`

Always 5 entries: `−4`, `−2`, `0`, `+2`, `+4` semitones. `semitones: 0` is the original key. `fits_voice_types` is empty if no standard voice range fits.

Voice type MIDI ranges used:

| Type | Range |
|------|-------|
| bass | E2–G4 |
| baritone | A2–C5 |
| tenor | C3–E5 |
| mezzo-soprano | G3–G5 |
| soprano | C4–C6 |

---

## CORS

The backend allows `http://localhost:3000` by default (`ALLOWED_ORIGINS` env var). All methods and headers are permitted.

---

## Notes for the UI

- **Progress bar:** Use `progress` (0–100) and `stage` from `GET /jobs/{job_id}`. The biggest gap is 10%→70% (structure analysis) — consider showing the stage name so users know it's not frozen.
- **Confidence indicators:** Show `key_confidence` and `mode_confidence` visually. Values below 0.6 mean the model is uncertain — consider showing "~" or a warning.
- **Time-series charts:** All dynamics fields and `tension_curve` share the same `[time, value]` format. They align on the time axis and can be overlaid.
- **Sections overlay:** `sections` timestamps can be overlaid as regions on any time-series chart.
- **`download_url` for stems:** Only present if `include_stems: true` was passed to `/analyze`. In PoC these are `file://` paths (local only). In production they'll be S3 presigned URLs.
- **Empty transposition:** If no vocals were detected, `transposition` is `{}`. Render nothing, don't crash.
- **Chord chart:** The `harmonic.chords` array covers the full song duration. Each chord has `start`/`end` timestamps so you can render a timeline.
