from pathlib import Path
import numpy as np
import librosa


_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
_INTERVAL_NAMES = ["1 (root)", "b2", "2", "b3", "3", "4", "b5", "5", "b6", "6", "b7", "7"]


def analyze_pitch(stems_dir: Path, key_result: dict) -> dict:
    from basic_pitch.inference import predict
    from basic_pitch import ICASSP_2022_MODEL_PATH

    tonic_idx = key_result["_tonic_idx"]
    mean_chroma = key_result["_chroma"]

    pitch_ranges: dict[str, dict] = {}
    vocal_midi_range = None

    for stem_name in ("vocals", "other"):
        stem_path = stems_dir / f"{stem_name}.wav"
        if not stem_path.exists():
            continue

        _, _, note_events = predict(
            str(stem_path),
            ICASSP_2022_MODEL_PATH,
            onset_threshold=0.5,
            frame_threshold=0.3,
            minimum_note_length=58,
        )

        if not note_events:
            continue

        midi_pitches = [n[2] for n in note_events if n[4] >= 0.5]
        if not midi_pitches:
            continue

        min_midi = int(min(midi_pitches))
        max_midi = int(max(midi_pitches))
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
