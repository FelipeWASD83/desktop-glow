"""Confere o vídeo antes de renderizar. Roda sozinho no começo do quadros.py e do entregar.py; para com erro em:

  - transição repetida (seguida, ou mais de 2 vezes no vídeo), pelo mesmo planejador que o vídeo usa;
  - fade solto nas cenas: opacidade animada fora de <Entra>/<Palavras> (opacidade sozinha é fade; movimento de
    verdade é máscara, recorte, escala, desfoque, giro). Linha que precisa mesmo, marcar com // fade-ok e dizer
    por quê;
  - entrada monótona: um tipo de entrada em mais da metade das entradas do vídeo;
  - o que o render ignora ou faz tremer: Math.random, setTimeout, setInterval, requestAnimationFrame, CSS
    animation e transition.

Avisa (sem parar) quando uma cena usa a mesma entrada em tudo.

    python ferramentas/conferir.py            # mostra o plano de transições e o que achou
    python ferramentas/conferir.py --raiz <pasta de outro vídeo>
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

RAIZ_PADRAO = Path(__file__).resolve().parent.parent

OPACIDADE = re.compile(r"\bopacity\s*:\s*([^,}\n]+)")
NUMERO = re.compile(r"^\s*-?\d*\.?\d+\s*$")
PROIBIDOS = [
    (re.compile(r"\bMath\.random\s*\("), "Math.random (cada quadro sorteia diferente e treme): usar random('semente') do remotion"),
    (re.compile(r"\bset(Timeout|Interval)\s*\("), "setTimeout/setInterval não existem no render: tudo sai de useCurrentFrame()"),
    (re.compile(r"\brequestAnimationFrame\s*\("), "requestAnimationFrame não existe no render: tudo sai de useCurrentFrame()"),
    (re.compile(r"""(?<![\w-])(animation|transition)\s*:\s*['"`]"""), "CSS animation/transition não aparece no render: animar por useCurrentFrame()"),
]
ENTRADA = re.compile(r"<Entra\b[^>]*?\btipo\s*=\s*(?:\"([a-z]+)\"|\{\s*'([a-z]+)'\s*\})", re.S)
MODO = re.compile(r"<Palavras\b[^>]*?\bmodo\s*=\s*(?:\"([a-z]+)\"|\{\s*'([a-z]+)'\s*\})", re.S)
PALAVRAS_SEM_MODO = re.compile(r"<Palavras\b(?![^>]*\bmodo\s*=)[^>]*>", re.S)


def plano(raiz: Path) -> dict:
    r = subprocess.run(["node", str(RAIZ_PADRAO / "ferramentas" / "plano.mjs"), str(raiz)], capture_output=True,
                       text=True, encoding="utf-8", errors="replace")
    linhas = [l for l in r.stdout.splitlines() if l.startswith("{")]
    if not linhas:
        return {"ok": False, "erro": f"o planejador não respondeu:\n{r.stderr[-1500:]}"}
    return json.loads(linhas[-1])


def conferir(raiz: Path) -> tuple[list[str], list[str], dict]:
    erros: list[str] = []
    avisos: list[str] = []
    p = plano(raiz)
    if not p["ok"]:
        erros.append(f"transições: {p['erro']}")
    padrao_texto = p.get("textoPadrao")  # <Palavras> sem modo usa o primeiro modo de texto do estilo

    src = raiz / "src"
    contagem: Counter[str] = Counter()
    for arq in sorted(src.rglob("*.ts*")):
        rel = arq.relative_to(raiz).as_posix()
        texto = arq.read_text(encoding="utf-8")
        linhas = texto.splitlines()
        for n, linha in enumerate(linhas, 1):
            sem_comentario = linha.split("//")[0]
            for regex, msg in PROIBIDOS:
                if regex.search(sem_comentario):
                    erros.append(f"{rel}:{n}: {msg}")
            if "/cenas/" in f"/{rel}" and "fade-ok" not in linha:
                for m in OPACIDADE.finditer(sem_comentario):
                    if not NUMERO.match(m.group(1)):
                        erros.append(f"{rel}:{n}: opacidade animada na cena é fade solto; usar <Entra tipo=...> ou <Palavras modo=...> "
                                     "(ou marcar // fade-ok com o motivo)")
        if "/cenas/" in f"/{rel}":
            tipos = [a or b for a, b in ENTRADA.findall(texto)]
            modos = [a or b for a, b in MODO.findall(texto)]
            if padrao_texto:
                modos += [padrao_texto] * len(PALAVRAS_SEM_MODO.findall(texto))
            da_cena = [f"entrada:{t}" for t in tipos] + [f"texto:{m}" for m in modos]
            contagem.update(da_cena)
            if len(da_cena) >= 3 and len(set(da_cena)) == 1:
                avisos.append(f"{rel}: todas as entradas da cena são {da_cena[0].split(':')[1]}; variar (useEntradas() gira pelas do estilo)")
    total = sum(contagem.values())
    if total >= 5:
        tipo, n = contagem.most_common(1)[0]
        if n * 2 > total:
            erros.append(f"entrada monótona: {tipo.split(':')[1]} em {n} de {total} entradas do vídeo; variar entre as do estilo")
    return erros, avisos, p


def main():
    raiz = Path(sys.argv[sys.argv.index("--raiz") + 1]).resolve() if "--raiz" in sys.argv else RAIZ_PADRAO
    erros, avisos, p = conferir(raiz)
    if p.get("ok"):
        print(f"estilo: {p['nomeEstilo']} ({p['estilo']})")
        for t in p["trocas"]:
            print(f"   -> {t['para']:16} {t['tipo']}{'  (pedida no roteiro)' if t['pedida'] else ''}")
    for a in avisos:
        print(f"AVISO {a}")
    for e in erros:
        print(f"ERRO  {e}")
    if erros:
        print(f"{len(erros)} erro(s): corrigir antes de renderizar.")
        sys.exit(1)
    print("conferido: nada barrado.")


if __name__ == "__main__":
    main()
