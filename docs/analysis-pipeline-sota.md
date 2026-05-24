# Analysis Pipeline — State of the Art Research

*Researched: 2026-05-22*

## Summary

Assessment of the current pipeline against state-of-the-art approaches, with prioritized upgrade recommendations.

---

## Current Pipeline Assessment

| Module | Current Approach | Age | Quality | Notes |
|--------|-----------------|-----|---------|-------|
| Structure | allin1 (KAIST) | 2023 | Good | Solid, still competitive |
| Chords | madmom CRF | 2016 | Poor | Major/minor only, 9 years old |
| Pitch | librosa.pyin | — | Limited | Monophonic only, no MIDI out |
| Instruments | Hardcoded labels + spectral centroid | — | Weak | Heuristic for "other" stem is essentially a guess |

---

## Chord Detection

**Current:** madmom `CNNChordFeatureProcessor` + `CRFChordRecognitionProcessor`  
- Only recognises major and minor chords (24-class vocabulary)  
- Published 2016 — the weakest link in the pipeline

**Recommended replacement: BTC (Bi-Directional Transformer for Chord Recognition)**  
- Repo: [jayg996/BTC-ISMIR19](https://github.com/jayg996/BTC-ISMIR19)  
- Paper: ISMIR 2019  
- Vocabulary: 170 chord types including 7ths, sus, dim, aug, slash chords  
- Uses CREMA features + bi-directional transformer encoder  
- Pretrained checkpoints available, ~1 day to integrate  

**Alternative: autochord**  
- Python package, pip-installable  
- Built on BTC internals, simpler API  
- Less control but fastest path to upgrade  

**Also worth watching:** Large-vocabulary models with 300+ chord types using self-supervised contrastive pretraining (2023–2025 papers), but no clean open-source release yet.

---

## Section / Structure Detection

**Current:** allin1 (KAIST, 2023)  
- Spectral + rhythmic features, section-level labels (verse/chorus/bridge/intro/outro)  
- Generally good but can miss fine-grained structure in complex arrangements  

**SOTA: SongFormer** (ASLP-Lab, arxiv 2510.02797, October 2025)  
- Multi-resolution self-supervised representations  
- Trained on SongFormDB (14,000+ songs)  
- HuggingFace checkpoint available: `aslp-lab/SongFormer`  
- Outperforms allin1 on standard benchmarks  
- Swap is ~1 day effort; consider only if allin1 results remain unsatisfactory in practice  

**Also competitive:** CAMHSA (2024), self-similarity matrix approaches with learned contrastive losses.

---

## Pitch / Melody Estimation

**Current:** librosa.pyin — monophonic only, no MIDI output  

**Recommended additions (not replacements):**

| Tool | Use case | Notes |
|------|----------|-------|
| **basic-pitch** (Spotify) | Polyphonic MIDI transcription | pip-installable, handles chords and multiple instruments |
| **RMVPE** | Vocal melody extraction | Better monophonic F0 than pyin, especially in noisy audio |
| **CREPE** | High-accuracy monophonic pitch | Neural network, smoother output than pyin |
| **MT3** (Google) | Multi-instrument MIDI | Research code, complex setup, best accuracy |

**Priority pick:** basic-pitch for the MIDI export feature (~1 day). RMVPE as a pyin drop-in for vocals.

---

## Instrument Detection

**Current:** Hardcoded labels for vocals/drums/bass; `_classify_other()` uses spectral centroid threshold — essentially a guess.

**Recommended: PaSST (Patchout Audio Spectrogram Transformer)**  
- Already noted in the codebase's TODO comment  
- Trained on AudioSet (2M clips, 527 classes) + music-specific fine-tuned variants  
- pip-installable via `hear-eval-kit` or direct HuggingFace model  
- Run on the "other" stem after demucs separation for per-instrument tagging  
- ~1 day to integrate  

**Alternatives:** AST (Audio Spectrogram Transformer), MERT (music-specific self-supervised pretraining), hierarchical classifiers.

---

## Additional Features Worth Adding

### For Producers / Mix Engineers
| Feature | How | Value |
|---------|-----|-------|
| Integrated loudness (LUFS-I) | pyloudnorm | Mastering reference |
| Loudness range (LRA) | pyloudnorm | Dynamic consistency check |
| True peak | pyloudnorm | Clipping headroom |
| Stereo width | (L-R) / (L+R) RMS ratio | Mono compatibility |
| Spectral balance (sub/low/mid/high) | FFT band energy | Tonal balance vs reference |
| Phase correlation | Cross-correlation of L/R | Mono collapse risk |

### For Songwriters / Composers
| Feature | How | Value |
|---------|-----|-------|
| Extended chord vocab (7ths, sus, dim) | BTC upgrade | Richer harmonic analysis |
| Modal interchange detection | Post-BTC logic | Identify borrowed chords |
| Cadence detection (V→I, IV→I, etc.) | Rule-based on chord sequence | Structural phrasing insight |
| Key change detection | Window-based key estimation | Modulation points |
| Chord tension over time | Already partially implemented | Emotional arc |

### For Musicians / Performers
| Feature | How | Value |
|---------|-----|-------|
| MIDI export (melody + chords) | basic-pitch | Transcription, practice |
| Lead sheet generation | Chords + section labels | Quick chart for session use |
| Tempo map (variable BPM) | madmom beat tracker → per-bar BPM | Rubato / groove analysis |
| Groove analysis (beat offset from grid) | Beat timing deviation | Quantisation feel |

### Cross-Cutting / Discovery
| Feature | How | Value |
|---------|-----|-------|
| Lyrics transcription + alignment | Whisper (large-v3) + forced alignment | Search, theme analysis |
| Mood / genre tagging | MERT or music-specific model | Catalogue classification |
| Similar song detection | Embedding similarity | Inspiration / reference matching |

---

## Prioritised Upgrade Roadmap

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 1 | Replace madmom with BTC for chord recognition | ~1 day | High — unlocks 7ths, sus, dim, 170 vocab |
| 2 | Replace `_classify_other` heuristic with PaSST | ~1 day | Medium — accurate instrument tags |
| 3 | Add basic-pitch for polyphonic MIDI export | ~1 day | Medium — new user-facing feature |
| 4 | Whisper lyrics transcription + word alignment | ~2 days | High — new surface area |
| 5 | SongFormer swap for structure detection | ~1 day | Low–Medium — only if allin1 is visibly wrong |
| 6 | Stereo width + LUFS + spectral balance metrics | ~0.5 day | Medium — producer tooling |

---

## References

- BTC: Jonggwon Park et al., "A Bi-Directional Transformer for Musical Chord Recognition", ISMIR 2019. [GitHub](https://github.com/jayg996/BTC-ISMIR19)
- SongFormer: arxiv 2510.02797 (October 2025). HuggingFace: `aslp-lab/SongFormer`
- basic-pitch: Bitteur et al., Spotify. [GitHub](https://github.com/spotify/basic-pitch)
- PaSST: Koutini et al., "Efficient Training of Audio Transformers with Patchout", Interspeech 2022.
- RMVPE: Wei et al., "RMVPE: A Robust Model for Vocal Pitch Estimation", ICASSP 2023.
- CREPE: Kim et al., "CREPE: A Convolutional Representation for Pitch Estimation", ICASSP 2018.
- pyloudnorm: [csteinmetz1/pyloudnorm](https://github.com/csteinmetz1/pyloudnorm) — ITU-R BS.1770 implementation.
