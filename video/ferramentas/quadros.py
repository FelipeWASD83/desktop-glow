"""Folha de quadros para conferir o vídeo sem assistir: renderiza um quadro a cada N (em escala reduzida, com as
guias da zona segura ligadas) e monta tudo numa imagem só, com o quadro e o segundo escritos em cada um.

    python ferramentas/quadros.py 16x9         # um quadro a cada 15 (meio segundo)
    python ferramentas/quadros.py 9x16 10      # a cada 10
    python ferramentas/quadros.py 9x16 15 --sem-guias
    python ferramentas/quadros.py 16x9 5 --cena camadas   # uma cena só (com as trocas de entrada e saída)

Saída: quadros/folha-<formato>.jpg, ou folha-<formato>-<cena>.jpg (e os quadros soltos em quadros/).
Antes de renderizar, roda o conferir.py.
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
from comum import FPS, RAIZ, arquivo_de_props, conferir_antes, remotion, roteiro  # noqa: E402


def folha(formato: str, cada: int, guias: bool, cena: str | None = None):
    nome = f"{formato}-{cena}" if cena else formato
    composicao = f"Cena-{cena}-{formato}" if cena else f"Video-{formato}"
    pasta = RAIZ / "quadros" / nome
    pasta.mkdir(parents=True, exist_ok=True)
    for velho in pasta.glob("*.jpeg"):
        velho.unlink()
    vertical = formato in ("9x16", "4x5")
    escala = "0.25" if vertical else "0.3"
    remotion("render", "src/index.ts", composicao, str(pasta.relative_to(RAIZ)), "--sequence",
             "--image-format=jpeg", f"--every-nth-frame={cada}", f"--scale={escala}",
             arquivo_de_props({"formato": formato, "guias": guias, "som": False, "trilha": False,
                               "legenda": roteiro().get("legenda", False)}))
    imagens = sorted(pasta.glob("*.jpeg"))
    if not imagens:
        sys.exit("nenhum quadro renderizado")
    w, h = Image.open(imagens[0]).size
    colunas = 10 if vertical else 6
    linhas = -(-len(imagens) // colunas)
    faixa = 26
    sheet = Image.new("RGB", (colunas * w, linhas * (h + faixa)), "white")
    d = ImageDraw.Draw(sheet)
    try:
        fonte = ImageFont.truetype("arial.ttf", 16)
    except OSError:
        fonte = ImageFont.load_default()
    for i, arq in enumerate(imagens):
        x, y = (i % colunas) * w, (i // colunas) * (h + faixa)
        sheet.paste(Image.open(arq), (x, y + faixa))
        quadro = i * cada
        d.text((x + 6, y + 4), f"q{quadro}  {quadro / FPS:.1f}s", fill="black", font=fonte)
    saida = RAIZ / "quadros" / f"folha-{nome}.jpg"
    sheet.save(saida, quality=88)
    print(f"folha: {saida} ({len(imagens)} quadros, {sheet.size[0]}x{sheet.size[1]})")


if __name__ == "__main__":
    cena = sys.argv[sys.argv.index("--cena") + 1] if "--cena" in sys.argv else None
    args = [a for a in sys.argv[1:] if not a.startswith("--") and a != cena]
    formato = args[0] if args else roteiro()["formatos"][0]
    cada = int(args[1]) if len(args) > 1 else 15
    conferir_antes()
    folha(formato, cada, "--sem-guias" not in sys.argv, cena)
