from pathlib import Path
import torch


def analyze_structure(wav_path: Path) -> dict:
    """
    Run allin1 on wav_path. Returns BPM, beats, downbeats, time signature, sections.
    allin1 runs Demucs internally — stems land at wav_path.parent/htdemucs/wav_path.stem/.
    keep_byproducts=True retains those stems so subsequent stages can reuse them.
    """
    import allin1

    device = _get_device()
    result = allin1.analyze(str(wav_path), keep_byproducts=True, device=device)

    time_sig = _infer_time_signature(result.beat_positions)

    sections = [
        {"start": float(seg.start), "end": float(seg.end), "label": _normalize_label(seg.label)}
        for seg in result.segments
    ]

    return {
        "bpm": float(result.bpm),
        "time_signature": time_sig,
        "beats": [float(b) for b in result.beats],
        "downbeats": [float(b) for b in result.downbeats],
        "sections": sections,
    }


def _get_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    # MPS skipped — NATTEN's Flex Attention backend does not support MPS
    return "cpu"


def _infer_time_signature(beat_positions: list) -> str:
    if not beat_positions:
        return "4/4"
    max_pos = max(beat_positions)
    return f"{max_pos}/4"


_LABEL_MAP = {
    "instrumental": "inst",
}


def _normalize_label(label: str) -> str:
    label = label.lower().strip()
    return _LABEL_MAP.get(label, label)
