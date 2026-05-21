import numpy as np
import librosa


_VOICE_RANGES = {
    "bass":           (40, 67),   # E2–G4
    "baritone":       (45, 72),   # A2–C5
    "tenor":          (48, 76),   # C3–E5
    "mezzo-soprano":  (55, 79),   # G3–G5
    "soprano":        (60, 84),   # C4–C6
}


def aggregate(
    structure: dict,
    key_result: dict,
    chords_result: dict,
    pitch_result: dict,
    dynamics_result: dict,
    tension_result: list,
) -> dict:
    section_comparison = _compare_sections(
        structure["sections"],
        dynamics_result,
        tension_result,
        chords_result.get("chords", []),
        structure.get("bpm", 120),
    )
    transposition = _transposition_suggestions(
        key_result,
        pitch_result.get("_vocal_midi_range"),
    )
    return {"section_comparison": section_comparison, "transposition": transposition}


def _slice_series(series: list, start: float, end: float) -> list[float]:
    return [v for t, v in series if start <= t < end]


def _compare_sections(
    sections: list[dict],
    dynamics: dict,
    tension: list,
    chords: list[dict],
    bpm: float,
) -> list[dict]:
    from collections import defaultdict
    label_stats: dict[str, list] = defaultdict(list)

    for sec in sections:
        start, end = sec["start"], sec["end"]
        rms_vals = _slice_series(dynamics.get("rms", []), start, end)
        lufs_vals = _slice_series(dynamics.get("loudness_lufs", []), start, end)
        brightness_vals = _slice_series(dynamics.get("brightness", []), start, end)
        density_vals = _slice_series(dynamics.get("arrangement_density", []), start, end)
        tension_vals = _slice_series(tension, start, end)

        sec_chords = [c for c in chords if c["start"] >= start and c["end"] <= end]
        duration_bars = max((end - start) / (60 / bpm / 4), 1)
        chord_change_rate = len(sec_chords) / duration_bars

        label_stats[sec["label"]].append({
            "avg_loudness_lufs": float(np.mean(lufs_vals)) if lufs_vals else 0.0,
            "avg_brightness": float(np.mean(brightness_vals)) if brightness_vals else 0.0,
            "avg_tension": float(np.mean(tension_vals)) if tension_vals else 0.0,
            "avg_density": float(np.mean(density_vals)) if density_vals else 0.0,
            "peak_rms": float(np.max(rms_vals)) if rms_vals else 0.0,
            "chord_change_rate": round(chord_change_rate, 3),
        })

    result = []
    for label, instances in label_stats.items():
        merged = {k: round(float(np.mean([i[k] for i in instances])), 3) for k in instances[0]}
        result.append({"label": label, "instances": len(instances), **merged})

    return result


def _transposition_suggestions(key_result: dict, vocal_midi_range) -> dict:
    if vocal_midi_range is None:
        return {}

    min_midi, max_midi = vocal_midi_range
    span = max_midi - min_midi
    tonic_name = key_result["key"]["root"]
    quality = key_result["key"]["mode_quality"]
    notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    tonic_idx = notes.index(tonic_name)

    suggestions = []
    for semitones in [-4, -2, 0, 2, 4]:
        new_tonic_idx = (tonic_idx + semitones) % 12
        new_key_name = f"{notes[new_tonic_idx]} {quality}"
        new_min = min_midi + semitones
        new_max = max_midi + semitones
        fits = [
            vtype for vtype, (lo, hi) in _VOICE_RANGES.items()
            if new_min >= lo and new_max <= hi
        ]
        suggestions.append({
            "semitones": semitones,
            "new_key": new_key_name,
            "vocal_range": {
                "min": librosa.midi_to_note(new_min),
                "max": librosa.midi_to_note(new_max),
            },
            "fits_voice_types": fits,
        })

    return {
        "vocal_range_original": {
            "min": librosa.midi_to_note(min_midi),
            "max": librosa.midi_to_note(max_midi),
            "span_semitones": span,
        },
        "suggestions": suggestions,
    }
