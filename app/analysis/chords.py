from pathlib import Path
import numpy as np
import madmom.features.chords as mchords
from music21 import harmony, roman, key as m21key


_DISSONANCE = {
    "maj": 0.1, "min": 0.2, "dom7": 0.5, "maj7": 0.3,
    "min7": 0.35, "dim": 0.8, "hdim7": 0.7, "aug": 0.6,
    "sus2": 0.25, "sus4": 0.25,
}

_DISTANCE = {
    "I": 0.0, "IV": 0.15, "V": 0.2, "II": 0.25, "VI": 0.25,
    "III": 0.3, "VII": 0.35,
}


def detect_chords(wav_path: Path, key_result: dict) -> dict:
    proc = mchords.CNNChordFeatureProcessor()
    decode = mchords.CRFChordRecognitionProcessor()
    features = proc(str(wav_path))
    raw = decode(features)
    # raw: structured array with dtype [('time', '<f8'), ('duration', '<f8'), ('label', '<U25')]

    root_str = key_result["key"]["root"]
    quality = key_result["key"]["mode_quality"]
    key_str = f"{root_str} {quality}"

    chords = []
    for onset, duration, label in raw:
        if label in ("N", "X"):
            continue
        offset = float(onset) + float(duration)
        roman_str = _to_roman(label, key_str)
        tension = _chord_tension(label, roman_str)
        chords.append({
            "start": round(float(onset), 3),
            "end": round(offset, 3),
            "chord": label,
            "roman": roman_str,
            "tension": round(tension, 3),
        })

    fingerprint = _progression_fingerprint(chords)
    return {"progression_fingerprint": fingerprint, "chords": chords}


_MADMOM_TO_M21 = {
    "maj": "", "min": "m", "dom7": "7", "maj7": "maj7",
    "min7": "m7", "dim": "dim", "hdim7": "m7b5", "aug": "+",
    "sus2": "sus2", "sus4": "sus4",
}


def _to_roman(chord_label: str, key_str: str) -> str:
    try:
        parts = chord_label.split(":", 1)
        root = parts[0]
        quality = parts[1] if len(parts) > 1 else "maj"
        m21_label = root + _MADMOM_TO_M21.get(quality, quality)
        key_parts = key_str.split(" ", 1)
        k = m21key.Key(key_parts[0], key_parts[1] if len(key_parts) > 1 else "major")
        cs = harmony.ChordSymbol(m21_label)
        rn = roman.romanNumeralFromChord(cs, k)
        return rn.figure
    except Exception:
        return chord_label


def _chord_tension(label: str, roman_str: str) -> float:
    quality = "maj"
    for q in _DISSONANCE:
        if q in label.lower():
            quality = q
            break
    dissonance = _DISSONANCE.get(quality, 0.3)
    distance = 0.2
    for numeral, d in _DISTANCE.items():
        if roman_str.upper().startswith(numeral):
            distance = d
            break
    return dissonance * (1 + distance)


def _progression_fingerprint(chords: list[dict]) -> str:
    seen: list[str] = []
    for c in chords:
        r = c["roman"]
        if not seen or seen[-1] != r:
            seen.append(r)
    return "–".join(seen[:8])
