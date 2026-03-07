# AI Video Summarizer

An AI-powered web application that automatically converts long videos into concise and meaningful summaries using modern Speech Recognition and Natural Language Processing models.

---

## Current Features (Implemented)

- Upload video files (MP4)
- High-accuracy speech-to-text using OpenAI Whisper
- Multi-language speech handling (auto-detect + source-language hint)
- Translate non-English speech (for example French) into English before summarization
- Indian language friendly flow (Hindi, Bengali, Tamil, Telugu, Marathi, and more)
- Optional content moderation layer (scan sampled video frames before ASR)
- Abstractive text summarization using BART
- Clean text summary output
- Simple, responsive frontend

---

## Tech Stack (Current)

## Frontend
- React.js
- Vite
- Tailwind CSS

### Backend
- Python
- FastAPI

### AI / ML
- OpenAI Whisper (ASR)
- BART (`facebook`)
- Hugging Face Transformers

---

## Application Workflow

1. User uploads a video file
2. Backend runs content moderation on sampled frames (if enabled)
3. Backend extracts audio from the video
4. Whisper transcribes audio (or translates it to English when selected)
5. Transcript is cleaned and chunked
6. BART generates an abstractive summary
7. Results are sent back to the frontend

---
## Structure
```
AI-video_summarizer/
├── backend/
│ ├── utils/
│ ├── main.py
│ ├── requirements.txt
│ └── .env.example
│
├── frontend/
│ ├── public/
│ ├── src/
│ ├── index.html
│ ├── package.json
│ └── vite.config.js
│
├── .gitignore
└── README.md
```
---
## Screenshots
### Frontend
![frontend](https://github.com/user-attachments/assets/d7104ccb-dc25-45a3-8d44-19edaafedec1)

### Output
![output](https://github.com/user-attachments/assets/01d844e4-b308-4edb-8154-972287f0fa2b)

---

## Installation & Execution

### 1. Clone the Repository
```bash
git clone https://github.com/Dhirajsah18/AI-video_summarizer.git
cd AI-video_summarizer
```
### 2. Backend Setup
```bash
cd backend
python -m venv venv
source : venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn main:app --reload

```
### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev

```
