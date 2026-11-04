"""Narration for his own Reels video (he edits it in After Effects), from video/tts/roteiro-reels.txt.

    python ferramentas/tts_reels.py            # the Edge voices (needs internet; the .venv with edge-tts)
    python ferramentas/tts_reels.py --kokoro   # also the local model, Kokoro, on this PC

Each take goes to saida/tts/: an .mp3 as the voice gave it and a .wav at 48 kHz, 24 bit, normalized to -16 LUFS with
the peak under -1.5 dBTP, ready for After Effects (the Reels mix sits around -14 LUFS once music and effects are in).
A pause of a line break in the text becomes a short silence.
"""
import asyncio
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEXT = ROOT / "tts" / "roteiro-reels.txt"
OUT = ROOT / "saida" / "tts"
VENV = ROOT / ".venv" / "Scripts" / "python.exe"

EDGE = [
    ("thalita", "pt-BR-ThalitaMultilingualNeural", "+4%"),
    ("francisca", "pt-BR-FranciscaNeural", "+6%"),
    ("antonio", "pt-BR-AntonioNeural", "+4%"),
]


def finish(raw: Path, name: str):
    """48 kHz / 24 bit wav, two-pass loudness to -16 LUFS."""
    wav = OUT / f"{name}.wav"
    first = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(raw), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                           capture_output=True, text=True)
    log = first.stderr[first.stderr.rindex("{"):first.stderr.rindex("}") + 1]
    import json
    m = json.loads(log)
    af = (f"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
          f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(raw), "-af", af, "-ar", "48000", "-c:a", "pcm_s24le", str(wav)], check=True)
    secs = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(wav)],
                                capture_output=True, text=True).stdout)
    print(f"  {wav.name}  {secs:4.1f} s")


async def edge():
    try:
        import edge_tts
    except ImportError:
        sys.exit(subprocess.call([str(VENV), __file__, *sys.argv[1:]]))
    text = TEXT.read_text(encoding="utf-8").strip()
    # a line break is a breath: SSML is not accepted by the free voice, so the lines join with a sentence pause
    spoken = " ".join(line.strip() for line in text.splitlines() if line.strip())
    for name, voice, rate in EDGE:
        mp3 = OUT / f"edge-{name}.mp3"
        await edge_tts.Communicate(spoken, voice, rate=rate).save(str(mp3))
        finish(mp3, f"edge-{name}")


def kokoro():
    from kokoro_onnx import Kokoro  # in the .venv-kokoro, see ferramentas/tts_kokoro_instalar.txt
    import soundfile as sf

    models = ROOT / "tts" / "kokoro"
    k = Kokoro(str(models / "kokoro-v1.0.onnx"), str(models / "voices-v1.0.bin"))
    text = TEXT.read_text(encoding="utf-8").strip()
    for voice in ("pf_dora", "pm_alex", "pm_santa"):
        samples, rate = k.create(" ".join(text.splitlines()), voice=voice, speed=1.0, lang="pt-br")
        raw = OUT / f"kokoro-{voice}.wav.tmp.wav"
        sf.write(raw, samples, rate)
        finish(raw, f"kokoro-{voice}")
        raw.unlink()


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    if "--kokoro" in sys.argv and "--so-kokoro" in sys.argv:
        kokoro()
    else:
        asyncio.run(edge())
        if "--kokoro" in sys.argv:
            kokoro()
    print("pronto:", OUT)
