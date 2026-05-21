import numpy as np
from scipy.ndimage import gaussian_filter1d


_SEMITONE_TENSION = {
    0: 0.0, 1: 0.9, 2: 0.3, 3: 0.2, 4: 0.15,
    5: 0.1, 6: 1.0, 7: 0.05, 8: 0.15, 9: 0.2,
    10: 0.4, 11: 0.85,
}


def compute_tension(chords_result: dict, pitch_result: dict, dynamics_result: dict) -> list:
    """
    Three-component blend:
      40% chord tension (from chord quality + distance from tonic)
      35% melodic tension (semitone distance from nearest chord tone)
      25% dynamic tension (normalized RMS)
    """
    rms_series = dynamics_result.get("rms", [])
    if not rms_series:
        return []

    times = np.array([p[0] for p in rms_series])
    rms_vals = np.array([p[1] for p in rms_series])

    chord_curve = _interpolate_chord_tension(chords_result.get("chords", []), times)
    dynamic_curve = _normalize(rms_vals)
    melodic_curve = _melodic_tension(pitch_result, chords_result.get("chords", []), times)

    tension = 0.4 * chord_curve + 0.25 * dynamic_curve + 0.35 * melodic_curve
    tension_smooth = gaussian_filter1d(tension, sigma=10)

    return [[round(float(t), 3), round(float(v), 4)] for t, v in zip(times, tension_smooth)]


def _interpolate_chord_tension(chords: list[dict], times: np.ndarray) -> np.ndarray:
    result = np.zeros(len(times))
    for chord in chords:
        mask = (times >= chord["start"]) & (times < chord["end"])
        result[mask] = chord.get("tension", 0.2)
    return result


def _normalize(arr: np.ndarray) -> np.ndarray:
    max_val = arr.max()
    return arr / max_val if max_val > 0 else arr


def _melodic_tension(pitch_result: dict, chords: list[dict], times: np.ndarray) -> np.ndarray:
    """Approximate: use pitch histogram avoid-note prevalence as melodic tension proxy."""
    histogram = pitch_result.get("pitch_class_histogram", {})
    avoid_notes = set(histogram.get("avoid_notes", []))
    values = histogram.get("values", {})

    if not values:
        return np.zeros(len(times))

    avoid_weight = sum(values.get(n, 0) for n in avoid_notes)
    total = sum(values.values()) or 1
    base_tension = avoid_weight / total

    return np.full(len(times), base_tension)
