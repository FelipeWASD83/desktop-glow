"""Renders the pack's videos, one script of roteiros/ at a time (the model's tools read src/roteiro.json).

    python ferramentas/todos.py                    # all of them
    python ferramentas/todos.py setup-ilha-en      # only these (names of roteiros/*.json, without .json)
    python ferramentas/todos.py --folhas           # only the contact sheets, quadros/folha-<name>.jpg

For each one: copies the script to src/roteiro.json, brings back its narration (roteiros/narracao/<name>.json, the
timings of each spoken line; the mp3s live in public/narracao/<name>/), runs narrar.py for what changed, makes the
sound effects (sons.py), renders with entregar.py (TikTok ones with the "social" preset, the rest "youtube") with no
music track (his rule since 03/11/2026: no background track in the videos) and, for the setup-* ones, also writes the
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
NARRACAO_ATIVA = RAIZ / "src" / "narracao.gerado.json"
NARRACOES = ROTEIROS / "narracao"
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


def ativar(nome: str, narrar: bool):
    """Makes this script the active one, with its own narration timings."""
    r = json.loads((ROTEIROS / f"{nome}.json").read_text(encoding="utf-8"))
    shutil.copy(ROTEIROS / f"{nome}.json", ATIVO)
    guardada = NARRACOES / f"{nome}.json"
    if guardada.exists():
        shutil.copy(guardada, NARRACAO_ATIVA)
    else:
        NARRACAO_ATIVA.write_text(json.dumps({"voz": r["voz"]["nome"], "cenas": {}}) + "\n", encoding="utf-8")
    if narrar:
        rodar("ferramentas/narrar.py")
        NARRACOES.mkdir(exist_ok=True)
        shutil.copy(NARRACAO_ATIVA, guardada)
    return r


def um(nome: str, so_folha: bool):
    r = ativar(nome, narrar=True)
    formato = r["formatos"][0]
    if so_folha:
        rodar("ferramentas/quadros.py", formato, "15")
        shutil.move(RAIZ / "quadros" / f"folha-{formato}.jpg", RAIZ / "quadros" / f"folha-{nome}.jpg")
        return
    rodar("ferramentas/sons.py")
    preset = "social" if formato == "9x16" else "youtube"
    rodar("ferramentas/entregar.py", formato, "--preset", preset, "--sem-trilha")
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
    if "--so-narrar" in sys.argv:  # only the voices, to hear them before rendering anything
        try:
            for nome in nomes:
                print(f"==== {nome}", flush=True)
                ativar(nome, narrar=True)
        finally:
            ativar("youtube-todos", narrar=False)
        return
    try:
        for nome in nomes:
            print(f"==== {nome}", flush=True)
            um(nome, so_folha)
    finally:
        ativar("youtube-todos", narrar=False)


if __name__ == "__main__":
    main()
