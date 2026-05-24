# Music Analyzer — Feature List

**Priority scale:** P1 (build first) → P4 (future)  
**Type:** Math (pure DSP/statistics, no models) · ML (classical machine learning) · DL (deep learning, requires GPU)

---

## Loudness & Dynamics

| Feature | Description | Priority | Type | Library |
|---|---|---|---|---|
| Integrated LUFS | Average perceived loudness of the whole track. Streaming platforms normalize against this. | P1 | Math | pyloudnorm |
| True Peak | Inter-sample peak in dBTP. Streaming platforms reject files above −1 dBTP. | P1 | Math | pyloudnorm |
| Short-term LUFS | LUFS computed over 3s sliding windows. Shows loudness arc across the track. | P1 | Math | pyloudnorm |
| Momentary LUFS | LUFS over 400ms windows. Catches transient loudness peaks. | P1 | Math | pyloudnorm |
| LRA (Loudness Range) | Statistical spread of short-term loudness (10th–95th percentile). Low = heavily compressed. | P1 | Math | pyloudnorm |
| PLR (Peak-to-Loudness Ratio) | True Peak minus Integrated LUFS. How much a streaming platform will turn the track down. | P1 | Math | pyloudnorm |
| DR Score | Dynamic Range meter score (per-block RMS of loud vs. quiet passages). DR 6 = squashed; DR 14+ = dynamic. | P1 | Math | numpy |
| Crest Factor | Peak-to-RMS ratio in dB per section. High = punchy and dynamic. Low = squashed. | P1 | Math | numpy / librosa |
| Streaming Loudness Report | Consolidated view: LUFS, True Peak, LRA, DR, clipping, PLR with pass/fail against Spotify / Apple Music / YouTube / Tidal targets. | P1 | Math | pyloudnorm + numpy |
| RMS Energy over time | Frame-level RMS plotted as a curve. The raw envelope of the track. | P1 | Math | librosa |
| RMS per section | Average RMS for each song section (verse, chorus, etc.). Shows loudness map of the arrangement. | P1 | Math | librosa + numpy |
| Headroom map | Frame-by-frame distance from the signal to 0 dBFS. Shows where a limiter is working hardest. | P2 | Math | numpy |
| Micro-dynamics | Ratio of 10ms RMS to 1s RMS. Near 1.0 = transients crushed by a limiter. Healthy tracks have a large ratio. | P2 | Math | numpy |
| Inter-loudness section variance | Variance of short-term LUFS across the track. Near 0 = compressor has flattened all dynamics globally. | P2 | Math | numpy |
| Noise floor | Estimated from quietest passages. Shows dynamic headroom and background noise level. | P3 | Math | numpy |
| ReplayGain value | Older loudness normalization standard. Still used by some players and DJ software. | P4 | Math | numpy |

---

## Frequency & Spectral

| Feature | Description | Priority | Type | Library |
|---|---|---|---|---|
| Frequency band energy balance | RMS energy in sub-bass (20–60Hz), bass (60–250Hz), low-mid (250–2kHz), high-mid (2–8kHz), air (8–20kHz) as % of total. Tonal fingerprint of the mix. | P1 | Math | librosa / numpy |
| Spectral Centroid over time | Center of mass of the spectrum in Hz. High = bright/harsh. Low = dark/muddy. | P1 | Math | librosa |
| Spectral Contrast | Difference between spectral peaks and valleys across 6 sub-bands. Low contrast = muddy or heavily compressed. | P1 | Math | librosa |
| Spectral Flatness | 0 = pure tone, 1 = white noise. Shows how tonal vs. noisy the signal is at any moment. | P2 | Math | librosa |
| Spectral Rolloff | Frequency below which 85% of spectral energy sits. Brightness proxy; robust for noisy signals. | P2 | Math | librosa |
| Spectral Flux | Frame-to-frame change in the spectrum. High = lots of transients. Good for detecting energetic vs. calm passages. | P2 | Math | librosa |
| Spectral Bandwidth | How wide the spectrum is around the centroid. Narrow = thin; wide = full-frequency content. | P2 | Math | librosa |
| Spectral dropout detection | Sharp high-frequency rolloff indicates prior lossy encoding (MP3/AAC). If spectrum dies above 16kHz, the file was previously encoded at low bitrate. | P2 | Math | numpy / scipy |
| Zero Crossing Rate | How often the waveform crosses zero per second. High = noisy/high-frequency. Low = sustained tonal content. | P3 | Math | librosa |
| Per-section spectral snapshot | Band energy balance + loudness + stereo width + tension per section. Answers "why does my chorus sound smaller than the reference?" | P1 | Math | librosa + numpy |

