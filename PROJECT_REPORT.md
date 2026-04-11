# AI Video Summarizer - Project Report

## Title Page

**Project Title:** AI Video Summarizer  
**Project Type:** Full-stack AI web application  
**Domain:** Video understanding, speech processing, summarization, transcript Q&A  
**Frontend:** React + Vite  
**Backend:** FastAPI + Python  
**AI Components:** Whisper, Hugging Face Transformers, rule-based grounded retrieval  

## Abstract

AI Video Summarizer is a full-stack application that converts long video files into useful text outputs: speech transcription, concise summaries, time-based key points, and grounded question answering. The system is designed for users who need to quickly understand lectures, meetings, interviews, tutorials, or any other speech-heavy video without manually watching the entire file.

The application uses a React-based frontend for upload, configuration, progress tracking, and results visualization. A FastAPI backend handles file processing, audio extraction through FFmpeg, speech recognition through Whisper, summary generation through Hugging Face Transformers, and transcript-based question answering. The backend also supports optional frame-based content moderation before processing begins.

The current implementation emphasizes practical performance. It uses lazy-loading for the summarization model, caches Whisper models by name, applies fast extractive fallbacks for long transcripts, and grounds Q&A answers strictly in transcript evidence. The result is a usable, interactive AI workflow that balances accuracy, speed, and safety.

## 1. Introduction

Video has become the dominant medium for communication, education, and knowledge sharing. However, the amount of content users need to process keeps increasing, while the time available to consume it remains limited. Long-form videos are especially expensive to review manually because the important parts are often scattered across the timeline.

This project addresses that problem by automatically converting a video into a structured textual representation. Instead of forcing a user to watch an entire video, the application extracts the spoken content, summarizes it, highlights important time ranges, and allows follow-up questions to be answered from the transcript.

The system is built as a web application so it can be used directly in a browser. The UI is intentionally simple: a user uploads a video, chooses summary preferences, waits for processing, and then receives the summary, transcript, timestamped key points, and Q&A tools in one place.

## 2. Problem Statement

Users often need to extract information from long videos, but video is inherently linear. Searching for one detail usually means scrubbing through the file, guessing timestamps, and replaying sections repeatedly. This becomes inefficient for lectures, webinars, interviews, tutorials, and meeting recordings.

The core problem is therefore not just transcription, but fast understanding. A useful solution must:

- Convert speech into text accurately.
- Reduce the text into a compact and readable summary.
- Preserve references to important timestamps.
- Answer user questions using the actual video content rather than inventing unsupported information.
- Provide a safe and user-friendly workflow.

## 3. Objectives

The project was designed with the following objectives:

- Accept video uploads through a browser-based interface.
- Extract the audio track from the uploaded video.
- Transcribe or translate speech using Whisper.
- Generate short, medium, or long summaries.
- Support summary styles such as general, business, student, and casual.
- Produce time-based key points from transcript segments.
- Detect speaker turns in transcript segments (speaker diarization).
- Offer grounded question answering from transcript evidence.
- Optionally run frame-based content moderation before processing the file.
- Allow exporting results in TXT, PDF, and DOCX formats.

## 4. Scope

The current scope of the project includes a complete local or self-hosted workflow for video summarization and transcript interaction. It is meant for single-file video analysis, not large-scale batch analytics or persistent media management.

Included in scope:

- Single video upload and processing.
- Speech transcription and translation.
- Summary generation.
- Transcript visualization.
- Time-based navigation from timestamps.
- Speaker-attributed transcript segments.
- Transcript-grounded Q&A.
- Optional moderation API integration.
- Async job tracking with persisted status history.

Out of scope in the current implementation:

- User authentication and accounts.
- Multi-user collaboration.
- OCR or visual scene summarization.

## 5. Technology Stack

### Frontend

- React 19
- Vite
- Axios for API calls
- `docx`, `jspdf`, and `file-saver` for exports

### Backend

- FastAPI
- Uvicorn
- Pydantic
- Python standard library utilities

### AI and Media Processing

- OpenAI Whisper for speech recognition and translation
- Hugging Face Transformers for summarization
- FFmpeg for audio extraction and frame sampling

## 6. System Architecture

The project follows a client-server architecture.

### 6.1 Frontend Layer

The React application handles upload, configuration, processing indicators, and results rendering. It also provides the transcript viewer, summary display, question input, and export controls.

### 6.2 API Layer

The FastAPI backend exposes the endpoints used by the frontend. It receives uploaded video files, validates user input, performs the processing pipeline, and returns a structured JSON response.

### 6.3 Processing Pipeline

