"""Renders the pack's videos, one script of roteiros/ at a time (the model's tools read src/roteiro.json).

    python ferramentas/todos.py                    # all 14
    python ferramentas/todos.py setup-ilha-en      # only these (names of roteiros/*.json, without .json)
    python ferramentas/todos.py --folhas           # only the contact sheets, quadros/folha-<name>.jpg

For each one: copies the script to src/roteiro.json, makes its music track at its length (sons.py), renders with
entregar.py (TikTok ones with the "social" preset, the rest "youtube") and, for the setup-* ones, also writes the
light copy the installer plays: saida/setup/<app>-<lang>.mp4 (720p) and .jpg (poster). Ends with
src/roteiro.json back on youtube-todos, the one the Studio opens.
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ROTEIROS = RAIZ / "roteiros"
ATIVO = RAIZ / "src" / "roteiro.json"
SAIDA = RAIZ / "saida"
SETUP = SAIDA / "setup"
PY = sys.executable


def rodar(*args: str):
    r = subprocess.run([PY, *args], cwd=RAIZ)
    if r.returncode != 0:
        sys.exit(f"failed: {' '.join(args)}")


def slug(texto: str) -> str:
    sys.path.insert(0, str(RAIZ / "ferramentas"))
    from comum import slug as s  # the same name entregar.py gives the files
    return s(texto)


def um(nome: str, so_folha: bool):
    r = json.loads((ROTEIROS / f"{nome}.json").read_text(encoding="utf-8"))
    shutil.copy(ROTEIROS / f"{nome}.json", ATIVO)
    formato = r["formatos"][0]
    if so_folha:
        rodar("ferramentas/quadros.py", formato, "15")
        shutil.move(RAIZ / "quadros" / f"folha-{formato}.jpg", RAIZ / "quadros" / f"folha-{nome}.jpg")
        return
    rodar("ferramentas/sons.py")
    preset = "social" if formato == "9x16" else "youtube"
    rodar("ferramentas/entregar.py", formato, "--preset", preset)
    if nome.startswith("setup-"):
        SETUP.mkdir(parents=True, exist_ok=True)
        base = f"{slug(r['titulo'])}-{formato}"
        mp4 = SAIDA / f"{base}-{preset}.mp4"
        app, lingua = r["app"], r["lingua"]
        # small enough to ride inside the installer: 720p, plain AAC, moov at the start
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(mp4), "-vf", "scale=1280:720:flags=lanczos", "-c:v", "libx264",
                        "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart",
                        str(SETUP / f"{app}-{lingua}.mp4")], check=True)
        capa = SAIDA / f"{base}-capa.jpg"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(capa), "-vf", "scale=1280:720", "-q:v", "4", str(SETUP / f"{app}-{lingua}.jpg")], check=True)
        print(f"setup copy: {app}-{lingua}.mp4 ({(SETUP / f'{app}-{lingua}.mp4').stat().st_size / 1e6:.1f} MB)")


def main():
    so_folha = "--folhas" in sys.argv
    nomes = [a for a in sys.argv[1:] if not a.startswith("--")] or sorted(p.stem for p in ROTEIROS.glob("*.json"))
    try:
        for nome in nomes:
            print(f"==== {nome}", flush=True)
            um(nome, so_folha)
    finally:
        shutil.copy(ROTEIROS / "youtube-todos.json", ATIVO)


if __name__ == "__main__":
    main()