---

## Stereo & Spatial

| Feature | Description | Priority | Type | Library |
|---|---|---|---|---|
| Stereo width over time | L/R correlation coefficient plotted as a curve (+1 = mono, −1 = out of phase). Shows where mix opens or collapses. | P1 | Math | numpy |
| Phase correlation (mono compatibility) | Flag sections below 0 correlation — these cancel in mono playback. Critical for broadcast and club systems. | P1 | Math | numpy |
| Mid/Side energy ratio | RMS of M=(L+R)/2 vs. S=(L−R)/2 per frequency band. Low-end should be mono; high-end can be wide. Classic mastering check. | P1 | Math | numpy |
| Stereo field asymmetry | Difference in RMS between L and R channels. Persistent asymmetry = panning problem. | P2 | Math | numpy |
| Mono compatibility score | Single number summarizing stereo width + phase correlation. "This track loses X dB when summed to mono." | P2 | Math | numpy |

---

## Transients & Rhythm

| Feature | Description | Priority | Type | Library |
|---|---|---|---|---|
| BPM | Tempo of the track in beats per minute. | P1 | DL | allin1 |
| Beat & downbeat positions | Timestamps of every beat and downbeat. | P1 | DL | allin1 |
| Time signature | Inferred from downbeat spacing (4/4, 3/4, etc.). | P1 | Math | numpy (from allin1 output) |
| Tempo stability | Standard deviation of inter-beat intervals. Near 0 = programmed. High = live performance feel. | P1 | Math | numpy (from allin1 beats) |
| Onset density over time | Onsets per second, smoothed over 1s windows. Shows where the arrangement gets busier or sparser. | P1 | Math | librosa |
| Groove / swing ratio | Ratio of long to short inter-beat intervals. 1.0 = straight; 1.5 = triplet; 0.65 = jazz swing. | P2 | Math | numpy (from allin1 beats) |
| Rhythmic density heatmap | Onset density broken down by frequency band (low/mid/high). Shows if rhythm is driven by kick, guitars, or hi-hats. | P2 | Math | librosa + numpy |
| Attack shape per onset | Average attack time across detected onsets. Snappy vs. soft transients. Relevant for drum processing decisions. | P2 | Math | librosa + numpy |
| Beat histogram | Distribution of inter-onset intervals. Peaks confirm tempo; secondary peaks show subdivisions and syncopation. | P3 | Math | numpy |

---

## Structure & Sections

| Feature | Description | Priority | Type | Library |
|---|---|---|---|---|
| Song sections (intro, verse, chorus, etc.) | Labeled time boundaries for each structural section. | P1 | DL | allin1 |
| Section comparison | Per-section stats: avg loudness, brightness, tension, density, chord change rate. Arranged as a table. | P1 | Math | numpy (from existing data) |
| Arrangement density over time | Count of active stems per frame (0–4). Shows when the arrangement thickens or opens up. | P1 | Math | librosa (per-stem RMS threshold) |

---

## Harmonic & Tonal

| Feature | Description | Priority | Type | Library |
|---|---|---|---|---|
| Key detection | Root note and major/minor quality of the track. | P1 | Math | librosa (Krumhansl-Schmuckler) |
| Mode fingerprint | Identifies the specific mode: ionian, dorian, phrygian, lydian, mixolydian, aeolian, locrian. | P1 | Math | numpy (chroma correlation) |
| Key/mode confidence | How strongly the detected key correlates with the chroma profile. Low score = ambiguous/atonal. | P1 | Math | numpy |
| Chord detection | Time-stamped chord labels across the track. | P1 | ML | autochord / madmom |
| Roman numeral analysis | Chord labels converted to scale-degree notation (I, IV, V, vi, etc.) relative to the detected key. | P1 | Math | music21 (from chord output) |
| Progression fingerprint | The most common 4-bar chord pattern, e.g. "i–VI–III–VII". | P1 | Math | numpy (from chord output) |
| Pitch class histogram | Energy of each of the 12 pitch classes, normalized and shown tonic-relative. | P1 | Math | librosa (from chroma) |
| Avoid notes | Pitch classes that appear rarely and fall outside the scale. Flagged from the histogram. | P2 | Math | numpy (from chroma) |
| Tonal clarity / key strength | Strength of the best-matching key (0–1). Near 0.5 = ambiguous or polytonal. | P2 | Math | numpy (from chroma) |
| Harmonic change detection (HCDF) | Frame-level rate of harmonic change. Spikes mark chord changes without needing a chord classifier. | P2 | Math | numpy (from chroma) |
| Chromagram roughness | Perceptual dissonance between simultaneously active pitch classes per frame. DSP-derived tension curve. | P2 | Math | numpy (Sethares model) |
| Chroma energy deviation | Std deviation across 12 chroma bins. Low = diatonic/tonal; high = chromatic or atonal. | P3 | Math | numpy |
| Key compatibility suggestions | Compatible keys for sampling/layering (relative, parallel, dominant, subdominant). | P3 | Math | music21 |
| Capo/transposition suggestions | For guitarists: which capo position puts standard shapes in this key. | P3 | Math | numpy |
| Circle of fifths position | Visual indicator of where the detected key sits harmonically. | P3 | Math | numpy |

