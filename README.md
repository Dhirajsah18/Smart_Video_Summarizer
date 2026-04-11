# Smart Video Summarizer

AI-powered full-stack app that takes a video, extracts speech, generates a clean summary, and supports grounded Q&A from the transcript.

## Features

- Upload video files from the web UI
- Speech-to-text with OpenAI Whisper
- Two transcription modes: `translate` (to English) and `transcribe` (original language)
- Source language hint support (`auto` or 2-letter code like `hi`, `fr`)
- Multiple summary lengths (`short`, `medium`, `long`)
- Multiple summary styles (`general`, `business`, `student`, `casual`)
- Time-based key points with timestamps
- Suggested follow-up questions
- Transcript-grounded question answering endpoint
- Optional frame-based content moderation before processing
- Export options in UI (TXT, PDF, DOCX)

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Axios
- Backend: FastAPI, Uvicorn, Python
- AI/ML: Whisper, Hugging Face Transformers (DistilBART default)
- Media tools: FFmpeg, MoviePy

## Project Structure

```text
AI-video_summarizer/
|-- backend/
|   |-- main.py
|   |-- requirements.txt
|   |-- uploads/
|   |-- outputs/
|   `-- utils/
|       |-- extract_audio.py
|       |-- moderation.py
|       |-- rag.py
|       |-- summarize.py
|       `-- transcribe.py
|-- frontend/
|   |-- index.html
|   |-- package.json
|   |-- vite.config.js
|   |-- public/
|   `-- src/
`-- README.md
```

## How It Works

1. User uploads a video in frontend.
2. Backend optionally runs moderation on sampled frames.
3. Audio is extracted from video using FFmpeg/MoviePy.
4. Whisper transcribes or translates audio.
5. Summary is generated based on selected length/style.
6. Time key points and suggested questions are prepared.
7. Frontend shows summary, transcript, and Q&A panel.

## Prerequisites

- Python 3.10+
- Node.js 18+
- FFmpeg installed and available in PATH

Check FFmpeg:

```bash
ffmpeg -version
```

## Setup and Run

### 1. Clone

```bash
git clone https://github.com/Dhirajsah18/AI-video_summarizer.git
cd AI-video_summarizer
```

### 2. Start Backend (FastAPI)

Windows PowerShell:

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

### 3. Start Frontend (Vite)

In a new terminal:

```powershell
cd frontend
npm install
npm run dev
```

