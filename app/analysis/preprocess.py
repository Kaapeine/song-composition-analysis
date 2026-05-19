from pathlib import Path


def preprocess(raw_path: Path, work_dir: Path) -> tuple[Path, float]:
    """Stage 0 stub. Returns (wav_path, duration_sec)."""
    wav_path = work_dir / "audio.wav"
    wav_path.write_bytes(b"")  # placeholder
    return wav_path, 0.0