---

## Tension & Energy

| Feature | Description | Priority | Type | Library |
|---|---|---|---|---|
| Tension curve | Blended curve from chord dissonance (40%), melodic tension (35%), and dynamic RMS (25%). Smoothed with gaussian filter. | P1 | Math + DL | numpy / scipy (uses basic-pitch output) |
| Brightness curve | Spectral centroid over time. Proxy for perceived energy and excitement. | P1 | Math | librosa |
| Harmonic complexity curve | HCDF-based view of how fast the harmony evolves. Static vs. busy harmonic language. | P2 | Math | numpy |

---

## Stems & Instruments

| Feature | Description | Priority | Type | Library |
|---|---|---|---|---|
| Source separation (stems) | Splits track into vocals, drums, bass, other. Required by pitch, instrument, and dynamics analysis. | P1 | DL | Demucs (via allin1) |
| Stem download | Pre-signed S3 URLs for each separated stem (vocals, drums, bass, other). Free once Demucs runs. | P1 | DL (reuse) | — |
| Pitch range per stem | Min, max, median MIDI pitch converted to note names per stem. | P1 | DL | basic-pitch (Spotify) |
| Instrument classification | Predicted instrument label + confidence per stem (e.g. "piano", "vocals", "bass guitar"). | P2 | DL | YAMNet / PaSST |
| Vocal clarity score | SNR between vocals stem and full mix. How well the vocals cut through the arrangement. | P3 | Math | numpy (from Demucs stems) |

---

## Transposition & Range

| Feature | Description | Priority | Type | Library |
|---|---|---|---|---|
| Transposition suggestions | For each ±N semitone shift: new key name, new vocal range in note names, compatible voice type. | P2 | Math | numpy (from basic-pitch output) |
| Scale/mode compatibility | Given a detected mode, list compatible scales for improvisation or layering. | P3 | Math | music21 |

---

## Artifacts & File Health

| Feature | Description | Priority | Type | Library |
|---|---|---|---|---|
| Digital clipping detection | Count of samples at or above 0 dBFS. Any count > 0 = clipped file. | P1 | Math | numpy |
| Inter-sample peak detection | True peak exceedances above −1 dBTP. Detects clipping that sample-level inspection misses. | P1 | Math | pyloudnorm |
| DC offset | Mean waveform value. Should be ~0. Non-zero causes clicks at edit points and wastes headroom. | P1 | Math | numpy |
| Lossy artifact detection | Spectral rolloff indicating prior MP3/AAC encoding. Visible as a sharp cutoff in the high-frequency spectrum. | P2 | Math | numpy / scipy |
| Noise gate detection | Detect silent passages and their apparent threshold. Identifies gating artifacts. | P3 | Math | numpy |

---

## Reference & Comparison

| Feature | Description | Priority | Type | Library |
|---|---|---|---|---|
| Reference track comparison | Upload two songs and overlay every metric: LUFS delta, frequency balance delta, stereo width delta, tension curves side by side. | P1 | Math | numpy (all derived) |

---

## Export

| Feature | Description | Priority | Type | Library |
|---|---|---|---|---|
| Chord chart export | Chords formatted as a readable chart by section with bar numbers and BPM. Export as PDF or plain text. | P2 | Math | music21 / reportlab |
| Full analysis JSON export | Complete result object as a downloadable JSON file. | P2 | Math | — |
| Stem download (zip) | All four separated stems as a single zip archive. | P2 | DL (reuse) | — |

---

## Summary by Type

| Type | Count | Notes |
|---|---|---|
| Math only | 48 | Pure DSP / statistics. No GPU needed, fast. |
| ML (classical) | 2 | Chord detection. CPU-only, seconds. |
| DL (deep learning) | 6 | allin1, Demucs, basic-pitch. GPU recommended, 60–120s total. |

The DL stages (allin1 + Demucs + basic-pitch) run once per song and produce intermediate outputs
that feed almost everything else. The remaining ~48 features are pure math derived from those
outputs — meaning the GPU cost is paid once and the rest is essentially free.