The backend now accepts the upload, creates a persisted job record, and processes the media in the background:

1. Save uploaded video to disk.
2. Create a job record in the local job store.
3. Submit the media pipeline to a background worker.
4. Poll job status from the frontend.
5. Optionally run content moderation.
6. Extract audio using FFmpeg.
7. Transcribe or translate speech with Whisper.
8. Generate summary text.
9. Derive key points from transcript segments.
10. Build suggested follow-up questions.
11. Return the combined response to the frontend when the job completes.

### 6.4 Q&A Retrieval Layer

The Q&A module uses transcript chunking and scoring to retrieve relevant evidence. If the transcript does not contain enough support for the question, the system abstains instead of producing a weak or hallucinated answer.

## 7. Project Structure

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
|   |-- src/
|   |   |-- App.jsx
|   |   |-- api.js
|   |   |-- index.css
|   |   `-- components/
|   |       |-- AppHeader.jsx
|   |       |-- ProcessingProgress.jsx
|   |       |-- QuestionAnswerPanel.jsx
|   |       |-- ResultsSection.jsx
|   |       `-- UploadSection.jsx
|   `-- package.json
|-- README.md
`-- PROJECT_REPORT.md
```

## 8. Backend Design

The backend entrypoint is [backend/main.py](backend/main.py). It creates the FastAPI app, configures CORS, defines upload/output folders, and exposes the API endpoints.

### 8.1 Input Validation

The `/process-video` endpoint validates:

- The uploaded filename.
- The transcription task, which must be either `transcribe` or `translate`.
- The summary style, which must match one of the supported styles.
- The source language, which must be `auto` or a valid two-letter code.
- The `include_key_points` flag.

### 8.2 File Handling

Uploaded files are written to a temporary path in the `uploads/` folder. A corresponding WAV file is created in `outputs/`. Both files are deleted in the `finally` block after processing, which keeps disk usage under control.

### 8.3 Error Handling

The backend maps common failures to meaningful HTTP responses:

- Invalid inputs return HTTP 400.
- Safety moderation rejection returns HTTP 403.
- Moderation configuration issues return HTTP 500.
- Moderation service failures return HTTP 502.
- FFmpeg and video corruption issues are translated into user-friendly messages.

## 9. Module Breakdown

### 9.1 Audio Extraction

The file [backend/utils/extract_audio.py](backend/utils/extract_audio.py) uses FFmpeg to pull the audio stream from the uploaded video and convert it to mono 16 kHz PCM WAV. This format is suitable for Whisper input and keeps transcription reliable.

### 9.2 Speech Transcription

The file [backend/utils/transcribe.py](backend/utils/transcribe.py) loads Whisper models and caches them in memory. It supports:

- `translate` for English output.
- `transcribe` for original-language speech.
- Language hints for improved accuracy.
- A Hinglish-oriented prompt for mixed-language content.

The implementation also uses performance-oriented defaults such as greedy decoding and optional CPU thread tuning. For auto language detection, it retries with Hindi and English hints and keeps the better transcript candidate.

### 9.3 Summarization

The file [backend/utils/summarize.py](backend/utils/summarize.py) provides both transformer-based and extractive summarization.

Important behaviors:

- The default model is `sshleifer/distilbart-cnn-12-6`.
- The summarizer is lazy-loaded so startup remains lighter.
- Short and medium transcripts use transformer summarization.
- Very long transcripts fall back to a faster extractive ranking path.
- Summary styles reshape the output for general, business, student, or casual use.
- Key points are generated from grouped transcript segments.

### 9.4 Content Moderation

The file [backend/utils/moderation.py](backend/utils/moderation.py) implements optional moderation. When enabled, it extracts frames from the video, encodes them as base64 JPEGs, and sends them to an external moderation API.

The moderation logic is defensive:

- It supports multiple response shapes from external providers.
- It reads flags such as blocked, flagged, is_safe, label, category, or risk score fields.
- If the content is judged unsafe, the upload is rejected before transcription begins.

### 9.5 Transcript Q&A

The file [backend/utils/rag.py](backend/utils/rag.py) implements retrieval-grounded question answering. It does not try to answer every question blindly. Instead, it:

- Splits the transcript into chunks.
- Scores chunks using meaningful token overlap.
- Expands the query slightly for comparative or definitional prompts.
- Picks the most relevant transcript evidence.
- Returns an abstain message when evidence is too weak.

This is useful because it reduces unsupported answers and keeps the response anchored to the actual video transcript.

### 9.6 Speaker Diarization

The backend now supports speaker diarization and enriches transcript segments with speaker labels.

- If `pyannote.audio` and a valid auth token are available, the backend runs model-based diarization.
- If model-based diarization is unavailable, the backend degrades gracefully to a single-speaker fallback so processing does not fail.
- The frontend displays speaker labels inside transcript cards and includes diarization metadata in the response.

## 10. API Endpoints

### `GET /`

Returns a simple health message confirming that the backend is running.

### `POST /process-video`

Consumes multipart form data containing the video file and processing options.

Main request fields:

- `file`
- `summary_length`
- `summary_style`
- `transcription_task`
- `source_language`
- `include_key_points`

Main response fields:

- `summary`
- `transcript_text`
- `transcript_segments`
- `time_key_points`
- `suggested_questions`
- `moderation`
- `detected_language`

### `POST /ask-video`

Accepts a question plus transcript text and transcript segments. Returns a grounded answer with supporting source segments.

Request body:

- `question`
- `transcript_text`
- `transcript_segments`

Response fields:

- `answer`
- `sources`
- `confidence`
- `grounded`

## 11. Frontend Design

The frontend entrypoint is [frontend/src/App.jsx](frontend/src/App.jsx). It coordinates the full user journey.

### 11.1 Upload and Configuration

The upload screen allows users to:

- Select or drag-and-drop a video.
- Choose summary length.
- Choose summary style.
- Select output language behavior.
- Set source language hints.
- Decide whether key points should be generated.

### 11.2 Processing Feedback

The app presents a multi-stage progress indicator so the user can see which processing stage is currently active. This is important because video processing is relatively slow and users need visual feedback while waiting.

### 11.3 Results Dashboard

The results screen shows:

- A video preview player.
- The generated summary.
- Export buttons for TXT, PDF, and DOCX.
- Time-based key points with clickable timestamps.
- Full transcript sections.
- Transcript-grounded question answering.

### 11.4 Export Support

The frontend generates downloadable outputs in three formats:

- TXT using a plain text blob.
- PDF using `jsPDF`.
- DOCX using `docx` and `Packer`.

This makes the application useful not just for viewing but also for reporting and sharing.

## 12. User Flow

1. The user opens the web app.
2. The user uploads a video file.
3. The user selects summary options.
4. The frontend sends the file to the backend.
5. The backend optionally runs moderation.
6. Audio is extracted and transcribed.
7. A summary, key points, and suggestions are generated.
8. The frontend renders the results.
9. The user can ask follow-up questions.
10. The user can export the output in multiple formats.

## 13. Performance Considerations

The codebase includes several practical optimizations:

- Whisper models are cached after the first load.
- The summarizer model is loaded lazily instead of at server startup.
- Long summaries use extractive fast paths to avoid expensive transformer calls.
- Key point generation also uses a faster extractive strategy when transcript size is large.
- The Q&A system avoids low-confidence answers by applying relevance thresholds.

These choices make the app more responsive on ordinary development hardware.

## 14. Safety and Reliability

Safety is handled in two layers:

- Optional content moderation before processing.
- Grounded question answering that abstains when evidence is insufficient.

The moderation layer now also degrades gracefully if the external API is unavailable, so the pipeline can continue in permissive fallback mode instead of hard failing by default.

Reliability is improved by:

- Sanitizing filenames.
- Cleaning up temporary files after processing.
- Converting low-level runtime errors into meaningful HTTP responses.
- Rejecting invalid language and style inputs early.
- Running video processing through a persisted async job flow instead of blocking the upload request.

## 15. Limitations

The current implementation has some clear limitations:

- There is no OCR or visual scene summarization.
- Very long or noisy videos can still reduce transcription quality.

## 16. Future Scope

The project can be extended in several directions:

- Add user accounts and access control.
- Add visual understanding features such as OCR and scene detection.
- Improve export formatting and branded report templates.
- Add automated tests for transcription, summarization, and API validation.
- Add telemetry and processing analytics for long videos.
- Tighten noisy-audio handling with stronger denoising and chunk-level transcription heuristics.

## 17. Conclusion

AI Video Summarizer demonstrates a practical end-to-end workflow for converting videos into usable knowledge. It combines media preprocessing, speech recognition, summarization, moderation, and grounded Q&A into one browser-based application. The design is intentionally focused on clarity and utility rather than unnecessary complexity.

For users, the key value is time saved. For the project, the key achievement is a clean modular architecture that can be extended later with stronger orchestration, richer analytics, and more advanced multimodal understanding.

## 18. References

- FastAPI documentation
- Whisper by OpenAI
- Hugging Face Transformers documentation
- FFmpeg documentation
- React documentation
- Vite documentation
