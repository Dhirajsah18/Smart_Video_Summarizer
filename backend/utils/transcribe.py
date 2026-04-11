import os
import re

import torch
import whisper

DEFAULT_MODEL_NAME = os.getenv("WHISPER_MODEL", "tiny").strip() or "tiny"
ENGLISH_MODEL_NAME = os.getenv("WHISPER_ENGLISH_MODEL", "tiny.en").strip() or "tiny.en"
WHISPER_BEAM_SIZE = max(1, int(os.getenv("WHISPER_BEAM_SIZE", "1")))
WHISPER_BEST_OF = max(1, int(os.getenv("WHISPER_BEST_OF", "1")))
WHISPER_CPU_THREADS = max(0, int(os.getenv("WHISPER_CPU_THREADS", "0")))
WHISPER_HINGLISH_PROMPT = (
    os.getenv(
        "WHISPER_HINGLISH_PROMPT",
        "This audio can contain Hindi and English code-switching (Hinglish). Keep words accurate.",
    ).strip()
    or "This audio can contain Hindi and English code-switching (Hinglish). Keep words accurate."
)

_models = {}

if WHISPER_CPU_THREADS > 0:
    torch.set_num_threads(WHISPER_CPU_THREADS)


def _resolve_model_name(task="translate", language=None):
    normalized_task = (task or "translate").strip().lower()
    normalized_language = (language or "").strip().lower()

    # Use the smaller English-only model when possible for noticeably faster decoding.
    if normalized_task == "transcribe" and normalized_language == "en":
        return ENGLISH_MODEL_NAME

    return DEFAULT_MODEL_NAME


def get_model(task="translate", language=None):
    model_name = _resolve_model_name(task=task, language=language)
    model = _models.get(model_name)
    if model is None:
        model = whisper.load_model(model_name)
        _models[model_name] = model
    return model


def transcribe_audio(audio_path, task="translate", language=None):
    model = get_model(task=task, language=language)
    base_options = {
        "task": task,
        "fp16": False,
        "verbose": False,
        "condition_on_previous_text": False,
        "beam_size": WHISPER_BEAM_SIZE,
        "best_of": WHISPER_BEST_OF,
        "temperature": (0.0, 0.2, 0.4),
        "compression_ratio_threshold": 2.4,
        "no_speech_threshold": 0.55,
        "logprob_threshold": -1.0,
        "initial_prompt": WHISPER_HINGLISH_PROMPT,
    }

    options = dict(base_options)
    if language:
        options["language"] = language

    result = model.transcribe(audio_path, **options)

    def _letters_ratio(text):
        cleaned = re.sub(r"\s+", "", text or "")
        if not cleaned:
            return 0.0
        letters = re.findall(r"[A-Za-z\u0900-\u097F]", cleaned)
        return len(letters) / max(1, len(cleaned))

    def _score_candidate(candidate):
        text = (candidate.get("text", "") or "").strip()
        if not text:
            return 0.0
        words = len(re.findall(r"[A-Za-z\u0900-\u097F0-9']+", text))
        unique_chars = len(set(text.lower()))
        char_quality = _letters_ratio(text)
        # Prefer longer, readable, less repetitive transcripts.
        return (words * 1.8) + (unique_chars * 0.12) + (char_quality * 25)

    # For auto language, Whisper can drift on code-switched Indian speech.
    # Retry with explicit Hindi and English hints and keep the best candidate.
    if not language and task in {"transcribe", "translate"}:
        candidates = [result]
        for hinted_lang in ("hi", "en"):
            retry_options = dict(base_options)
            retry_options["language"] = hinted_lang
            retry_result = model.transcribe(audio_path, **retry_options)
            candidates.append(retry_result)

        result = max(candidates, key=_score_candidate)

    segments = []
    for segment in result.get("segments", []):
        segments.append(
            {
                "start": float(segment.get("start", 0.0)),
                "end": float(segment.get("end", 0.0)),
                "text": (segment.get("text", "") or "").strip(),
            }
        )

    return {
        "text": (result.get("text", "") or "").strip(),
        "language": result.get("language"),
        "segments": segments,
    }
