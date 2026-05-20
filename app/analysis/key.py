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
