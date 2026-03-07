import whisper

_model = None 

def get_model():
    global _model 
    if _model is None:
        _model = whisper.load_model("base")
    return _model


def transcribe_audio(audio_path, task="translate", language=None):
    model = get_model()
    options = {"task": task}
    if language:
        options["language"] = language

    result = model.transcribe(audio_path, **options)
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
