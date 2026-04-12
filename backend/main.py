import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from utils.diarize import add_speaker_diarization
from utils.extract_audio import extract_audio
from utils.job_store import JobStore
from utils.moderation import (
    ModerationConfigError,
    ModerationRejectedError,
    ModerationRuntimeError,
    run_video_moderation,
)
from utils.rag import answer_question_from_transcript, generate_suggested_questions
from utils.summarize import SUPPORTED_SUMMARY_STYLES, generate_time_key_points, summarize_text
from utils.transcribe import transcribe_audio

app = FastAPI()

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins if origin.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("outputs")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
JOB_STORE = JobStore(OUTPUT_DIR / "job_history.sqlite3")
PROCESSING_EXECUTOR = ThreadPoolExecutor(max_workers=max(1, int(os.getenv("VIDEO_PROCESSING_WORKERS", "2"))))

LANGUAGE_ALIASES = {
    "hinglish": "hi",
    "hi-en": "hi",
    "hindi-english": "hi",
}


def _format_timestamp(seconds):
    total = max(0, int(seconds))
    hours = total // 3600
    minutes = (total % 3600) // 60
    secs = total % 60
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def _parse_bool(value, default=True):
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


ASYNC_VIDEO_PROCESSING = _parse_bool(os.getenv("ASYNC_VIDEO_PROCESSING", "true"), default=True)


def _ensure_moderation_passed(moderation_result):
    if not isinstance(moderation_result, dict):
        raise ModerationRuntimeError("Moderation did not return a valid result.")

    if not moderation_result.get("moderation_passed"):
        raise ModerationRejectedError(
            "Uploaded video failed safety moderation. Please upload a different video."
        )


def _update_job(job_id, **fields):
    try:
        JOB_STORE.update_job(job_id, **fields)
    except Exception:
        pass


def _build_transcript_segments(segments):
    return [
        {
            "start": item["start"],
            "end": item["end"],
            "start_label": _format_timestamp(item["start"]),
            "end_label": _format_timestamp(item["end"]),
            "text": item["text"],
        }
        for item in segments
    ]


def _build_processing_result(*, safe_name, normalized_task, normalized_summary_style, normalized_source_language, include_key_points_enabled, include_speaker_diarization_enabled, transcription_result, moderation_result, speaker_diarization, key_points, summary, transcript_segments, suggested_questions):
    return {
        "status": "success",
        "filename": safe_name,
        "summary": summary,
        "transcription_task": normalized_task,
        "summary_style": normalized_summary_style,
        "source_language": normalized_source_language,
        "include_key_points": include_key_points_enabled,
        "include_speaker_diarization": include_speaker_diarization_enabled,
        "detected_language": transcription_result.get("language"),
        "transcript_text": transcription_result.get("text", ""),
        "transcript_segments": transcript_segments,
        "speaker_diarization": speaker_diarization,
        "time_key_points": key_points,
        "suggested_questions": suggested_questions,
        "moderation": moderation_result,
    }


