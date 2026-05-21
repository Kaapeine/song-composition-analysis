from pathlib import Path
import numpy as np
import librosa


_INTERVAL_NAMES = ["1 (root)", "b2", "2", "b3", "3", "4", "b5", "5", "b6", "6", "b7", "7"]


def analyze_pitch(stems_dir: Path, key_result: dict) -> dict:
    tonic_idx = key_result["_tonic_idx"]
    mean_chroma = key_result["_chroma"]

    pitch_ranges: dict[str, dict] = {}
    vocal_midi_range = None

    for stem_name in ("vocals", "other"):
        stem_path = stems_dir / f"{stem_name}.wav"
        if not stem_path.exists():
            continue

        y, sr = librosa.load(str(stem_path), sr=22050, mono=True)
        f0, voiced_flag, _ = librosa.pyin(
            y, sr=sr,
            fmin=librosa.note_to_hz("C2"),
            fmax=librosa.note_to_hz("C7"),
        )

        voiced_f0 = f0[voiced_flag & ~np.isnan(f0)]
        if len(voiced_f0) == 0:
            continue

        midi_pitches = librosa.hz_to_midi(voiced_f0)
        min_midi = int(np.min(midi_pitches))
        max_midi = int(np.max(midi_pitches))
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
