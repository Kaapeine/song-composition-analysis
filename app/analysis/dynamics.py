from pathlib import Path
import numpy as np
import librosa
import soundfile as sf
import pyloudnorm as pyln
from scipy.ndimage import uniform_filter1d


_HOP = 512        # ~11ms at 44100Hz
_TARGET_RES = 0.1  # downsample to one point per 100ms


def compute_dynamics(wav_path: Path, stems_dir: Path) -> dict:
    y, sr = librosa.load(str(wav_path), sr=None)

    rms = _rms_series(y, sr)
    loudness = _lufs_series(wav_path, sr)
    brightness = _brightness_series(y, sr)
    onset_density = _onset_density_series(y, sr)
    arrangement_density = _arrangement_density(stems_dir, sr)

    return {
        "rms": rms,
        "loudness_lufs": loudness,
        "brightness": brightness,
        "onset_density": onset_density,
        "arrangement_density": arrangement_density,
    }


def _downsample(times: np.ndarray, values: np.ndarray, target_res: float) -> list[list[float]]:
    if len(times) == 0:
        return []
    step = max(1, int(target_res / (times[1] - times[0]))) if len(times) > 1 else 1
    t = times[::step]
    v = values[::step]
    return [[round(float(ti), 3), round(float(vi), 4)] for ti, vi in zip(t, v)]


def _rms_series(y: np.ndarray, sr: int) -> list:
    rms = librosa.feature.rms(y=y, hop_length=_HOP)[0]
    times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=_HOP)
    return _downsample(times, rms, _TARGET_RES)


def _lufs_series(wav_path: Path, sr: int) -> list:
    data, rate = sf.read(str(wav_path))
    if data.ndim == 1:
        data = data[:, np.newaxis]
    meter = pyln.Meter(rate, block_size=0.4)
    chunk_size = int(rate * 0.4)
    hop = int(rate * _TARGET_RES)
    results = []
    for i in range(0, len(data) - chunk_size, hop):
        chunk = data[i : i + chunk_size]
        try:
            lufs = meter.integrated_loudness(chunk)
            if not np.isinf(lufs):
                results.append([round(i / rate, 3), round(float(lufs), 2)])
        except Exception:
            pass
    return results


def _brightness_series(y: np.ndarray, sr: int) -> list:
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=_HOP)[0]
    times = librosa.frames_to_time(np.arange(len(centroid)), sr=sr, hop_length=_HOP)
    return _downsample(times, centroid, _TARGET_RES)


def _onset_density_series(y: np.ndarray, sr: int) -> list:
    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=_HOP)
    smooth_frames = int(0.5 * sr / _HOP)
    smoothed = uniform_filter1d(onset_env, size=smooth_frames)
    times = librosa.frames_to_time(np.arange(len(smoothed)), sr=sr, hop_length=_HOP)
    return _downsample(times, smoothed, _TARGET_RES)


def _arrangement_density(stems_dir: Path, sr: int) -> list:
    stem_names = ["vocals", "drums", "bass", "other"]
    stem_rms: dict[str, np.ndarray] = {}
    ref_len = None

    for name in stem_names:
        path = stems_dir / f"{name}.wav"
        if path.exists():
            y, _ = librosa.load(str(path), sr=sr)
            rms = librosa.feature.rms(y=y, hop_length=_HOP)[0]
            stem_rms[name] = rms
            if ref_len is None:
                ref_len = len(rms)

    if not stem_rms or ref_len is None:
        return []

    density = np.zeros(ref_len)
    for rms in stem_rms.values():
        active = (rms[: ref_len] > 0.01).astype(float)
        density += active

    times = librosa.frames_to_time(np.arange(ref_len), sr=sr, hop_length=_HOP)
    return _downsample(times, density, _TARGET_RES)