def _process_video_pipeline(*, job_id, safe_name, video_path, audio_path, normalized_task, normalized_summary_style, normalized_source_language, whisper_language, include_key_points_enabled, include_speaker_diarization_enabled, summary_length):
    moderation_result = None
    transcription_result = None
    summary = ""
    key_points = []
    suggested_questions = []
    transcript_segments = []
    speaker_diarization = {
        "enabled": include_speaker_diarization_enabled,
        "method": "disabled",
        "available": False,
        "warning": None,
        "speakers": [],
    }

    try:
        _update_job(job_id, status="processing", stage="moderating", progress=15)
        moderation_result = run_video_moderation(
            video_path=str(video_path),
            enabled=os.getenv("CONTENT_MODERATION_ENABLED", "false"),
            api_url=os.getenv("CONTENT_MODERATION_API_URL", "").strip(),
            api_key=os.getenv("CONTENT_MODERATION_API_KEY", "").strip() or None,
            threshold=os.getenv("CONTENT_MODERATION_THRESHOLD", "0.65"),
            frame_interval_seconds=os.getenv("CONTENT_MODERATION_FRAME_INTERVAL_SECONDS", "4"),
            max_frames=os.getenv("CONTENT_MODERATION_MAX_FRAMES", "6"),
            timeout_seconds=os.getenv("CONTENT_MODERATION_TIMEOUT_SECONDS", "20"),
        )
        _ensure_moderation_passed(moderation_result)

        _update_job(job_id, stage="extracting", progress=30)
        extract_audio(str(video_path), str(audio_path))

        _update_job(job_id, stage="transcribing", progress=50)
        transcription_result = transcribe_audio(
            str(audio_path),
            task=normalized_task,
            language=whisper_language,
        )
        text = transcription_result.get("text", "")
        segments = transcription_result.get("segments", [])

        _update_job(job_id, stage="summarizing", progress=75)
        summary = summarize_text(
            text,
            summary_length=summary_length,
            summary_style=normalized_summary_style,
        )
        key_points = generate_time_key_points(segments) if include_key_points_enabled else []
        suggested_questions = generate_suggested_questions(
            summary=summary,
            transcript_segments=segments,
            time_key_points=key_points,
        )
        transcript_segments = _build_transcript_segments(segments)

        _update_job(job_id, stage="diarizing", progress=88)
        speaker_diarization_result = add_speaker_diarization(
            transcript_segments=transcript_segments,
            audio_path=str(audio_path),
            enabled=include_speaker_diarization_enabled,
        )
        transcript_segments = speaker_diarization_result.get("segments", transcript_segments)
        speaker_diarization = {
            "enabled": speaker_diarization_result.get("enabled", include_speaker_diarization_enabled),
            "method": speaker_diarization_result.get("method"),
            "available": speaker_diarization_result.get("available", False),
            "warning": speaker_diarization_result.get("warning"),
            "speakers": speaker_diarization_result.get("speakers", []),
        }

        for point in key_points:
            point["start_label"] = _format_timestamp(point["start"])
            point["end_label"] = _format_timestamp(point["end"])

        result = _build_processing_result(
            safe_name=safe_name,
            normalized_task=normalized_task,
            normalized_summary_style=normalized_summary_style,
            normalized_source_language=normalized_source_language,
            include_key_points_enabled=include_key_points_enabled,
            include_speaker_diarization_enabled=include_speaker_diarization_enabled,
            transcription_result=transcription_result,
            moderation_result=moderation_result,
            speaker_diarization=speaker_diarization,
            key_points=key_points,
            summary=summary,
            transcript_segments=transcript_segments,
            suggested_questions=suggested_questions,
        )
        _update_job(job_id, status="completed", stage="completed", progress=100, result=result, error_message=None)
        return result
    except ModerationRejectedError as exc:
        _update_job(job_id, status="failed", stage="moderation_rejected", progress=100, error_message=str(exc))
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ModerationConfigError as exc:
        _update_job(job_id, status="failed", stage="moderation_config_error", progress=100, error_message=str(exc))
        raise HTTPException(status_code=500, detail=f"Moderation configuration error: {exc}") from exc
    except ModerationRuntimeError as exc:
        _update_job(job_id, status="failed", stage="moderation_error", progress=100, error_message=str(exc))
        raise HTTPException(status_code=502, detail=f"Moderation service error: {exc}") from exc
    except RuntimeError as exc:
        raw_error = str(exc)
        lowered_error = raw_error.lower()

        if "moov atom not found" in lowered_error or "invalid data found when processing input" in lowered_error:
            message = "Uploaded video is invalid or incomplete. Please re-export/download and upload again."
            _update_job(job_id, status="failed", stage="video_invalid", progress=100, error_message=message)
            raise HTTPException(status_code=400, detail=message) from exc

        if "no such file or directory" in lowered_error and "ffmpeg" in lowered_error:
            message = "FFmpeg is not installed or not available in PATH on the backend server."
            _update_job(job_id, status="failed", stage="ffmpeg_missing", progress=100, error_message=message)
            raise HTTPException(status_code=500, detail=message) from exc

        message = "Audio extraction failed. Please try another video file."
        _update_job(job_id, status="failed", stage="audio_extraction_failed", progress=100, error_message=message)
        raise HTTPException(status_code=500, detail=message) from exc
    except HTTPException:
        raise
    except Exception as exc:
        message = f"Failed to process video: {exc}"
        _update_job(job_id, status="failed", stage="processing_failed", progress=100, error_message=message)
        raise HTTPException(status_code=500, detail="Failed to process video.") from exc
    finally:
        if video_path.exists():
            video_path.unlink()
        if audio_path.exists():
            audio_path.unlink()


@app.get("/")
def index():
    return {"message": "AI Video Summarization Backend Running!"}


