"""Writes the scripts in roteiros/ from one table: which scenes each video has, how long each scene lasts at least and
what the voice says in it, in English and Portuguese. Edit here and run it again; the JSON files are its output.

    python ferramentas/roteiros.py

A scene with a line lasts the line plus its margins (src/linha.tsx), never less than its "segundos". The voices are
the ones in the video-motion skill (Ava in English, Thalita in Portuguese).
"""
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ROTEIROS = RAIZ / "roteiros"

VOZ = {
    "en": {"nome": "en-US-AvaMultilingualNeural", "velocidade": "+4%"},
    "pt": {"nome": "pt-BR-ThalitaMultilingualNeural", "velocidade": "+6%"},
}

NOME = {
    "en": {"ilha": "Island", "relogio": "Mond Clock", "fundovivo": "Living Wallpaper", "cursores": "Island Cursors"},
    "pt": {"ilha": "Ilha", "relogio": "Relógio Mond", "fundovivo": "Fundo Vivo", "cursores": "Cursores da Ilha"},
}

# scene id -> (minimum seconds, English line, Portuguese line)
FALA = {
    "gancho-todos": (3.0, "Make Windows look like this.", "Deixe o Windows assim."),
    "ilha-gancho": (3.2, "Windows never had a Dynamic Island. Until now.", "O Windows nunca teve Dynamic Island. Até agora."),
    "relogio-gancho": (3.0, "Your desktop is missing something.", "Falta uma coisa na sua área de trabalho."),
    "fundovivo-gancho": (3.0, "Live wallpapers, without the weight.", "Papel de parede vivo, sem pesar."),
    "cursores-gancho": (2.8, "Your cursor deserves better.", "Seu cursor merece mais."),
    "ilha-nome": (2.8, "Island. The Dynamic Island, now on Windows.", "Ilha. A Dynamic Island, agora no Windows."),
    "relogio-nome": (2.8, "Mond Clock. A desktop clock in the Mond style.", "Relógio Mond. Um relógio de área de trabalho no estilo Mond."),
    "fundovivo-nome": (2.8, "Living Wallpaper. Live wallpapers that stay light.", "Fundo Vivo. Papel de parede animado e leve."),
    "cursores-nome": (2.8, "Island Cursors. Pointers that match the island.", "Cursores da Ilha. Ponteiros que combinam com a ilha."),
    "ilha-musica": (3.2, "Your music, live, with the cover, the controls and a visualizer.", "Sua música ao vivo, com a capa, os controles e o visualizador."),
    "ilha-placar": (3.4, "In a competitive game, the pill becomes the live score.", "No jogo competitivo, a pílula vira o placar ao vivo."),
    "ilha-downloads": (3.4, "Steam downloads, at a glance.", "Os downloads da Steam, de relance."),
    "ilha-clima": (2.6, "It even tells you when the sky changes.", "E avisa até quando o tempo muda."),
    "ilha-menu": (3.0, "Open it, and everything running waits at its side.", "Abra, e tudo o que está rodando fica do lado."),
    "ilha-timer": (3.0, "Timers and pomodoro, counting down at the top.", "Timer e pomodoro, contando lá no topo."),
    "ilha-gravar": (2.8, "Record the screen in one click.", "Grave a tela num clique."),
    "ilha-alertas": (3.4, "And only the alerts that matter.", "E só os avisos que importam."),
    "ilha-numeros": (3.0, "Two hundred and fifty frames per second, with almost no CPU.", "Duzentos e cinquenta quadros por segundo, com a CPU quase parada."),
    "relogio-mostrador": (3.2, "Day, date, time and weather, right on your desktop.", "Dia, data, hora e clima, direto na área de trabalho."),
    "relogio-musica": (3.0, "And what is playing now, with bars that follow the sound.", "E o que está tocando, com barras que seguem o som."),
    "relogio-detalhes": (3.6, "Made to stay out of the way.", "Feito para não atrapalhar."),
    "fundo-galeria": (3.6, "Ten wallpapers of its own, plus your videos, pictures and web pages.", "Dez fundos próprios, e mais os seus vídeos, imagens e páginas."),
    "fundo-monitores": (3.0, "One wallpaper per monitor.", "Um fundo para cada monitor."),
    "fundo-pausa": (3.6, "And it pauses when a game takes over.", "E pausa quando um jogo toma a tela."),
    "fundo-numeros": (3.4, "A Full HD video takes under one and a half percent of a single core.", "Um vídeo Full HD gasta menos de um e meio por cento de um núcleo."),
    "fundo-biblioteca": (3.0, None, "Escolha, clique, pronto."),
    "cursor-esquemas": (2.6, "Black or white, outlined in the opposite color.", "Preto ou branco, com contorno na cor oposta."),
    "cursor-morfo": (3.0, "And every pointer morphs into the next.", "E cada ponteiro se transforma no próximo."),
    "cursor-ocupado": (3.0, "Even waiting looks good.", "Até esperar fica bonito."),
    "fecho-todos": (4.0, "Desktop Glow. One installer, four apps, free. Desktop Glow dot com.",
                    "Desktop Glow. Um instalador, quatro apps, de graça. Desktop Glow ponto com."),
}
for app in NOME["en"]:
    FALA[f"fecho-{app}"] = (3.4, f"{NOME['en'][app]}. Free, in Desktop Glow.", f"{NOME['pt'][app]}. De graça, no Desktop Glow.")
    FALA[f"fim-{app}"] = (3.0, "Free, in Desktop Glow.", "De graça, no Desktop Glow.")

