# Handoff: Music Composition Analyzer (POC frontend)

> **What this is.** A high-fidelity HTML/JSX design prototype for the Music Analyzer POC frontend. Two screens: **Upload** and **Analysis** (main results screen, "Design F"). It is the visual + behavioral source of truth for the production Next.js app.

> **What this is *not*.** Production code. The HTML is rendered via inline Babel/JSX for fast iteration. The target codebase (Next.js 14+, App Router) should reimplement these components in its own established patterns.

---

## About the design files

The files in `Music Analyzer.html` and `hi-fi/*.jsx` are **design references**:

- Inline Babel JSX (no build step) — illustrative, not architectural.
- Mock data lives in `hi-fi/data.jsx` — used to drive the UI; **replace with real API calls** in the production app.
- No state management library — `useState` only, with a small custom `useTweaks` for design-tool persistence (not needed in prod).
- No real audio playback — the playhead "ticks" via `setInterval`. The real app should drive it from a `<audio>` element's `timeupdate` event.

The task is to **recreate this design in the production Next.js codebase**, using its existing libraries and patterns, with the API contracts described in `reference/backend-spec.md` (already included).

---

## Fidelity

**High-fidelity.** Final colors, typography, spacing, interactions, and copy. Recreate pixel-close. Match the warm-paper / refined-skeuomorphic aesthetic — the cassette/synth/sheet-music vibe is intentional.

---

## Tech recommendations

The frontend spec already targets **Next.js** with backend at `http://localhost:8000`. Suggestions for the implementation:

- **Framework:** Next.js 14+ App Router (per spec).
- **Styling:** Either Tailwind (with the token table below mapped to `theme.extend`), or CSS Modules + a `tokens.css` file (closer to the prototype's structure). The prototype uses CSS custom properties heavily — that maps cleanly to either.
- **State / data:**
  - **TanStack Query (React Query)** is the right primitive for the polling pattern (`useQuery` with a `refetchInterval` of 2500ms that returns `0` when status becomes `done`/`failed`).
  - Form state: `useState` is enough for the upload screen. No form lib needed for two toggles.
  - Global app state: none required. URL params + Query cache cover everything.
- **Routes:**
  - `/` — Upload screen
  - `/jobs/[jobId]` — In-progress / analyzing view (re-uses the `<ProgressPanel>` component, polls `GET /jobs/{job_id}`)
  - `/results/[jobId]` — Main analysis screen
- **Audio playback:** A single `<audio>` element kept in a top-level context provider; the waveform, signal lanes, and transport all read `currentTime` and call `seek()`. Don't re-implement playback in each component.
- **SVG charts:** Everything in this design is hand-rolled SVG (no chart library). The shapes are simple enough that adding Recharts/D3/Visx would be overkill — port the SVG generation directly.
- **Future hooks (auth/payments):** Header has a top-right slot already reserved (the `?` avatar button). Per-option metadata strings like "+ 0.4 credits" are placeholders for the billing surface.

---

## Screens

### 1. Upload screen

**Route:** `/`
**Purpose:** Drop an audio file, configure two analysis options, kick off the job. Shows recent uploads and (while running) inline progress.

#### Layout

- Centered column, **max-width 1080px**, padding `32px 28px 80px`.
- Top: page heading (large display) + supporting line + a `step 1 of 2 — upload` pill.
- Body: **2-column grid `1.45fr 1fr`, gap `24px`**:
  - **Left:** dropzone card, then options card.
  - **Right:** "What you'll get" card, then "Recent uploads" card.
- Progress panel appears below the two columns **only while a job is running**.
- Footer row: cancel + `analyze →` primary CTA on the right; status text on the left.

#### Components

**`PageHeading`**
- Display heading, 64px, Bricolage Grotesque, weight 500, line-height 1.0, letter-spacing -0.02em.
- Copy: "Drop a track, *read its score.*" The italic accent is the accent color.
- Subtitle: italic Geist, 18px, ink-3 color. Copy: "We listen end-to-end and give you back the key, mode, BPM, chord progression, sections, tension curve, and a clean transposition map — usually in under two minutes."

**`Dropzone`**
- Wrapped in a `<Card>` (paper card with embossed shadow).
- Inner dashed-border area (margin 14px from card edges), 8px radius, padding `54px 32px`.
- Default state: round upload icon (80px circle) + "Drop audio here" + "…or *browse files*" + small monospace constraints line `MP3 · WAV · FLAC · AIFF / 10s – 10min / ≤ 100MB`.
- Hover/drag state: border color shifts to `--accent`, background to `color-mix(in oklab, var(--accent) 8%, var(--paper-3))`.
- Click → opens hidden `<input type=file>`.
- File dropped → preview state: 56px square thumb (music-note icon, accent color) + filename + `MB · ready` mono line + a `remove` ghost button.
- **Validation:** mirror the backend's 415/422/413 — show a `--warn` colored error pill above the dropzone with the human-readable cause.

**`OptionRow`** (two of them in the options card)
- Grid `auto 1fr auto`, gap 14px.
- Left: skeuomorphic Toggle component (44×24, brass thumb on accent gradient when on).
- Middle: label (15px medium) + italic explanation (13.5px Geist italic, ink-3).
- Right (optional): small mono "meta" string (e.g. "+ 0.4 credits") for future billing context.
- Defaults: `detect_mode` ON, `include_stems` OFF.

**`OutputPreview`** ("What you'll get" card)
- Card title "What you'll get".
- 2-column grid of label/value pairs (the labels are mono small-caps, the values are italic Geist).
- 8 example items: Key/BPM/Sections/Chord roadmap/Tension curve/LUFS-brightness/Pitch wheel/Vocal range.

**`RecentUploads`**
- Card title "Recent uploads", right-side mono "N jobs" count.
- List of rows: filename (mono) + key/BPM/duration (smaller) | "when" timestamp | ghost "open →" button.
- Dashed hairline between rows.
- Backed by a real history endpoint when one exists; for now, local list of recent `job_id`s (e.g., from `localStorage`).

**`ProgressPanel`** (mid-job)
- Card title "Analyzing…" with italic descriptor showing current stage's human label.
- Right-side `<Screen>` (tape-deck inset LCD): mono text `{pct}% · {STAGE_NAME}`.
- **Tape-deck progress bar:** 28px tall, dark inset shadow, diagonal copper hatch fill, white-mono `{stage} · {pct}%` overlay text.
- **Stage tiles grid:** 10 columns, each tile shows stage name + percentage threshold + state (done/active/pending). Colors: done = section-inst (soft sage), active = accent-soft, pending = paper-3.
- Italic explainer line at the bottom: "The biggest jump is structure → key (10% → 70%). That's the heavy listen — about 60 to 90 seconds for a typical 3-minute song."

**`ActionFooter`**
- Justified row. Left: italic status text. Right: `cancel` ghost + `analyze →` primary button.
- Disable `analyze →` until a valid file is in state.

#### Behavior

- Drag-over toggles `dragging` state for color shift.
- Drop → set file state (just name+size for now; production reads the actual `File` object).
- Click "analyze →" → `POST /upload` → on 200, `POST /analyze` with `{ file_id, options: { detect_mode, include_stems } }` → on 202, navigate to `/jobs/[job_id]`.
- Error handling: 413 = "file too big (max 100 MB)", 415 = "unsupported format", 422 = "duration must be 10s–10min, or audio unreadable". Surface inline above the dropzone.
- Cancel during upload → abort the fetch.

---

### 2. Analysis screen (Design F)

**Route:** `/results/[jobId]`
**Purpose:** Full analysis breakdown. The user listens to the track while inspecting key, structure, harmony, dynamics, and transposition options.

#### Layout

- Max-width 1400px, padding `24px 28px 80px`, vertical gap `20px` between sections.
- Vertical stack of cards:
  1. **Sub-header row** — back link + filename heading + action buttons (share, PDF, copy JSON).
  2. **Hero summary** — 4-column metric strip.
  3. **Waveform card** — section ribbon → waveform → transport → annotation strip.
  4. **Signals card** — 5 time-locked lanes (chords, tension, loudness, brightness, density) + beat ruler.
  5. **Detail row** — 3-column grid: Pitch class | Instruments | Section comparison.
  6. **Transposition** — full-width card with brass knob.
  7. **Footer note**.

#### Components

**`SubHeader`**
- Flex row, baseline aligned.
- Left: `← all analyses` ghost button (mono), then filename in 32px display, then italic "analyzed just now" timestamp.
- Right: three ghost buttons — `Share link`, `Export PDF`, `Copy JSON`.

**`HeroSummary`** (4 panels in a `paper-card`, divided by 1px hairlines)
- Each panel: `padding 24px 26px`, eyebrow label, big primary value, italic explainer.
- **Panel 1 — Key + mode:** big "A" (68px display) + italic "minor" in accent (36px) + italic descriptor "aeolian mode · confidence 81%" + 5-dot confidence indicator + uncertainty pill if confidence < 0.6.
- **Panel 2 — Tempo:** large mono "120" + italic "bpm" + descriptor "4/4 time · andante" + a pulsing accent dot beating at the actual BPM + italic "steady · σ ±0.4 BPM".
- **Panel 3 — Progression fingerprint:** roman numerals in mono 30px, arrow glyphs between them, accent-colored highlight on one of the chords. Below: italic "classic minor — descending bass over A→E→F→C". The descriptor is a heuristic-generated phrase based on the fingerprint; the spec doesn't define it — backend should add a `progression_description` field or this should be a frontend lookup table for common fingerprints. **Open question for product.**
- **Panel 4 — Duration + file:** big display "3:34" + italic "8 sections · 257 beats" + small mono filename + file meta line.

**`SectionRibbon`** (jump-target strip above the waveform)
- Flex row of buttons; each button's `flex-grow` is proportional to its section's duration.
- Button shows uppercase section label + mono `start–end` timestamps.
- Active section (current playhead) uses the section's accent fill + ink color.
- Click → `seek(section.start)`.

**`Waveform`** (`hi-fi/waveform.jsx`)
- Auto-sized SVG, 210px tall.
- Bands top-to-bottom: section labels (22px) → mirrored waveform peaks (uses ~720 precomputed peaks from `/results`) → beat tick row (14px, downbeats darker) → chord ribbon (26px, roman numerals).
- Section bands are filled in the section's accent and slightly tinted across the full waveform region.
- Chord cells: 2 chord cycles per visible "cell"; click toggles `selectedChord` (highlights all instances of that roman numeral across the waveform and the chord lane in the signals card).
- Hover anywhere shows a vertical crosshair + time tooltip.
- Click sets the audio time. Playhead (accent vertical line + accent dot at mid + accent flag at top) renders at the current playback time.

**`Transport`** (tape-deck style)
- Pill-shaped paper card.
- Left to right: `prev section` icon button, big round play/pause button (48px, radial gradient on accent), `next section` icon button, vertical divider, `<Screen>` displaying mono `{currentTime} / {duration}`, flex spacer, italic helper text "drag the playhead, or click any section to jump".
- Real implementation: drives an `<audio>` element. `prev`/`next` jump to adjacent sections (snap to `sections[i].start`).

**`Annotation`** (POC stub — full annotation flow is out of scope here)
- Pill-style strip below transport: section chip + italic note body + mono author.
- Full annotation UX (selection → comment → pin) is a future feature; this strip is the visual treatment for displaying one.

**`Signals` card** (`hi-fi/signals.jsx`)
- A vertically-stacked group of 6 lanes sharing a single horizontal time axis:
  - **Chord lane** (38px): same roman-numeral ribbon as the waveform, syncs `selectedChord`.
  - **Tension** (84px) — accent color, range 0–1, callout at peak.
  - **Loudness LUFS** (84px) — petrol blue color, range -30 to -8 dB.
  - **Brightness** (84px) — plum color, range 1000–3500 Hz.
  - **Density** (84px) — sage color, range 0–4 stems, step interpolation (the data is discrete stem counts).
  - **Beat ruler** (28px) — small downbeats + 15-second time markers.
- **Crosshair sync:** hovering ANY lane sets a shared `hoverTime` in context; all lanes show a vertical dashed line + the data point + a tooltip at that time. On leave, crosshair returns to the playhead's position.
- Each lane has: section-tinted background bands (22% opacity), a left-side label badge (uppercase mono small-caps with colored swatch), right-side y-range labels, dotted gridlines at ticks, and italic callouts marking notable peaks.
- Backed by `dynamics.{rms,loudness_lufs,brightness,onset_density,arrangement_density}` and `tension_curve` from `/results`. The arrays are `[time_sec, value]` pairs at ~100ms grid — render directly as polylines.

**`PitchClassCard`** (`hi-fi/wheel.jsx`)
- Card title "Pitch class" + italic "— tonic-relative".
- 2-column grid: explanatory paragraph + small horizontal bars for the 4 most-used degrees | radial wheel chart.
- **Wheel:** 12 segments, radius proportional to `pitch_class_histogram.values[interval]`. Tonic (`1`) is accent-colored, avoid notes are darker/struck-through. Center label: italic "tonic" + accent letter (A).
- Hover any segment → tooltip showing interval name + percentage + "avoid" flag if applicable.
- Data: `pitch_class_histogram.values` (12 intervals, tonic-relative) + `avoid_notes` array.

**`InstrumentsCard`** (`hi-fi/cards.jsx`)
- Card title "Instruments" + `{N} stems` pill.
- One row per stem: 20px glyph (custom vocals/drums/bass/other icons) | name + pitch range (only if `range` present) | confidence % (mono, warn color if < 0.6) | 5-dot confidence indicator.
- If `instrument_confidence < 0.6`, append italic "could also be synth" (use a sensible alternative label from a small frontend table, or have the backend send `instrument_alternative` — currently the spec doesn't include this. **Open question.**)

**`SectionComparison`** (`hi-fi/cards.jsx`)
- Card title "Section comparison" + italic "— averages across all instances".
- Table: section chip | instance count (×N) | loudness | brightness | tension | density.
- Each numeric cell has a tiny bar below it scaled by the column's min/max across rows — gives at-a-glance comparison.
- Data: `section_comparison` array from `/results`.

**`TranspositionCard`** (`hi-fi/cards.jsx`)
- Card title "Transposition" + italic "— shift the key, see who could sing it" + pill showing original vocal range.
- 2-column grid: brass knob (180px) + Screen showing `{±N} semi · {NEW KEY}` | stacked list of 5 transposition options.
- **`Knob` component:** click any tick to snap; drag to scrub. -4 / -2 / 0 / +2 / +4 semitones (the spec always returns 5 entries). Pointer is rendered with an accent-colored bulb at the tip.
- Each row in the list: semitone mono | new key in display type | a piano-style range bar showing min→max as a copper gradient between C2 and C6 | small voice-type pills (bass/baritone/tenor/mezzo/soprano) with their own swatches.
- Selected row matches the knob value, gets an accent-soft background + accent border.
- **Empty case:** if `transposition === {}` (no vocals detected), render nothing — collapse the card.

---

## App shell

**`AppHeader`** (sticky, blurred-paper background)
- Left: 38px square logo box (cassette icon, accent-colored) + wordmark "Cassette·Reader" in display type + uppercase mono subtitle "music composition analyzer".
- Center: small segmented Upload / Analysis switcher (paper-2 background, paper-3 thumb).
- Right: sun-toggle-moon hardware switch (the toggle component flipped between two icons), then a placeholder 38px dashed `?` avatar slot. **This is the slot for future auth (sign-in button → user avatar → menu).**

**Theme:** light / dark via `data-theme` attribute on `<html>`. All colors are CSS custom properties so swapping is instant.

---

## Interactions & behavior

| Surface | Behavior |
|---|---|
| Dropzone | `dragover` → highlight; `drop` → store File; clicking the zone opens file picker |
| Analyze button | `POST /upload` → `POST /analyze` → navigate to `/jobs/[job_id]` |
| Progress | `useQuery({ refetchInterval: 2500 })` against `GET /jobs/{job_id}`; stop when status ∈ {done, failed}; on done → `router.replace('/results/[jobId]')` |
| Waveform | Click anywhere → `audio.currentTime = clickFraction * duration`; hover anywhere → shared `hoverTime` via context |
| Section ribbon | Click → `audio.currentTime = section.start` |
| Transport play | Toggles `audio.paused` |
| Transport prev/next | Snap to adjacent section's start time |
| Chord cells | Click → toggles `selectedChord` (highlights all instances in both the waveform chord lane and the signals chord lane) |
| Signals lanes | Hover ANY lane → all lanes show a shared crosshair at that time + tooltip with value |
| Pitch wheel | Hover segment → tooltip with interval name + percentage + avoid flag |
| Knob | Click any tick → snap; mousedown + drag in circle → continuous-snapped value |
| Theme switch | Toggle `data-theme="dark"` on `<html>` |
| Share link button | Copy public read-only URL `/results/{jobId}` to clipboard with a toast |
| Export PDF | Triggers a print-friendly route or PDF generation (out of scope here; reserve the button) |
| Copy JSON | `navigator.clipboard.writeText(JSON.stringify(result, null, 2))` |

### Animations / transitions

- **Beat pulse** (hero summary): `@keyframes hifi-pulse` 0/50/100 scale 1 → 1.4 → 1, period = `60 / bpm` seconds.
- **Tape-deck progress fill:** 240ms ease width transitions, plus a diagonal hatch pattern (45deg copper repeating stripes).
- **Toggle thumb:** `left` transitions 160ms cubic-bezier(.5,.2,.3,1.4) — overshoot easing gives it a tactile feel.
- **Button press:** `translateY(1px)` on `:active`, swap `--shadow-emboss` for `--shadow-press`.
- **Hover crosshair:** no transition; immediate.
- **Card hover:** none (intentional — cards are static).

### Loading states

- Buttons during async actions: disable + replace label with mono `…working` (small loop animation optional).
- The Hero summary, signals, etc. on the analysis page should each render skeletons (paper-2 rectangles) while `/results` is in flight. The progress screen handles the long pre-result wait, so the result page's own skeletons should only be visible for ~100ms.

### Error states

| Error | Where | Treatment |
|---|---|---|
| Upload 413/415/422 | Above dropzone | Warn-colored pill, italic explainer message |
| Analyze 404 | Toast or inline | "Couldn't find that upload — try again" |
| Job `status: 'failed'` | Replaces ProgressPanel content | Section card with warn accent, shows `stage` and `error` from the response, "try again" CTA back to `/` |
| Network offline | Top banner | Subtle yellow pill in the header |

### Empty states

- No vocals → `transposition` is `{}` → hide the entire Transposition card.
- Confidence below 0.6 → show "uncertain" warn pill in the hero key panel.
- Mode confidence < 0.5 → hide the "mode_name mode" line in the hero (show just "minor"/"major" without the church mode).
- No `range` on a stem → don't render the pitch range mono line.

---

## State management

Recommended shape (per route):

### `/` (upload)
```ts
const [file, setFile] = useState<File | null>(null)
const [detectMode, setDetectMode] = useState(true)
const [includeStems, setIncludeStems] = useState(false)
const [error, setError] = useState<string | null>(null)
// Submit handler kicks off POST /upload + POST /analyze, then router.push(`/jobs/${jobId}`)
```

### `/jobs/[jobId]`
```ts
const { data: job } = useQuery({
  queryKey: ['job', jobId],
  queryFn: () => fetch(`/jobs/${jobId}`).then(r => r.json()),
  refetchInterval: (q) =>
    q.state.data?.status === 'done' || q.state.data?.status === 'failed' ? false : 2500,
})
// when done -> router.replace(`/results/${jobId}`)
```

### `/results/[jobId]`
```ts
const { data: result } = useQuery({
  queryKey: ['result', jobId],
  queryFn: () => fetch(`/results/${jobId}`).then(r => r.json()),
})
const [playT, setPlayT] = useState(0)
const [playing, setPlaying] = useState(false)
const [selectedChord, setSelectedChord] = useState<string | null>(null)
const [hoverT, setHoverT] = useState<number | null>(null) // shared via React context for signal lanes
const [semitones, setSemitones] = useState(0)
```

The `hoverT` shared crosshair is the only piece that wants a React Context — `<CrosshairProvider value={{ t: hoverT, setT: setHoverT, playT }}>` wrapping the waveform + signals cards.

---

## Design tokens

All values are CSS custom properties on `:root` in `hi-fi/theme.css`. Use these verbatim in the production stylesheet.

### Color — light theme (default)

| Token | Value | Use |
|---|---|---|
| `--paper` | `#f1e7d0` | Page background |
| `--paper-2` | `#f7eed9` | Card body, low contrast surface |
| `--paper-3` | `#fbf4e2` | Card top, raised surface, dropzone bg |
| `--paper-edge` | `#e6d9b8` | Inset borders for screens |
| `--ink` | `#1d1812` | Primary text |
| `--ink-2` | `#4b4338` | Secondary text |
| `--ink-3` | `#79705f` | Tertiary text, eyebrows |
| `--ink-4` | `#a89e88` | Disabled, decorative |
| `--rule` | `#d7c9a8` | Hairlines, card borders |
| `--rule-soft` | `#e9dfc4` | Softer dividers between rows |
| `--accent` | `#a8541f` | **Copper** primary accent (default) |
| `--accent-2` | `#b96a37` | Accent gradient stop |
| `--accent-soft` | `#f1cba8` | Accent fill, selection |
| `--accent-ink` | `#6a3210` | Text on accent-soft |

### Color — dark theme (`[data-theme="dark"]`)

| Token | Value |
|---|---|
| `--paper` | `#1b1813` |
| `--paper-2` | `#221e17` |
| `--paper-3` | `#2a251c` |
| `--paper-edge` | `#100e0a` |
| `--ink` | `#f0e6cf` |
| `--ink-2` | `#d6c8a7` |
| `--ink-3` | `#a89c81` |
| `--ink-4` | `#6b6452` |
| `--rule` | `#3a322a` |
| `--rule-soft` | `#2b2620` |
| `--accent` | `#d97e44` |
| `--accent-2` | `#e9925a` |
| `--accent-soft` | `#6a3a1c` |
| `--accent-ink` | `#f1cba8` |

### Color — section labels (used in waveform bands, ribbon, chips, section comparison rows)

Light theme:

| Section | Fill | Ink |
|---|---|---|
| intro / outro | `#d9d0b9` | `#6b6249` |
| verse | `#c5d3df` | `#345469` |
| chorus | `#efc7a4` | `#8a3f17` |
| bridge | `#d6c1dd` | `#553e6e` |
| inst | `#c8d8c0` | `#3e6433` |

Dark theme:

| Section | Fill | Ink |
|---|---|---|
| intro / outro | `#2e2922` | `#c1b794` |
| verse | `#25333d` | `#9ec2da` |
| chorus | `#46291a` | `#f0c19a` |
| bridge | `#322641` | `#c7a8e0` |
| inst | `#283525` | `#a8c89e` |

### Alternate accent palettes (Tweaks panel)

| Accent | Light `--accent` | Dark `--accent` |
|---|---|---|
| copper (default) | `#a8541f` | `#d97e44` |
| petrol | `#1f5563` | `#6cb6c7` |
| ochre | `#9a7a14` | `#d4af3a` |
| plum | `#7a3e6a` | `#c986b6` |

(See `hi-fi/app.jsx` for full `ACCENTS` map with all 4 derived colors per theme.)

### Typography

| Token | Family | Use |
|---|---|---|
| `--font-display` | **Bricolage Grotesque** (variable, opsz 12–96) | Card titles, hero metrics, page headings |
| `--font-ui` | **Geist** | Body, buttons, labels |
| `--font-mono` | **JetBrains Mono** | All numeric data, timestamps, mono chord labels, file metadata |

Type roles (utility classes in `theme.css`):

- `.d-display` — display weight 500, letter-spacing -0.02em, line-height 1.02
- `.d-display-i` — same but italic, weight 400
- `.d-eyebrow` — 10.5px UI medium, uppercase, letter-spacing 0.14em, ink-3
- `.d-italic-explain` — 14px UI italic, ink-3, line-height 1.4
- `.d-mono` — JetBrains Mono with `ss01 tnum calt` feature settings

Size scale used in the design (no formal scale — listed by occurrence):

- 64px display: page headings (upload screen H1)
- 56px mono: hero tempo number
- 44px display: hero duration
- 32px display: result-page filename
- 30px mono: progression fingerprint
- 24px → 20px display: card titles
- 18px italic: subtitle / explainer beneath H1
- 14px UI: body
- 13px UI: button labels
- 12px UI: small labels
- 11px UI / 10.5px mono: pills, eyebrows, micro-labels
- 10px mono: very small (date axes, ticks)

### Spacing

- `--gutter` 28px (comfy) / 18px (compact) — page side padding + major gaps between cards.
- `--card-pad` 20px / 14px (compact) — inside card body padding.
- Vertical stack between cards on main screen: 20px.
- Inter-row inside a card: 8–14px depending on density.

### Radii

- Cards: 10px
- Buttons / inputs: 8px
- Pills / chips / toggle: 999px
- Inner widgets (screens, progress bars): 6px

### Shadows

| Token | Value | Use |
|---|---|---|
| `--shadow-paper` | `0 1px 0 #fff8 inset, 0 -1px 0 #00000010 inset, 0 2px 0 #00000010, 0 8px 22px -10px #00000022` | Paper cards |
| `--shadow-emboss` | `0 1px 0 #fff8 inset, 0 -1px 0 #00000018 inset` | Buttons, toggle base |
| `--shadow-press` | `inset 0 2px 4px #00000028, inset 0 -1px 0 #ffffff10` | Pressed / inset surfaces |
| `--shadow-knob` | `0 1px 0 #fff8 inset, 0 -2px 4px #00000018 inset, 0 3px 6px -1px #00000033, 0 8px 14px -4px #00000026` | Brass knob |

Dark theme overrides each of these with darker / stronger values.

### Density

`density: 'compact'` adds `.dense` class on `<html>`, which halves the gutter and card-pad. Treat this as a power-user preference for the production app — exposed via a settings menu, not in the primary UI.

---

## Files in this bundle

```
design_handoff_music_analyzer/
├── README.md                       ← this file
├── Music Analyzer.html             ← entry point, loads everything below
├── hi-fi/
│   ├── theme.css                   ← all design tokens (CSS custom properties)
│   ├── tweaks-panel.jsx            ← design-tool only; not needed in production
│   ├── data.jsx                    ← mock analysis data + types-by-example
│   ├── components.jsx              ← Icon, Card, Button, Toggle, Pill, ConfidenceDots, Screen, Knob, Stat, CrosshairProvider
│   ├── waveform.jsx                ← Waveform (section bands + chord ribbon + playhead)
│   ├── signals.jsx                 ← SignalLane, ChordLaneTimeline, BeatRulerLane
│   ├── wheel.jsx                   ← PitchClassWheel
│   ├── cards.jsx                   ← HeroSummary, InstrumentsCard, SectionComparison, PitchClassCard, TranspositionCard
│   ├── upload.jsx                  ← UploadScreen, ProgressPanel, OptionRow, FilePreview, UploadIcon
│   ├── main.jsx                    ← MainScreen (analysis), Transport, SectionRibbon, Annotation
│   └── app.jsx                     ← App shell, AppHeader, theme/accent application
└── reference/
    └── backend-spec.md             ← original backend spec — endpoints, response shapes, polling notes
```

To preview the design locally: open `Music Analyzer.html` in a modern browser. No build step needed (Babel runs in-browser).

---

## Assets

**No external image / icon assets.** Every icon in the design is an inline SVG in `hi-fi/components.jsx` under the `Icon` object — copy them into the production codebase as standalone SVG components (or replace with the codebase's existing icon set if there's a closer match; suggested mapping below).

| Design icon | Lucide equivalent (closest) |
|---|---|
| `Icon.Logo` | (custom — keep) |
| `Icon.Sun` / `Moon` | `sun` / `moon` |
| `Icon.Play` / `Pause` / `Prev` / `Next` | `play` / `pause` / `skip-back` / `skip-forward` |
| `Icon.Share` | `share-2` |
| `Icon.Download` | `download` |
| `Icon.Copy` | `copy` |
| `Icon.PDF` | `file-text` |
| `Icon.Note` | `music` |
| `Icon.Upload` | `upload` |

**Fonts** — all from Google Fonts. Use `next/font/google` to self-host:

```ts
import { Bricolage_Grotesque, Geist, JetBrains_Mono } from 'next/font/google'
```

Note: Bricolage Grotesque is variable with optical sizing — load it with `axes: ['opsz']` for proper display rendering at large sizes.

---

## Open questions for product

- **Progression description** in the hero ("classic minor — descending bass over A→E→F→C"). The backend doesn't return this — does the frontend ship a lookup table for common fingerprints, or should the backend add a `progression_description` field?
- **Instrument alternative** ("could also be synth"). Same question — frontend table keyed off `instrument_label`, or backend adds `instrument_alternative`?
- **Annotations.** Out of scope for the POC's first cut, but the visual treatment is in the design. The data model isn't defined yet — who owns annotations (per-user? per-job? public?), and where do they persist?
- **Recent uploads.** Currently local mock. Does the backend need a `GET /jobs?recent=true` endpoint, or is local storage of job IDs enough for the POC?
- **Auth + billing slots.** The header's right-side `?` button and the per-option `+ 0.4 credits` strings are placeholders for the future surface. The visual reservation is intentional but the contracts are TBD.

---

## What to do next

1. Open `Music Analyzer.html` in a browser to study behavior.
2. Read `reference/backend-spec.md` end to end.
3. Scaffold the Next.js app, port `theme.css` tokens.
4. Build components in this rough order:
   - shell + theme + AppHeader (no functionality yet)
   - Upload screen → wire `POST /upload` + `POST /analyze`
   - `/jobs/[jobId]` route with ProgressPanel + polling
   - Results route with HeroSummary stubbed in (verify data flow)
   - Waveform → Transport → Section ribbon
   - Signals lanes + crosshair context
   - PitchClassWheel
   - Instruments / SectionComparison / Transposition
5. Wire the three header action buttons (share / PDF / JSON).
6. Edge-case pass: low confidence, no vocals, failed job, very short song.

The HTML prototype handles the visual + interaction language. Anywhere the prototype's behavior conflicts with the backend spec, **the backend spec wins.**
