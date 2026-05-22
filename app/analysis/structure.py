from pathlib import Path
import torch


def analyze_structure(wav_path: Path, work_dir: Path) -> tuple[dict, Path]:
    """
    Run allin1 on wav_path. Returns (structure_dict, stems_dir).
    Passes demix_dir explicitly so stems land inside work_dir rather than
    the default ./demix (CWD-relative), keeping each job's files isolated.
    """
    import allin1

    device = _get_device()
    demix_dir = work_dir / "demix"
    spec_dir = work_dir / "spec"
    result = allin1.analyze(
        str(wav_path),
        keep_byproducts=True,
        device=device,
        demix_dir=str(demix_dir),
        spec_dir=str(spec_dir),
    )

    stems_dir = demix_dir / "htdemucs" / wav_path.stem
    time_sig = _infer_time_signature(result.beat_positions)

    sections = [
        {"start": float(seg.start), "end": float(seg.end), "label": _normalize_label(seg.label)}
        for seg in result.segments
    ]

    structure = {
        "bpm": float(result.bpm),
        "time_signature": time_sig,
        "beats": [float(b) for b in result.beats],
        "downbeats": [float(b) for b in result.downbeats],
        "sections": sections,
    }
    return structure, stems_dir


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
