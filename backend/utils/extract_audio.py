import subprocess


def _run_ffmpeg_extract(cmd):
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Audio extraction failed: {result.stderr.strip()}")


def _build_command(video_path, output_path, audio_filter=None):
    cmd = [
        "ffmpeg",
        "-i",
        video_path,
        "-vn",
        "-acodec",
        "pcm_s16le",
        "-ar",
        "16000",
        "-ac",
        "1",
    ]
    if audio_filter:
        cmd.extend(["-af", audio_filter])
    cmd.extend([output_path, "-y"])
    return cmd

def extract_audio(video_path, output_path):
    audio_filter = (
        "highpass=f=70,lowpass=f=7800,aresample=16000"
        " ,dynaudnorm=f=120:g=12:p=0.92"
    ).replace(" ", "")

    filtered_cmd = _build_command(video_path, output_path, audio_filter=audio_filter)
    try:
        _run_ffmpeg_extract(filtered_cmd)
    except RuntimeError:
        fallback_cmd = _build_command(video_path, output_path)
        _run_ffmpeg_extract(fallback_cmd)
    return output_path
