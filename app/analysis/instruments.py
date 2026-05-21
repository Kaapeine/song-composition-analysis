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
    Heuristic via spectral centroid. High centroid → guitar/synth; low → piano/pad.
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
