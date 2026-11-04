"""Copies the videos the site plays into site/public/media (outside git), from what video/ferramentas/todos.py rendered.

    python site/ferramentas/midia.py

- hero-en.mp4 / hero-pt.mp4: the horizontal video of the four apps (youtube-todos, youtube-todos-pt), 1600 px wide,
  light enough for a page (CRF 27, AAC 96k, moov at the start), and hero.jpg (its cover, also the og:image).
- <app>-<en|pt>.mp4 and .jpg: the setup's light copies (720p, ~1 MB), as they are.
"""
import shutil
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent.parent  # desktop-glow
SAIDA = RAIZ / "video" / "saida"
MEDIA = RAIZ / "site" / "public" / "media"
APPS = ["ilha", "relogio", "fundovivo", "cursores"]


def leve(origem: Path, destino: Path):
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(origem), "-vf", "scale=1600:-2:flags=lanczos", "-c:v", "libx264",
                    "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart",
                    str(destino)], check=True)


def main():
    MEDIA.mkdir(parents=True, exist_ok=True)
    faltam = []
    for lingua, roteiro in (("en", "youtube-todos"), ("pt", "youtube-todos-pt")):
        mp4 = SAIDA / f"{roteiro}-16x9-youtube.mp4"
        if not mp4.exists():
            faltam.append(mp4.name)
            continue
        leve(mp4, MEDIA / f"hero-{lingua}.mp4")
        if lingua == "en":
            capa = SAIDA / f"{roteiro}-16x9-capa.jpg"
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(capa), "-vf", "scale=1600:-2", "-q:v", "3", str(MEDIA / "hero.jpg")], check=True)
    for app in APPS:
        for lingua in ("en", "pt"):
            for ext in ("mp4", "jpg"):
                f = SAIDA / "setup" / f"{app}-{lingua}.{ext}"
                if f.exists():
                    shutil.copy(f, MEDIA / f.name)
                else:
                    faltam.append(f"setup/{f.name}")
    total = sum(f.stat().st_size for f in MEDIA.iterdir()) / 1e6
    print(f"{len(list(MEDIA.iterdir()))} files in {MEDIA} ({total:.1f} MB)")
    if faltam:
        sys.exit("missing (run python video/ferramentas/todos.py first): " + ", ".join(faltam))


if __name__ == "__main__":
    main()
