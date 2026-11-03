"""Gera os efeitos sonoros e a trilha do vídeo, sintetizados aqui em numpy: sem amostra de ninguém, sem direito
autoral de terceiro. Saída: public/sons/*.wav (48 kHz, 16 bits, estéreo).

    python ferramentas/sons.py                 # tudo; a trilha no BPM do roteiro, do tamanho do vídeo
    python ferramentas/sons.py --segundos 90   # a trilha com outra duração

Efeitos: varredura, sopro, chicote, glitch, bolha e subida-curta (os das transições, ver
src/movimento/transicoes-dados.ts), deslize, toque, clique, tique, impacto e subida.
Trilha: uma cama de acordes abertos que troca a cada dois compassos, com um pulso grave suave na batida.
Para outro clima, mexer em ACORDES e em trilha(): é o lugar de compor.
"""
from __future__ import annotations

import json
import sys
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from comum import RAIZ, roteiro  # noqa: E402

TAXA = 48000
PASTA = RAIZ / "public" / "sons"
rng = np.random.default_rng(7)


def tempo(segundos: float) -> np.ndarray:
    return np.arange(int(TAXA * segundos)) / TAXA


def passa_baixa(sinal: np.ndarray, corte_hz) -> np.ndarray:
    """Filtro de um polo com corte que pode variar amostra a amostra (só para efeito curto: é laço em Python)."""
    corte = np.broadcast_to(np.asarray(corte_hz, dtype=float), sinal.shape)
    a = 1 - np.exp(-2 * np.pi * corte / TAXA)
    saida = np.empty_like(sinal)
    y = 0.0
    for i, (x, k) in enumerate(zip(sinal, a)):
        y += k * (x - y)
        saida[i] = y
    return saida


def passa_alta(sinal: np.ndarray, corte_hz) -> np.ndarray:
    return sinal - passa_baixa(sinal, corte_hz)


def eco(sinal: np.ndarray, atraso=0.045, ganho=0.3, vezes=4) -> np.ndarray:
    n = int(atraso * TAXA)
    saida = np.concatenate([sinal, np.zeros(n * vezes)])
    for v in range(1, vezes + 1):
        saida[n * v: n * v + len(sinal)] += sinal * (ganho ** v)
    return saida


def estereo(esq: np.ndarray, dir: np.ndarray | None = None) -> np.ndarray:
    return np.stack([esq, esq if dir is None else dir], axis=1)


