"""PNGs of every app for his own video in After Effects, in desktop-glow/pngs/ (outside git).

    python ferramentas/pngs.py                      # everything
    python ferramentas/pngs.py logos cursores       # only some parts: logos ilha fundo cursores setup

Run it in a normal terminal: the logos and the island/clock stills are drawn by Edge (Remotion), which does not
open from the Claude app's shell. The island and clock stills switch video/src/roteiro.json, so never run them while
video/ferramentas/todos.py is rendering.

What comes out (transparent where it makes sense):
    logos/<app>.png              the five icons at 1024 px
    ilha/<en|pt>/<state>.png     every island state at 4x, cropped to the pill (and the menu balls)
    relogio/<en|pt>/<view>.png   the Mond Clock with and without the music block, and with the cover controls
    fundo-vivo/<wallpaper>.png   the ten wallpapers of its own at 3840 x 2160 (opaque), and the library window
    cursores/<black|white>/      every pointer at its biggest size; animated ones also as a 60 fps sequence
    setup/<en|pt>/               every installer screen at 2x
"""
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent  # desktop-glow
BASE = ROOT.parent
OUT = ROOT / "pngs"
VIDEO = ROOT / "video"
EDGE = Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")
SVGS = BASE / "_organizacao" / "atalhos" / "icones" / "svg"
LOGOS = {"ilha": "island", "relogio-mond": "mond-clock", "fundo-vivo": "living-wallpaper", "ilha-cursors": "island-cursors", "desktop-glow": "desktop-glow"}

sys.path.insert(0, str(VIDEO / "ferramentas"))


def crop(png: Path, margin: int = 8) -> None:
    im = Image.open(png).convert("RGBA")
    box = im.getchannel("A").getbbox()
    if box:
        l, t, r, b = box
        im.crop((max(0, l - margin), max(0, t - margin), min(im.width, r + margin), min(im.height, b + margin))).save(png)


def logos():
    folder = OUT / "logos"
    folder.mkdir(parents=True, exist_ok=True)
    for app, name in LOGOS.items():
        svg = SVGS / f"{app}.svg"
        with tempfile.TemporaryDirectory() as t:
            html = Path(t) / "i.html"
            html.write_text('<!doctype html><style>html,body{margin:0;background:transparent}img{display:block;width:1024px;height:1024px}</style>'
                            f'<img src="{svg.as_uri()}">', encoding="utf-8")
            subprocess.run([str(EDGE), "--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1024,1024",
                            "--default-background-color=00000000", f"--screenshot={folder / (name + '.png')}", html.as_uri()],
                           check=True, capture_output=True, timeout=60)
        print("logo:", name)


def remotion_stills():
    from todos import ativar  # makes a script the active one (language) with its narration

    import re

    source = (VIDEO / "src" / "recortes.tsx").read_text(encoding="utf-8")
    # the island states are the keys of ILHA ('name': {w: ...}); the other compositions have a fixed id="..."
    ids = [f"ilha-{n}" for n in re.findall(r"^\s*'([a-z-]+)': \{w:", source, flags=re.M)]
    ids += re.findall(r'<Composition id="([a-z-]+)"', source)
    try:
        for lingua, script in (("en", "youtube-todos"), ("pt", "youtube-todos-pt")):
            ativar(script, narrar=False)
            for comp in ids:
                part = "ilha" if comp.startswith("ilha-") else "relogio"
                name = comp.split("-", 1)[1]
                dest = OUT / part / lingua / f"{name}.png"
                dest.parent.mkdir(parents=True, exist_ok=True)
                # relative output: with two quoted arguments "cmd /c" strips the outer quotes and splits at "Claude Code"
                rel = Path(__import__("os").path.relpath(dest, VIDEO)).as_posix()
                r = subprocess.run(["cmd", "/c", str(VIDEO / "node_modules" / ".bin" / "remotion.cmd"), "still", "src/recortes.tsx", comp,
                                    rel, "--image-format=png", "--frame=0", "--log=error"], cwd=VIDEO)
                if r.returncode != 0:
                    sys.exit(f"remotion still failed: {comp}")
                crop(dest)
                print(f"{part}/{lingua}/{name}.png")
    finally:
        ativar("youtube-todos", narrar=False)


def fundo():
    folder = OUT / "fundo-vivo"
    folder.mkdir(parents=True, exist_ok=True)
    # a copy of the app: the Fundo Vivo project may be compiling (its build swaps app\) while this runs
    with tempfile.TemporaryDirectory() as t:
        app = Path(t) / "app"
        shutil.copytree(BASE / "fundo-vivo" / "app", app)
        home = Path(t) / "home"
        (home / "roaming").mkdir(parents=True)
        (home / "roaming" / "config.json").write_text(json.dumps({"scanWallpaperEngine": False}), encoding="utf-8")
        env = {**__import__("os").environ, "FUNDOVIVO_HOME": str(home)}
        for vivo in sorted((app / "examples").glob("*.vivo")):
            png = folder / f"{vivo.stem}.png"
            for _ in range(3):  # the WebView2 behind --vivo-still fails now and then
                if subprocess.run([str(app / "FundoVivo.exe"), "--vivo-still", str(vivo), str(png), "3840", "2160", "3", "0", "som"], env=env).returncode == 0 and png.exists():
                    break
            print("fundo:", png.name)
        subprocess.run([str(app / "FundoVivo.exe"), "--screenshot", str(folder / "biblioteca.png"), "library", "2400", "1500"], env=env, check=True)
        print("fundo: biblioteca.png")


def cursores():
    from capturas import ani, cur_frame

    build = BASE / "ilha-cursors" / "build"
    for variant in ("black", "white"):
        folder = OUT / "cursores" / variant
        folder.mkdir(parents=True, exist_ok=True)
        cur_frame((build / variant / "arrow.cur").read_bytes(), 256).save(folder / "arrow.png")
        for a in sorted((build / variant).glob("*.ani")):
            frames, steps = ani(a)
            cur_frame(frames[steps[-1][0]]).save(folder / f"{a.stem}.png")  # the shape it settles on
            # each frame once, in the order Windows plays them, at 60 fps: the morphing pointers are 17 frames and then
            # hold the last one for a day (5,184,000 jiffies); busy and working loop the same turn for minutes
            seq = folder / f"{a.stem}-sequencia"
            seq.mkdir(exist_ok=True)
            seen = []
            for idx, _jiffies in steps:
                if idx in seen:
                    break
                seen.append(idx)
            for q, idx in enumerate(seen):
                cur_frame(frames[idx]).save(seq / f"{q:04d}.png")
        print("cursores:", variant)


def setup():
    exe = ROOT / "dist" / "DesktopGlow-Setup.exe"
    for lingua in ("en", "pt"):
        folder = OUT / "setup" / lingua
        folder.mkdir(parents=True, exist_ok=True)
        subprocess.run([str(exe), "--screenshot", str(folder), "--lang", lingua], check=True)
        for f in folder.glob(f"{lingua}-*.png"):
            f.rename(folder / f.name[len(lingua) + 1:])
        print("setup:", lingua)


PARTS = {"logos": logos, "ilha": remotion_stills, "fundo": fundo, "cursores": cursores, "setup": setup}

if __name__ == "__main__":
    wanted = [a for a in sys.argv[1:] if a in PARTS] or list(PARTS)
    for part in wanted:
        PARTS[part]()
    print("pronto:", OUT)
