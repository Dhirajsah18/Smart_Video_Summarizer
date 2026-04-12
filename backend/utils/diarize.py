import os
from collections import Counter


_PYANNOTE_PIPELINE = None
_PYANNOTE_PIPELINE_TOKEN = None


def _speaker_label(raw_speaker):
    text = str(raw_speaker or "").strip()
    if not text:
        return "SPEAKER_01"
    cleaned = text.upper().replace(" ", "_")
    if cleaned.startswith("SPEAKER_"):
        return cleaned
    return f"SPEAKER_{cleaned}"


def _fallback_single_speaker(segments, reason):
    updated_segments = []
    for item in segments:
        segment = dict(item)
        segment["speaker"] = "SPEAKER_01"
        updated_segments.append(segment)

    total_duration = sum(max(0.0, float(item.get("end", 0.0)) - float(item.get("start", 0.0))) for item in segments)
    return {
        "enabled": True,
        "method": "single-speaker-fallback",
        "available": False,
        "warning": reason,
        "speakers": [
            {
                "speaker": "SPEAKER_01",
                "segments": len(updated_segments),
                "duration_sec": round(total_duration, 2),
            }
        ],
        "segments": updated_segments,
    }


def _load_pyannote_pipeline():
    global _PYANNOTE_PIPELINE
    global _PYANNOTE_PIPELINE_TOKEN

    token = (os.getenv("PYANNOTE_TOKEN", "").strip() or os.getenv("HUGGINGFACE_TOKEN", "").strip())
    if not token:
        raise RuntimeError("PYANNOTE_TOKEN or HUGGINGFACE_TOKEN is required for pyannote diarization.")

    if _PYANNOTE_PIPELINE is not None and _PYANNOTE_PIPELINE_TOKEN == token:
        return _PYANNOTE_PIPELINE

    try:
        from pyannote.audio import Pipeline
    except Exception as exc:
        raise RuntimeError("pyannote.audio is not installed. Install it to enable model-based diarization.") from exc

    pipeline = Pipeline.from_pretrained("pyannote/speaker-diarization", use_auth_token=token)
    _PYANNOTE_PIPELINE = pipeline
    _PYANNOTE_PIPELINE_TOKEN = token
    return pipeline


def _run_pyannote(audio_path):
    pipeline = _load_pyannote_pipeline()
    diarization = pipeline(audio_path)

    turns = []
    for turn, _, speaker in diarization.itertracks(yield_label=True):
        turns.append(
            {
                "start": float(turn.start),
                "end": float(turn.end),
                "speaker": _speaker_label(speaker),
            }
        )

    if not turns:
        raise RuntimeError("pyannote did not return any speaker turns.")

    return turns


def _overlap_duration(a_start, a_end, b_start, b_end):
    return max(0.0, min(a_end, b_end) - max(a_start, b_start))


def _assign_speakers_to_segments(segments, turns):
    updated_segments = []
    for item in segments:
        segment = dict(item)
        start = float(segment.get("start", 0.0))
        end = float(segment.get("end", start))
        if end <= start:
            segment["speaker"] = "SPEAKER_01"
            updated_segments.append(segment)
            continue

        overlap_by_speaker = Counter()
        for turn in turns:
            overlap = _overlap_duration(start, end, turn["start"], turn["end"])
            if overlap > 0:
                overlap_by_speaker[turn["speaker"]] += overlap

        if overlap_by_speaker:
            segment["speaker"] = overlap_by_speaker.most_common(1)[0][0]
        else:
            nearest = min(turns, key=lambda turn: abs(turn["start"] - start))
            segment["speaker"] = nearest["speaker"]

        updated_segments.append(segment)

    return updated_segments


def _summarize_speakers(segments):
    stats = {}
    for item in segments:
        speaker = str(item.get("speaker") or "SPEAKER_01")
        duration = max(0.0, float(item.get("end", 0.0)) - float(item.get("start", 0.0)))
        if speaker not in stats:
            stats[speaker] = {"segments": 0, "duration_sec": 0.0}
        stats[speaker]["segments"] += 1
        stats[speaker]["duration_sec"] += duration

    ordered = sorted(stats.items(), key=lambda kv: kv[1]["duration_sec"], reverse=True)
    return [
        {
            "speaker": speaker,
            "segments": values["segments"],
            "duration_sec": round(values["duration_sec"], 2),
        }
        for speaker, values in ordered
    ]


def add_speaker_diarization(transcript_segments, audio_path, enabled=True):
    segments = list(transcript_segments or [])
    if not enabled:
        return {
            "enabled": False,
            "method": "disabled",
            "available": False,
            "warning": None,
            "speakers": [],
            "segments": segments,
        }

    if not segments:
        return {
            "enabled": True,
            "method": "no-segments",
            "available": False,
            "warning": "No transcript segments available for diarization.",
            "speakers": [],
            "segments": segments,
        }

    if len(segments) < 2:
        return _fallback_single_speaker(segments, "Transcript is too short for multi-speaker diarization.")

    try:
        turns = _run_pyannote(audio_path)
        updated_segments = _assign_speakers_to_segments(segments, turns)
        speakers = _summarize_speakers(updated_segments)
        return {
            "enabled": True,
            "method": "pyannote",
            "available": True,
            "warning": None,
            "speakers": speakers,
            "segments": updated_segments,
        }
    except Exception as exc:
        return _fallback_single_speaker(segments, str(exc))