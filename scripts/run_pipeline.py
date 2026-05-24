#!/usr/bin/env python3
"""
Standalone pipeline runner — bypasses the API and DB entirely.
Usage:  .venv/bin/python scripts/run_pipeline.py <audio_file>
"""
import sys
import json
import shutil
import tempfile
from pathlib import Path

# Allow `from app.analysis...` imports when run from project root
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from app.analysis.preprocess import preprocess
from app.analysis.structure import analyze_structure
from app.analysis.key import detect_key
from app.analysis.chords import detect_chords
from app.analysis.pitch import analyze_pitch
from app.analysis.instruments import classify_instruments
from app.analysis.dynamics import compute_dynamics
from app.analysis.tension import compute_tension
from app.analysis.aggregate import aggregate


def log(stage: str, msg: str = "") -> None:
    suffix = f"  {msg}" if msg else ""
    print(f"[{stage}]{suffix}", flush=True)


def run(audio_path: Path) -> dict:
    work_dir = Path(tempfile.mkdtemp(prefix="music-pipeline-"))
    try:
        # Stage 0 — Preprocess
        log("preprocess", f"converting {audio_path.name} → mono 44100 Hz WAV")
        raw_path = work_dir / audio_path.name
        shutil.copy(audio_path, raw_path)
        wav_path, duration = preprocess(raw_path, work_dir)
        log("preprocess", f"done  duration={duration:.1f}s")

        # Stage 1 — Structure
        log("structure", "running allin1 (BPM, beats, sections, stem separation) …")
        structure, stems_dir = analyze_structure(wav_path, work_dir)
        log("structure", f"bpm={structure['bpm']:.1f}  time_sig={structure['time_signature']}  sections={len(structure['sections'])}")

        # Stage 2 — Key
        log("key", "detecting key …")
        key_result = detect_key(wav_path)
        k = key_result["key"]
        log("key", f"{k['root']} {k['mode_name']}  confidence={k['key_confidence']:.2f}")

        # Stage 3 — Chords
        log("chords", "detecting chord progression …")
        chords_result = detect_chords(wav_path, key_result)
        log("chords", f"fingerprint={chords_result.get('progression_fingerprint', '?')}  chords={len(chords_result.get('chords', []))}")

        # Stage 4 — Pitch
        log("pitch", "analysing pitch ranges per stem …")
        pitch_result = analyze_pitch(stems_dir, key_result)
        log("pitch", "done")

        # Stage 5 — Instruments
        log("instruments", "classifying instruments …")
        instruments_result = classify_instruments(stems_dir)
        log("instruments", "done")

        # Stage 6 — Dynamics
        log("dynamics", "computing dynamics (RMS, LUFS, brightness, density) …")
        dynamics_result = compute_dynamics(wav_path, stems_dir)
        log("dynamics", "done")

        # Stage 7 — Tension
        log("tension", "computing tension curve …")
        tension_result = compute_tension(chords_result, pitch_result, dynamics_result)
        log("tension", f"points={len(tension_result)}")

        # Stage 8 — Aggregate
        log("aggregate", "comparing sections and generating transposition suggestions …")
        aggregate_result = aggregate(structure, key_result, chords_result, pitch_result, dynamics_result, tension_result)
        log("aggregate", "done")

        # Merge stems
        stems = {**instruments_result}
        if pitch_result.get("pitch_ranges"):
            for stem_name, pitch_data in pitch_result["pitch_ranges"].items():
                stems.setdefault(stem_name, {})["pitch_range"] = pitch_data

        return {
            "filename": audio_path.name,
            "duration_sec": duration,
            "key": key_result["key"],
            "bpm": structure["bpm"],
            "time_signature": structure["time_signature"],
            "beats_count": len(structure["beats"]),
            "downbeats_count": len(structure["downbeats"]),
            "sections": structure["sections"],
            "harmonic": chords_result,
            "stems": stems,
            "pitch_class_histogram": pitch_result.get("pitch_class_histogram", {}),
            "dynamics_summary": {
                k: f"{len(v)} points" for k, v in dynamics_result.items()
            },
            "tension_curve_points": len(tension_result),
            "section_comparison": aggregate_result["section_comparison"],
            "transposition": aggregate_result["transposition"],
        }
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: .venv/bin/python scripts/run_pipeline.py <audio_file>")
        sys.exit(1)

    audio_path = Path(sys.argv[1]).resolve()
    if not audio_path.exists():
        print(f"File not found: {audio_path}")
        sys.exit(1)

    print(f"\n=== Music Analysis Pipeline ===")
    print(f"Input: {audio_path}\n")

    result = run(audio_path)

    print("\n=== RESULT ===")
    print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    main()
