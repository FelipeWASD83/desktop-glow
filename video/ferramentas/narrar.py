"""Gera a narração das cenas com voz neural (edge-tts, a voz de leitura do Edge) e o tempo de cada palavra.

Lê src/roteiro.json: cada cena com "fala" vira public/narracao/<cena>.mp3, e src/narracao.gerado.json guarda a
duração, as palavras com o segundo em que começam e as marcas. A linha do tempo do vídeo sai daí.

Marcas: {nome} logo antes de uma palavra ("o preço é {preco}duzentos") vira o segundo em que a palavra começa.
As cenas pedem quando('preco') e a animação fica presa à fala.

Precisa de internet e do edge-tts num ambiente próprio (a primeira vez):
    python -m venv .venv
    .venv\\Scripts\\pip install edge-tts==7.3.1
Depois é só `npm run narrar` (o script se reabre no .venv sozinho).

    python ferramentas/narrar.py            # só o que mudou (texto, voz ou velocidade)
    python ferramentas/narrar.py --forcar   # refaz tudo
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from comum import RAIZ, roteiro, slug  # noqa: E402

VENV = RAIZ / ".venv" / "Scripts" / "python.exe"
try:
    import edge_tts
except ImportError:
    if VENV.exists() and Path(sys.executable).resolve() != VENV.resolve():
        sys.exit(subprocess.call([str(VENV), __file__, *sys.argv[1:]]))
    sys.exit("Falta o edge-tts. Rode: python -m venv .venv  e  .venv\\Scripts\\pip install edge-tts==7.3.1")

PASTA = RAIZ / "public" / "narracao"
GERADO = RAIZ / "src" / "narracao.gerado.json"
MARCA = re.compile(r"\{([a-z0-9_]+)\}")


def normal(s: str) -> str:
    return slug(s).replace("-", "")


def separar(texto: str) -> tuple[str, list[dict]]:
    """Tira as marcas do texto e devolve (texto limpo, palavras com as marcas que vêm antes de cada uma)."""
    palavras, pendentes, limpo = [], [], []
    for i, pedaco in enumerate(MARCA.split(texto)):
        if i % 2:
            pendentes.append(pedaco)
            continue
        limpo.append(pedaco)
        for w in pedaco.split():
            if not normal(w):
                continue
            palavras.append({"texto": w, "n": normal(w), "marcas": pendentes})
            pendentes = []
    if pendentes:
        raise ValueError(f"marca no fim da fala, sem palavra depois: {pendentes}")
    return re.sub(r"\s+", " ", "".join(limpo)).strip(), palavras


def alinhar(palavras: list[dict], limites: list[dict]) -> dict[int, int]:
    """Casa as palavras do texto com as que a voz devolveu (a voz às vezes junta ou separa: "A P I" e "API")."""
    W = [p["n"] for p in palavras]
    B = [normal(b["texto"]) for b in limites]
    mapa: dict[int, int] = {}
    i = j = 0
    while i < len(W) and j < len(B):
        w, b = W[i], B[j]
        if not b:
            j += 1
            continue
        if w == b:
            mapa[i] = j
            i, j = i + 1, j + 1
            continue
        if w.startswith(b):  # a voz separou a palavra
            acc, k = b, j + 1
            while k < len(B) and len(acc) < len(w):
                acc += B[k]
                k += 1
            if acc == w:
                mapa[i] = j
                i, j = i + 1, k
                continue
        if b.startswith(w):  # a voz juntou palavras
            acc, k = w, i + 1
            while k < len(W) and len(acc) < len(b):
                acc += W[k]
                k += 1
            if acc == b:
                for x in range(i, k):
                    mapa[x] = j
                i, j = k, j + 1
                continue
        achou = False
        for soma in range(1, 6):  # ressincroniza um pouco à frente
            for di in range(soma + 1):
                dj = soma - di
                if i + di < len(W) and j + dj < len(B) and W[i + di] == B[j + dj]:
                    for x in range(i, i + di):
                        mapa[x] = j + dj
                    i, j = i + di, j + dj
                    achou = True
                    break
            if achou:
                break
        if not achou:
            i += 1
    return mapa


def duracao(arq: Path) -> float:
    saida = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(arq)],
                           capture_output=True, text=True, check=True).stdout
    return float(saida.strip())


async def narrar(cena: str, fala: str, voz: str, velocidade: str, antigo: dict | None, forcar: bool) -> dict:
    texto, palavras = separar(fala)
    assinatura = hashlib.sha1(f"{voz}|{velocidade}|{fala}".encode("utf-8")).hexdigest()[:16]
    arq = PASTA / f"{cena}.mp3"
    if antigo and antigo.get("assinatura") == assinatura and arq.exists() and not forcar:
        return antigo
    for tentativa in range(4):  # o serviço às vezes devolve vazio: tenta de novo
        com = edge_tts.Communicate(texto, voz, rate=velocidade, boundary="WordBoundary")
        audio, limites = bytearray(), []
        try:
            async for pedaco in com.stream():
                if pedaco["type"] == "audio":
                    audio += pedaco["data"]
                elif pedaco["type"] == "WordBoundary":
                    # offset e duração vêm em unidades de 100 ns
                    limites.append({"t": round(pedaco["offset"] / 1e7, 3), "d": round(pedaco["duration"] / 1e7, 3),
                                    "texto": pedaco["text"]})
            break
        except edge_tts.exceptions.NoAudioReceived:
            if tentativa == 3:
                raise RuntimeError(f"{cena}: a voz não devolveu áudio para: {texto}")
            await asyncio.sleep(2 + tentativa * 3)
    arq.write_bytes(bytes(audio))
    mapa = alinhar(palavras, limites)
    marcas, faltam = {}, []
    for i, p in enumerate(palavras):
        for m in p["marcas"]:
            if i in mapa:
                marcas[m] = limites[mapa[i]]["t"]
            else:
                faltam.append(f"{m} ({p['texto']})")
    if faltam:
        ditas = " ".join(b["texto"] for b in limites)
        raise RuntimeError(f"{cena}: não achei na fala as marcas {faltam}. A voz disse: {ditas}")
    return {"fala": fala, "arquivo": f"narracao/{cena}.mp3", "duracao": round(duracao(arq), 3),
            "assinatura": assinatura, "palavras": limites, "marcas": marcas}


async def main():
    forcar = "--forcar" in sys.argv
    r = roteiro()
    voz, velocidade = r["voz"]["nome"], r["voz"]["velocidade"]
    PASTA.mkdir(parents=True, exist_ok=True)
    antigos = {}
    if GERADO.exists():
        antigos = json.loads(GERADO.read_text(encoding="utf-8")).get("cenas", {})
    cenas = {}
    for c in r["cenas"]:
        if not c.get("fala"):
            continue
        cenas[c["id"]] = await narrar(c["id"], c["fala"], voz, velocidade, antigos.get(c["id"]), forcar)
        print(f"ok {c['id']:16} {cenas[c['id']]['duracao']:5.2f} s", flush=True)
    for velho in PASTA.glob("*.mp3"):  # fala de cena que saiu do roteiro
        if velho.stem not in cenas:
            velho.unlink()
    GERADO.write_text(json.dumps({"voz": voz, "cenas": cenas}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    total = sum(c["duracao"] for c in cenas.values())
    print(f"{len(cenas)} falas, {total:.1f} s de voz ({voz} {velocidade})")


if __name__ == "__main__":
    asyncio.run(main())
