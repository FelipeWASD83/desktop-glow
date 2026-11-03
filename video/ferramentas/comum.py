"""O que as ferramentas dividem: a raiz do projeto, o roteiro e como chamar o Remotion e o ffmpeg no Windows."""
from __future__ import annotations

import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")  # o console do Windows em cp1252 estraga os acentos das mensagens

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "saida"
REMOTION = RAIZ / "node_modules" / ".bin" / "remotion.cmd"
FPS = 30


def roteiro() -> dict:
    return json.loads((RAIZ / "src" / "roteiro.json").read_text(encoding="utf-8"))


def slug(texto: str) -> str:
    t = unicodedata.normalize("NFD", texto)
    t = "".join(c for c in t if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-") or "video"


def rodar(cmd: list[str]) -> subprocess.CompletedProcess:
    r = subprocess.run(cmd, cwd=RAIZ, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        sys.exit(f"falhou: {' '.join(map(str, cmd))}\n{r.stdout[-3000:]}\n{r.stderr[-3000:]}")
    return r


def remotion(*args: str) -> subprocess.CompletedProcess:
    """O remotion.cmd é .cmd: no Windows passa pelo cmd.exe. O Edge vem do remotion.config.ts."""
    if not REMOTION.exists():
        sys.exit("falta o node_modules: rode npm install")
    return rodar(["cmd", "/c", str(REMOTION), *args])


def arquivo_de_props(props: dict) -> str:
    """JSON na linha de comando do cmd.exe é um inferno de aspas: o --props aceita o caminho de um arquivo."""
    SAIDA.mkdir(exist_ok=True)
    arq = SAIDA / ".props.json"
    arq.write_text(json.dumps(props), encoding="utf-8")
    return f"--props={arq.relative_to(RAIZ).as_posix()}"


def conferir_antes():
    """Roda o conferir.py e para aqui se ele barrar algo (transição repetida, fade solto, entrada monótona)."""
    r = subprocess.run([sys.executable, str(RAIZ / "ferramentas" / "conferir.py")], cwd=RAIZ, capture_output=True,
                       text=True, encoding="utf-8", errors="replace")
    print(r.stdout.rstrip(), flush=True)
    if r.returncode != 0:
        sys.exit("parei: o conferir.py barrou o vídeo (acima).")


def medir_volume(arq: Path, alvo: float = -14.0) -> dict | None:
    """Loudness integrado, pico verdadeiro e faixa (loudnorm em modo de medição). None se não tem áudio."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(arq), "-af",
                        f"loudnorm=I={alvo}:TP=-1:LRA=11:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    bloco = re.findall(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr)
    return json.loads(bloco[-1]) if bloco else None


def sondar(arq: Path) -> dict:
    r = rodar(["ffprobe", "-v", "error", "-show_entries",
               "stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt,sample_rate,channels:format=duration,size",
               "-of", "json", str(arq)])
    return json.loads(r.stdout)