VIDEOS = {
    # name: (app, language, format, cover second, scenes)
    "youtube-todos": ("todos", "en", "16x9", 2.0, ["gancho-todos", "ilha-musica", "ilha-placar", "relogio-mostrador", "relogio-musica", "fundo-galeria", "fundo-monitores", "cursor-esquemas", "cursor-morfo", "fecho-todos"]),
    "youtube-todos-pt": ("todos", "pt", "16x9", 2.0, ["gancho-todos", "ilha-musica", "ilha-placar", "relogio-mostrador", "relogio-musica", "fundo-galeria", "fundo-monitores", "cursor-esquemas", "cursor-morfo", "fecho-todos"]),
    "tiktok-todos": ("todos", "en", "9x16", 2.0, ["gancho-todos", "ilha-placar", "relogio-musica", "fundo-galeria", "cursor-morfo", "fecho-todos"]),
    "tiktok-ilha": ("ilha", "en", "9x16", 3.0, ["ilha-gancho", "ilha-musica", "ilha-placar", "ilha-downloads", "ilha-clima", "ilha-menu", "ilha-numeros", "fecho-ilha"]),
    "tiktok-relogio": ("relogio", "en", "9x16", 3.0, ["relogio-gancho", "relogio-mostrador", "relogio-musica", "relogio-detalhes", "fecho-relogio"]),
    "tiktok-fundovivo": ("fundovivo", "en", "9x16", 3.0, ["fundovivo-gancho", "fundo-galeria", "fundo-monitores", "fundo-pausa", "fundo-numeros", "fecho-fundovivo"]),
    "tiktok-cursores": ("cursores", "en", "9x16", 3.0, ["cursores-gancho", "cursor-esquemas", "cursor-morfo", "cursor-ocupado", "fecho-cursores"]),
}
for app, extra in {"ilha": ["ilha-musica", "ilha-placar"], "relogio": ["relogio-mostrador", "relogio-musica"],
                   "fundovivo": ["fundo-galeria", "fundo-pausa"], "cursores": ["cursor-esquemas", "cursor-morfo"]}.items():
    for lingua in ("en", "pt"):
        # the library window only exists in Portuguese, so only the Portuguese setup video shows it
        meio = extra + (["fundo-biblioteca"] if app == "fundovivo" and lingua == "pt" else [])
        VIDEOS[f"setup-{app}-{lingua}"] = (app, lingua, "16x9", 2.0, [f"{app}-nome", *meio, f"fim-{app}"])


def main():
    for nome, (app, lingua, formato, capa, cenas) in VIDEOS.items():
        lista = []
        for c in cenas:
            minimo, en, pt = FALA[c]
            fala = en if lingua == "en" else pt
            cena = {"id": c, "segundos": minimo}
            if fala:
                cena["fala"] = fala
            lista.append(cena)
        r = {
            "titulo": nome,
            "app": app,
            "lingua": lingua,
            "estilo": "produto",
            "bpm": 110,
            "formatos": [formato],
            "capa": capa,
            "legenda": False,
            "voz": VOZ[lingua],
            # no music track (his rule since 03/11/2026); the field stays because the model reads it
            "trilha": {"volume": 0, "sobVoz": 0},
            "cenas": lista,
        }
        (ROTEIROS / f"{nome}.json").write_text(json.dumps(r, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(VIDEOS)} scripts in {ROTEIROS}")


if __name__ == "__main__":
    main()
