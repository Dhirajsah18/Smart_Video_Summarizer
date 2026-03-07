from transformers import pipeline

summarizer = pipeline("summarization", model="facebook/bart-large-cnn")


def summarize_text(text, summary_length="medium", summary_style="general"):
    words = text.split()
    if not words:
        return "No speech detected in the uploaded video."

    length_map = {
        "short": {"chunk_size": 250, "max_length": 90, "min_length": 35},
        "medium": {"chunk_size": 350, "max_length": 150, "min_length": 60},
        "long": {"chunk_size": 450, "max_length": 220, "min_length": 90},
    }
    config = length_map.get(summary_length, length_map["medium"])
    chunk_size = config["chunk_size"]

    chunks = []
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i : i + chunk_size])
        chunks.append(chunk)

    # BART summarization does not support style control directly, so we keep this
    # placeholder for response metadata consistency and future custom prompting.
    _ = summary_style

    summary = []
    for chunk in chunks:
        result = summarizer(
            chunk,
            max_length=config["max_length"],
            min_length=config["min_length"],
            do_sample=False,
        )
        summary.append(result[0]["summary_text"])

    return " ".join(summary).strip()


def generate_time_key_points(segments, max_points=8, window_seconds=120):
    if not segments:
        return []

    grouped = []
    current_group = []
    group_start = None

    for segment in segments:
        start = float(segment.get("start", 0.0))
        end = float(segment.get("end", start))
        text = (segment.get("text", "") or "").strip()
        if not text:
            continue

        if group_start is None:
            group_start = start

        if (start - group_start) >= window_seconds and current_group:
            grouped.append(current_group)
            current_group = []
            group_start = start

        current_group.append({"start": start, "end": end, "text": text})

    if current_group:
        grouped.append(current_group)

    points = []
    for group in grouped[:max_points]:
        start = group[0]["start"]
        end = group[-1]["end"]
        chunk_text = " ".join(item["text"] for item in group).strip()
        if not chunk_text:
            continue

        words = chunk_text.split()
        if len(words) > 380:
            chunk_text = " ".join(words[:380])

        word_count = len(chunk_text.split())
        if word_count < 25:
            point_text = chunk_text
        else:
            result = summarizer(
                chunk_text,
                max_length=70,
                min_length=22,
                do_sample=False,
            )
            point_text = result[0]["summary_text"].strip()

        points.append(
            {
                "start": round(start, 2),
                "end": round(end, 2),
                "point": point_text,
            }
        )

    return points
