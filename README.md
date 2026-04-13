# Smart Video Summarizer

AI-powered full-stack app that uploads a video, extracts speech, generates a summary, and supports transcript-grounded Q&A with export options.

## What It Does

- Upload a video from the web UI and process it through the backend pipeline.
- Extract audio, transcribe or translate speech with Whisper, and summarize the result.
- Generate time-based key points and suggested follow-up questions.
- Answer questions using the uploaded video transcript as grounded context.
- Optionally run content moderation before processing.
- Export the final result as TXT, PDF, or DOCX.

## Features

- Transcription modes: `translate` for English output and `transcribe` for original-language output.
- Source language hint support with `auto` or a 2-letter code such as `hi` or `fr`.
- Summary lengths: `short`, `medium`, and `long`.
- Summary styles: `general`, `business`, `student`, and `casual`.
- Optional speaker diarization with speaker labels in the transcript.
- Time-based key points with readable timestamps.
- Suggested follow-up questions generated from the summary and transcript.
- Job polling for async processing so long videos can run in the background.
- Job history stored in SQLite under `backend/outputs/job_history.sqlite3`.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Axios
- Backend: FastAPI, Uvicorn, Python
- AI/ML: Whisper, Hugging Face Transformers, SentencePiece, PyTorch
- Media tools: FFmpeg, MoviePy

## Project Layout

```text
AI-video_summarizer/
|-- backend/
|   |-- main.py
|   |-- requirements.txt
|   |-- uploads/
|   |-- outputs/
|   `-- utils/
|       |-- diarize.py
|       |-- extract_audio.py
|       |-- job_store.py
|       |-- moderation.py
|       |-- rag.py
|       |-- summarize.py
|       `-- transcribe.py
|-- frontend/
|   |-- package.json
|   |-- vite.config.js
|   `-- src/
`-- README.md
```

## Requirements

- Python 3.10 or newer
- Node.js 18 or newer
- FFmpeg available on PATH

Check FFmpeg:

```powershell
ffmpeg -version
```

## Setup

### 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Backend health check:

```text
GET http://127.0.0.1:8000/
```

### 2. Frontend

Open a new terminal:

```powershell
cd frontend
npm install
npm run dev
```

By default the frontend talks to `http://127.0.0.1:8000`. To change it, set `VITE_API_URL` (or `VITE_API_BASE_URL`) in the frontend environment.

## Configuration

Useful backend environment variables:

- `ALLOWED_ORIGINS`: CORS allowlist, default `http://localhost:5173`
- `ALLOWED_ORIGIN_REGEX`: optional regex for dynamic origins (for example Vercel preview URLs)
- `ASYNC_VIDEO_PROCESSING`: queue video jobs in the background, default `true`
- `VIDEO_PROCESSING_WORKERS`: worker count for async jobs, default `2`
- `CONTENT_MODERATION_ENABLED`: enable moderation service calls, default `false`
- `CONTENT_MODERATION_API_URL`: moderation service URL
- `CONTENT_MODERATION_API_KEY`: moderation service API key
- `CONTENT_MODERATION_THRESHOLD`: moderation confidence threshold, default `0.65`
- `CONTENT_MODERATION_FRAME_INTERVAL_SECONDS`: frame sampling interval, default `4`
- `CONTENT_MODERATION_MAX_FRAMES`: max frames to inspect, default `6`
- `CONTENT_MODERATION_TIMEOUT_SECONDS`: moderation request timeout, default `20`
- `CONTENT_MODERATION_ALLOW_BYPASS`: allow processing when moderation is disabled, default `true`
- `WHISPER_MODEL`: Whisper model name, default `tiny`
- `WHISPER_ENGLISH_MODEL`: English-only Whisper model, default `tiny.en`
- `WHISPER_BEAM_SIZE`: Whisper beam size, default `1`
- `WHISPER_BEST_OF`: Whisper best-of count, default `1`
- `WHISPER_CPU_THREADS`: optional CPU thread limit
- `WHISPER_HINGLISH_PROMPT`: custom prompt for code-switched speech
- `SUMMARIZER_MODEL`: summarization model, default `sshleifer/distilbart-cnn-12-6`
- `FAST_SUMMARY_TRIGGER_WORDS`: use extractive fast path above this word count, default `1800`
- `FAST_KEY_POINT_TRIGGER_SEGMENTS`: use fast key-point path above this segment count, default `40`
- `PYANNOTE_TOKEN` or `HUGGINGFACE_TOKEN`: optional token for speaker diarization

## API Endpoints

- `GET /`: simple backend health response
- `POST /process-video`: upload and process a video
- `GET /video-jobs/{job_id}`: fetch job progress and result
- `GET /video-jobs`: list recent jobs
- `POST /ask-video`: ask a question against the transcript

## Notes

- Uploaded files are written to `backend/uploads/` during processing and cleaned up after the job finishes.
- Generated artifacts and job history live under `backend/outputs/`.
- Long videos can take a while; use the job status endpoint if the frontend shows a queued state.

## Troubleshooting

- If transcription fails immediately, verify FFmpeg is installed and reachable from the backend process.
- If diarization is enabled but unavailable, add a valid Hugging Face or PyAnnote token.
