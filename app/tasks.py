import uuid
import shutil
from pathlib import Path
from fastapi import BackgroundTasks
from app.config import settings
from app.database import SyncSessionLocal
from app.models.db import Job
from app.dependencies import get_storage

from app.analysis.preprocess import preprocess
from app.analysis.structure import analyze_structure
from app.analysis.key import detect_key
from app.analysis.chords import detect_chords
from app.analysis.pitch import analyze_pitch
from app.analysis.instruments import classify_instruments
from app.analysis.dynamics import compute_dynamics
from app.analysis.tension import compute_tension
from app.analysis.aggregate import aggregate


# ── DB helpers (sync — called from background thread) ────────────────────────

def _update_job(job_id: str, **kwargs) -> None:
    with SyncSessionLocal() as db:
        job = db.get(Job, uuid.UUID(job_id))
        for k, v in kwargs.items():
            setattr(job, k, v)
        db.commit()


def set_progress(job_id: str, stage: str, progress: int) -> None:
    _update_job(job_id, status="processing", stage=stage, progress=progress)


def set_done(job_id: str, result: dict) -> None:
    _update_job(job_id, status="done", stage="Done", progress=100, result=result)


def set_failed(job_id: str, stage: str, error: str) -> None:
    _update_job(job_id, status="failed", stage=stage, error=error)


# ── Dispatch ─────────────────────────────────────────────────────────────────

async def dispatch_task(
    background_tasks: BackgroundTasks,
    job_id: str,
    storage_key: str,
    options: dict,
) -> None:
    """
    Thin dispatch wrapper. To swap in Celery later, change only this function:
        celery_app.send_task("run_analysis", args=[job_id, storage_key, options])
    BackgroundTasks runs sync functions in a thread pool automatically.
    """
    background_tasks.add_task(run_analysis, job_id, storage_key, options)


# ── Pipeline ─────────────────────────────────────────────────────────────────

def run_analysis(job_id: str, storage_key: str, options: dict) -> None:
    """Main analysis pipeline. Runs in a thread pool via BackgroundTasks."""
    work_dir = Path(settings.WORK_DIR) / job_id
    work_dir.mkdir(parents=True, exist_ok=True)
    try:
        _pipeline(job_id, storage_key, work_dir, options)
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


def _pipeline(job_id: str, storage_key: str, work_dir: Path, options: dict) -> None:
    storage = get_storage()

    # Stage 0 — Preprocess
    try:
        set_progress(job_id, "Preprocessing", 0)
        audio_bytes = storage.load(storage_key)
        raw_path = work_dir / "input_audio"
        raw_path.write_bytes(audio_bytes)
        wav_path, duration = preprocess(raw_path, work_dir)
    except Exception as e:
        set_failed(job_id, "preprocess", str(e))
        return

    # Stage 1 — Structure
    try:
        set_progress(job_id, "Analyzing structure", 10)
        structure = analyze_structure(wav_path)
        stems_dir = wav_path.parent / "htdemucs" / wav_path.stem
    except Exception as e:
        set_failed(job_id, "structure", str(e))
        return

    # Stage 2 — Key
    try:
        set_progress(job_id, "Detecting key", 70)
        key_result = detect_key(wav_path)
    except Exception as e:
        set_failed(job_id, "key", str(e))
        return

    # Stage 3 — Chords
    try:
        set_progress(job_id, "Detecting chords", 74)
        chords_result = detect_chords(wav_path, key_result)
    except Exception as e:
        set_failed(job_id, "chords", str(e))
        return

    # Stage 4 — Pitch
    try:
        set_progress(job_id, "Analyzing pitch ranges", 78)
        pitch_result = analyze_pitch(stems_dir, key_result)
    except Exception as e:
        set_failed(job_id, "pitch", str(e))
        return

    # Stage 5 — Instruments
    try:
        set_progress(job_id, "Classifying instruments", 83)
        instruments_result = classify_instruments(stems_dir)
    except Exception as e:
        set_failed(job_id, "instruments", str(e))
        return

    # Stage 6 — Dynamics
    try:
        set_progress(job_id, "Computing dynamics", 87)
        dynamics_result = compute_dynamics(wav_path, stems_dir)
    except Exception as e:
        set_failed(job_id, "dynamics", str(e))
        return

    # Stage 7 — Tension
    try:
        set_progress(job_id, "Computing tension", 91)
        tension_result = compute_tension(chords_result, pitch_result, dynamics_result)
    except Exception as e:
        set_failed(job_id, "tension", str(e))
        return

    # Stage 8 — Aggregate
    try:
        set_progress(job_id, "Aggregating sections", 94)
        aggregate_result = aggregate(structure, key_result, chords_result, pitch_result, dynamics_result, tension_result)
    except Exception as e:
        set_failed(job_id, "aggregate", str(e))
        return

    # Stage 9 — Stem upload (optional)
    stems_urls: dict[str, str] = {}
    if options.get("include_stems") and stems_dir.exists():
        try:
            set_progress(job_id, "Uploading stems", 97)
            for stem_name in ["vocals", "drums", "bass", "other"]:
                stem_path = stems_dir / f"{stem_name}.wav"
                if stem_path.exists():
                    key = f"stems/{job_id}/{stem_name}.wav"
                    storage.save(key, stem_path.read_bytes())
                    stems_urls[stem_name] = storage.get_url(key)
        except Exception as e:
            set_failed(job_id, "stem_upload", str(e))
            return

    stems = {**instruments_result}
    for stem_name, url in stems_urls.items():
        stems.setdefault(stem_name, {})["download_url"] = url
    if pitch_result.get("pitch_ranges"):
        for stem_name, pitch_data in pitch_result["pitch_ranges"].items():
            stems.setdefault(stem_name, {})["pitch_range"] = pitch_data

    result = {
        "job_id": job_id,
        "filename": options.get("_filename", "unknown"),
        "playback_url": f"/files/{options.get('_file_id', '')}/audio",
        "duration_sec": duration,
        "key": key_result["key"],
        "bpm": structure["bpm"],
        "time_signature": structure["time_signature"],
        "beats": structure["beats"],
        "downbeats": structure["downbeats"],
        "sections": structure["sections"],
        "harmonic": chords_result,
        "stems": stems,
        "pitch_class_histogram": pitch_result.get("pitch_class_histogram", {}),
        "dynamics": dynamics_result,
        "tension_curve": tension_result,
        "section_comparison": aggregate_result["section_comparison"],
        "transposition": aggregate_result["transposition"],
    }

    set_done(job_id, result)
