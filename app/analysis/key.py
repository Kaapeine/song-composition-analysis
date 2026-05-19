from pathlib import Path


def detect_key(wav_path: Path) -> dict:
    """Stage 2 stub. Returns key info + internal chroma for downstream stages."""
    return {
        "key": {
            "root": "C",
            "mode_quality": "major",
            "mode_name": "ionian",
            "mode_confidence": 0.0,
            "key_confidence": 0.0,
        },
        "_chroma": None,
        "_tonic_idx": 0,
    }