class VideoQuestionRequest(BaseModel):
    question: str
    transcript_text: str = ""
    transcript_segments: list[dict] = []


@app.on_event("startup")
def _startup():
    JOB_STORE._initialize()


@app.on_event("shutdown")
def _shutdown():
    PROCESSING_EXECUTOR.shutdown(wait=False, cancel_futures=False)


@app.post("/process-video")
async def process_video(
    file: UploadFile = File(...),
    summary_length: str = Form("medium"),
    summary_style: str = Form("general"),
    transcription_task: str = Form("translate"),
    source_language: str = Form("auto"),
    include_key_points: str = Form("true"),
    include_speaker_diarization: str = Form("true"),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File name is missing.")

    normalized_task = (transcription_task or "translate").strip().lower()
    if normalized_task not in {"transcribe", "translate"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid transcription_task. Use 'transcribe' or 'translate'.",
        )

    normalized_summary_style = (summary_style or "general").strip().lower()
    if normalized_summary_style not in SUPPORTED_SUMMARY_STYLES:
        supported_styles = ", ".join(sorted(SUPPORTED_SUMMARY_STYLES))
        raise HTTPException(
            status_code=400,
            detail=f"Invalid summary_style. Use one of: {supported_styles}.",
        )

    normalized_source_language = (source_language or "auto").strip().lower()
    normalized_source_language = LANGUAGE_ALIASES.get(normalized_source_language, normalized_source_language)
    if normalized_source_language == "auto":
        whisper_language = None
    else:
        if not normalized_source_language.isalpha() or len(normalized_source_language) != 2:
            raise HTTPException(
                status_code=400,
                detail="Invalid source_language. Use 'auto' or a 2-letter language code like 'fr'.",
            )
        whisper_language = normalized_source_language
    include_key_points_enabled = _parse_bool(include_key_points, default=True)
    include_speaker_diarization_enabled = _parse_bool(include_speaker_diarization, default=True)

    safe_name = Path(file.filename).name
    request_id = uuid4().hex
    video_path = UPLOAD_DIR / f"{request_id}_{safe_name}"
    audio_path = OUTPUT_DIR / f"{request_id}.wav"

    try:
        with video_path.open("wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                buffer.write(chunk)

        JOB_STORE.create_job(
            job_id=request_id,
            filename=safe_name,
            status="queued",
            stage="uploading",
            progress=5,
        )

        if ASYNC_VIDEO_PROCESSING:
            PROCESSING_EXECUTOR.submit(
                _process_video_pipeline,
                job_id=request_id,
                safe_name=safe_name,
                video_path=video_path,
                audio_path=audio_path,
                normalized_task=normalized_task,
                normalized_summary_style=normalized_summary_style,
                normalized_source_language=normalized_source_language,
                whisper_language=whisper_language,
                include_key_points_enabled=include_key_points_enabled,
                include_speaker_diarization_enabled=include_speaker_diarization_enabled,
                summary_length=summary_length,
            )
            return JSONResponse(
                status_code=202,
                content={
                    "status": "queued",
                    "job_id": request_id,
                    "message": "Video upload accepted. Poll the job status endpoint for progress.",
                },
            )

        result = _process_video_pipeline(
            job_id=request_id,
            safe_name=safe_name,
            video_path=video_path,
            audio_path=audio_path,
            normalized_task=normalized_task,
            normalized_summary_style=normalized_summary_style,
            normalized_source_language=normalized_source_language,
            whisper_language=whisper_language,
            include_key_points_enabled=include_key_points_enabled,
            include_speaker_diarization_enabled=include_speaker_diarization_enabled,
            summary_length=summary_length,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to process video.") from exc
    finally:
        await file.close()

    return result


@app.get("/video-jobs/{job_id}")
def get_video_job(job_id: str):
    job = JOB_STORE.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


@app.get("/video-jobs")
def list_video_jobs(limit: int = 20):
    return {"jobs": JOB_STORE.list_jobs(limit=limit)}


@app.post("/ask-video")
def ask_video_question(payload: VideoQuestionRequest):
    try:
        result = answer_question_from_transcript(
            payload.question,
            payload.transcript_text,
            payload.transcript_segments,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to answer the video question.") from exc

    for item in result.get("sources", []):
        item["start_label"] = _format_timestamp(item["start"])
        item["end_label"] = _format_timestamp(item["end"])

    return result