def gravar(nome: str, sinal: np.ndarray, pico_db: float = -3.0):
    if sinal.ndim == 1:
        sinal = estereo(sinal)
    sinal = sinal.copy()
    fade = min(512, len(sinal) // 4)
    sinal[:64] *= np.linspace(0, 1, 64)[:, None]
    sinal[-fade:] *= np.linspace(1, 0, fade)[:, None]
    pico = np.max(np.abs(sinal)) or 1
    sinal = sinal / pico * 10 ** (pico_db / 20)
    PASTA.mkdir(parents=True, exist_ok=True)
    with wave.open(str(PASTA / nome), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(TAXA)
        w.writeframes((sinal * 32767).astype("<i2").tobytes())
    print(f"ok {nome:16} {len(sinal) / TAXA:6.2f} s")


def varredura():
    """O "vush" da troca: ruído que abre e fecha, andando da esquerda para a direita."""
    t = tempo(0.55)
    x = t / t[-1]
    s = passa_alta(passa_baixa(rng.standard_normal(len(t)), 300 + 5200 * np.sin(np.pi * x) ** 2), 120)
    s *= np.sin(np.pi * x) ** 1.6
    return estereo(s * (1 - x * 0.8), s * (0.2 + x * 0.8))


def deslize():
    t = tempo(0.3)
    x = t / t[-1]
    s = passa_alta(passa_baixa(rng.standard_normal(len(t)), 2500 + 5000 * x), 900)
    return s * np.sin(np.pi * x) ** 1.2


def toque():
    """Clique suave de interface: tom curto com ataque de ruído."""
    t = tempo(0.16)
    tom = np.sin(2 * np.pi * 1320 * t) * np.exp(-t * 38) + 0.5 * np.sin(2 * np.pi * 2640 * t) * np.exp(-t * 60)
    ataque = passa_alta(rng.standard_normal(len(t)), 3000) * np.exp(-t * 400) * 0.6
    return eco(tom + ataque, atraso=0.035, ganho=0.25, vezes=3)


def clique():
    """Clique de mouse seco."""
    t = tempo(0.05)
    return passa_alta(rng.standard_normal(len(t)), 2000) * np.exp(-t * 260) + np.sin(2 * np.pi * 3100 * t) * np.exp(-t * 300) * 0.4


def tique():
    """Tique de relógio, para contador ou lista entrando item a item."""
    t = tempo(0.06)
    return np.sin(2 * np.pi * 2200 * t) * np.exp(-t * 150)


def impacto():
    """Batida grave com cauda (a marca chegando, o número pousando)."""
    t = tempo(1.1)
    fase = 2 * np.pi * np.cumsum(46 + 70 * np.exp(-t * 14)) / TAXA
    grave = np.sin(fase) * np.exp(-t * 3.2)
    corpo = passa_baixa(rng.standard_normal(len(t)), 900) * np.exp(-t * 22) * 0.9
    brilho = passa_alta(rng.standard_normal(len(t)), 4000) * np.exp(-t * 60) * 0.25
    return eco(grave * 1.1 + corpo + brilho, atraso=0.06, ganho=0.3, vezes=4)


def subida():
    """Subida de 1 s antes de um impacto: ruído e tom subindo juntos, cortando seco."""
    t = tempo(1.0)
    x = t / t[-1]
    ruido = passa_baixa(rng.standard_normal(len(t)), 400 + 7000 * x ** 2)
    tom = np.sin(2 * np.pi * np.cumsum(180 * 2 ** (x * 2.3)) / TAXA) * 0.35
    return (ruido * 0.8 + tom) * x ** 2.2


def sopro():
    """Ar passando, mais grave e mais longo que a varredura (cortina, íris, empurrão, divisão)."""
    t = tempo(0.7)
    x = t / t[-1]
    s = passa_baixa(rng.standard_normal(len(t)), 180 + 1600 * np.sin(np.pi * x) ** 2)
    s *= np.sin(np.pi * x) ** 2
    return estereo(s * (1 - x * 0.5), s * (0.5 + x * 0.5))


def chicote():
    """Whip pan: ruído curto que sobe e corta seco, com um estalo no fim."""
    t = tempo(0.32)
    x = t / t[-1]
    s = passa_alta(passa_baixa(rng.standard_normal(len(t)), 800 + 9000 * x ** 1.5), 300) * x ** 1.4
    estalo = passa_alta(rng.standard_normal(len(t)), 2500) * np.exp(-np.maximum(0, t - 0.27) * 300) * (t > 0.27)
    return estereo(s + estalo * 0.8, s * 0.6 + estalo)


def glitch():
    """Ruído digital picotado: blocos de ruído e tom quadrado ligando e desligando."""
    t = tempo(0.3)
    blocos = (np.floor(t * 70) % 3 != 0).astype(float)
    quadrada = np.sign(np.sin(2 * np.pi * 220 * t * (1 + np.floor(t * 40) % 4)))
    s = (rng.standard_normal(len(t)) * 0.6 + quadrada * 0.4) * blocos
    return passa_alta(s, 400) * np.exp(-t * 4)


def bolha():
    """Tinta subindo: borbulhas graves em sequência, a altura subindo."""
    t = tempo(0.75)
    s = np.zeros(len(t))
    for k in range(7):
        ini = 0.08 * k + rng.uniform(0, 0.03)
        u = t - ini
        dentro = u > 0
        hz = 260 + 70 * k + 500 * np.clip(u, 0, 0.08) / 0.08
        s += np.sin(2 * np.pi * hz * np.clip(u, 0, None)) * np.exp(-np.clip(u, 0, None) * 30) * dentro
    return eco(s, atraso=0.03, ganho=0.25, vezes=3)


def subida_curta():
    """Subida de 0,4 s para o zoom atravessar a cena."""
    t = tempo(0.42)
    x = t / t[-1]
    ruido = passa_baixa(rng.standard_normal(len(t)), 600 + 9000 * x ** 2)
    tom = np.sin(2 * np.pi * np.cumsum(240 * 2 ** (x * 2.6)) / TAXA) * 0.3
    return (ruido * 0.7 + tom) * x ** 1.6


# Rém7M, Sim7, Solm7M, Lá6: aberto e calmo. Hz da nota mais grave para a mais aguda.
ACORDES = [
    [146.83, 185.00, 220.00, 277.18],
    [123.47, 146.83, 185.00, 220.00],
    [98.00, 123.47, 146.83, 185.00],
    [110.00, 138.59, 164.81, 185.00],
]


def trilha(segundos: float, bpm: float):
    """Acordes de senos levemente desafinados entre si (coro), trocando a cada dois compassos, e um pulso grave
    suave em cada batida para o corte ter onde cair. Vetorizado: dá conta de minutos sem demora."""
    t = tempo(segundos)
    batida = 60 / bpm
    dura = batida * 8
    esq = np.zeros(len(t))
    dir = np.zeros(len(t))
    for k in range(int(segundos / dura) + 2):
        notas = ACORDES[k % len(ACORDES)]
        inicio = k * dura - batida
        x = t - inicio
        env = np.clip(x / (batida * 2), 0, 1) * np.clip((dura + batida * 2 - x) / (batida * 2), 0, 1)
        env = np.sin(env * np.pi / 2) ** 2
        if not env.any():
            continue
        for j, hz in enumerate(notas):
            for desvio, lado in ((-0.0018, esq), (0.0021, dir)):
                fase = 2 * np.pi * hz * (1 + desvio) * t + j * 1.3
                lado += (np.sin(fase) + 0.18 * np.sin(2 * fase) + 0.05 * np.sin(3 * fase)) * env * (0.9 - j * 0.12)
    # pulso grave: um "tum" abafado em cada batida, mais forte na primeira do compasso
    n_bat = np.floor(t / batida)
    fase_bat = t - n_bat * batida
    forca = np.where(n_bat % 4 == 0, 1.0, 0.55)
    pulso = np.sin(2 * np.pi * (ACORDES[0][0] / 2) * fase_bat) * np.exp(-fase_bat * 9) * forca * 1.4
    esq += pulso
    dir += pulso
    return np.stack([esq, dir], axis=1)


def duracao_do_video() -> float:
    """Estimativa da duração pelo roteiro e pela narração (a trilha sai um pouco maior e o vídeo dá o fade)."""
    r = roteiro()
    gerado = RAIZ / "src" / "narracao.gerado.json"
    falas = json.loads(gerado.read_text(encoding="utf-8")).get("cenas", {}) if gerado.exists() else {}
    total = 0.0
    for c in r["cenas"]:
        if c.get("fala"):
            fala = falas.get(c["id"], {}).get("duracao") or len(c["fala"].split()) / 2.6
            total += max(fala + 1.5, c.get("segundos", 0))
        else:
            total += c.get("segundos", 3)
    return total * 1.1 + 6


if __name__ == "__main__":
    segundos = float(sys.argv[sys.argv.index("--segundos") + 1]) if "--segundos" in sys.argv else duracao_do_video()
    gravar("varredura.wav", varredura())
    gravar("deslize.wav", deslize())
    gravar("toque.wav", toque())
    gravar("clique.wav", clique())
    gravar("tique.wav", tique())
    gravar("impacto.wav", impacto())
    gravar("subida.wav", subida())
    gravar("sopro.wav", sopro())
    gravar("chicote.wav", chicote())
    gravar("glitch.wav", glitch())
    gravar("bolha.wav", bolha())
    gravar("subida-curta.wav", subida_curta())
    gravar("trilha.wav", trilha(segundos, roteiro()["bpm"]), -10)
