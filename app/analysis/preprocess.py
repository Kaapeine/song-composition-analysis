import json
import subprocess
from pathlib import Path


def preprocess(raw_path: Path, work_dir: Path) -> tuple[Path, float]:
    """
    Convert input audio to 44100Hz mono WAV.
    Returns (wav_path, duration_sec).
    Raises on unsupported format or ffmpeg failure.
    """
    wav_path = work_dir / "audio.wav"

    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(raw_path),
            "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le",
            str(wav_path),
        ],
        check=True,
        capture_output=True,
    )

    duration = _ffprobe_duration(wav_path)
    return wav_path, duration


def _ffprobe_duration(path: Path) -> float:
    out = subprocess.check_output(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", str(path)],
        stderr=subprocess.DEVNULL,
    )
    return float(json.loads(out)["format"]["duration"])
