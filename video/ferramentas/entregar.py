"""Renderiza o vídeo pelo Remotion (Edge), normaliza o áudio, codifica na especificação da plataforma, tira a capa e
mostra o relatório do arquivo final (duração, resolução, fps, tamanho, loudness e pico).

    python ferramentas/entregar.py 9x16 --preset social    # Reels, TikTok, Shorts
    python ferramentas/entregar.py 16x9 --preset youtube
    python ferramentas/entregar.py 16x9 --preset app --teto 15     # CRF sobe até caber em 15 MB
    python ferramentas/entregar.py 16x9 --preset site       # 720p mudo, MP4 + WebM + capa WebP
    python ferramentas/entregar.py 9x16 --previa            # meia resolução, rápido, para conferir com o ver-video
    python ferramentas/entregar.py 9x16 --preset social --sem-trilha   # a música entra no app ao postar
    python ferramentas/entregar.py 16x9 --so-capa
    python ferramentas/entregar.py 9x16 --preset social --legenda      # força a legenda (o padrão vem do roteiro)

Antes de renderizar, roda o conferir.py: transição repetida, fade solto ou entrada monótona param a entrega.

Saída em saida/ (fora do git): <titulo>-<formato>-<preset>.mp4 e <titulo>-<formato>-capa.jpg.
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from comum import FPS, RAIZ, SAIDA, arquivo_de_props, conferir_antes, medir_volume, remotion, rodar, roteiro, slug, sondar  # noqa: E402

PRESETS = {
    "social": {"lufs": -14, "crf": 18, "preset": "slow", "audio": "192k"},
    "youtube": {"lufs": -14, "crf": 17, "preset": "slow", "audio": "256k"},
    "app": {"lufs": -16, "crf": 23, "preset": "slow", "audio": "128k"},
    "previa": {"lufs": -14, "crf": 26, "preset": "veryfast", "audio": "128k"},
}
VIDEO_TV = ["-vf", "scale=out_range=tv,format=yuv420p", "-color_range", "tv", "-r", str(FPS)]


def opcao(nome: str, padrao=None):
    return sys.argv[sys.argv.index(nome) + 1] if nome in sys.argv else padrao


def normalizar(lufs: float, bruto: Path) -> list[str]:
    """Filtro de loudnorm em duas passadas (a primeira mede, a segunda aplica linear). O pico mira -2,5 dBTP (nestes vídeos o AAC passou -1,5 em até 1 dB, no impacto de abertura):
    o AAC passa um pouco do pico do PCM, e a meta de entrega é ficar abaixo de -1."""
    m = medir_volume(bruto, lufs)
    if not m:
        sys.exit(f"o render não tem áudio: {bruto}")
    return ["-af", f"loudnorm=I={lufs}:TP=-2.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
                   f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true",
            "-ar", "48000"]


def codificar(bruto: Path, destino: Path, p: dict, crf: int):
    rodar(["ffmpeg", "-y", "-v", "error", "-i", str(bruto), "-c:v", "libx264", "-preset", p["preset"], "-tune", "animation",
           "-profile:v", "high", "-crf", str(crf), *VIDEO_TV, *normalizar(p["lufs"], bruto), "-c:a", "aac", "-b:a", p["audio"],
           "-movflags", "+faststart", str(destino)])


def capa(formato: str, base: str, webp: bool = False) -> Path:
    png = SAIDA / f"{base}-capa.png"
    remotion("still", "src/index.ts", f"Capa-{formato}", str(png.relative_to(RAIZ)),
             arquivo_de_props({"formato": formato, "guias": False, "som": False, "trilha": False, "legenda": False}))
    destino = SAIDA / f"{base}-capa.{'webp' if webp else 'jpg'}"
    qualidade = ["-c:v", "libwebp", "-quality", "82"] if webp else ["-q:v", "3"]
    rodar(["ffmpeg", "-y", "-v", "error", "-i", str(png), "-vf", "scale='min(1280,iw)':-2:flags=lanczos", *qualidade, str(destino)])
    png.unlink(missing_ok=True)
    return destino


def relatorio(arq: Path, lufs_alvo: float | None):
    info = sondar(arq)
    mb = arq.stat().st_size / 1e6
    dur = float(info["format"]["duration"])
    v = next(s for s in info["streams"] if s["codec_type"] == "video")
    num, den = (int(x) for x in v["r_frame_rate"].split("/"))
    linha = f"   {arq.name}: {v['width']}x{v['height']} {num / den:.0f} qps {v['codec_name']} {v.get('pix_fmt', '')}, {dur:.2f} s, {mb:.1f} MB"
    if any(s["codec_type"] == "audio" for s in info["streams"]):
        m = medir_volume(arq)
        lufs, pico = float(m["input_i"]), float(m["input_tp"])
        aviso = ""
        if lufs_alvo is not None and abs(lufs - lufs_alvo) > 1:
            aviso += f"  ATENÇÃO: alvo {lufs_alvo} LUFS"
        if pico > -0.9:
            aviso += "  ATENÇÃO: pico acima de -1 dBTP"
        linha += f", {lufs:.1f} LUFS, pico {pico:.1f} dBTP{aviso}"
    else:
        linha += ", mudo"
    print(linha, flush=True)


def renderizar(formato: str, bruto: Path, som: bool, trilha: bool, escala: str | None = None):
    args = ["render", "src/index.ts", f"Video-{formato}", str(bruto.relative_to(RAIZ)), "--codec", "h264", "--crf", "14",
            arquivo_de_props({"formato": formato, "guias": False, "som": som, "trilha": trilha,
                             "legenda": "--legenda" in sys.argv or roteiro().get("legenda", False)})]
    args += ["--audio-bitrate", "320k"] if som else ["--muted"]
    if escala:
        args.append(f"--scale={escala}")
    remotion(*args)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--") and a not in (opcao("--preset"), opcao("--teto"))]
    r = roteiro()
    formato = args[0] if args else r["formatos"][0]
    if formato not in r["formatos"]:
        sys.exit(f"o roteiro não tem o formato {formato} (tem: {', '.join(r['formatos'])})")
    nome = f"{slug(r['titulo'])}-{formato}"
    SAIDA.mkdir(exist_ok=True)
    t0 = time.time()
    conferir_antes()

    if "--so-capa" in sys.argv:
        print("capa:", capa(formato, nome))
        return

    if "--previa" in sys.argv:
        bruto = SAIDA / f"bruto-{nome}.mp4"
        renderizar(formato, bruto, True, "--sem-trilha" not in sys.argv, "0.5")
        destino = SAIDA / f"{nome}-previa.mp4"
        codificar(bruto, destino, PRESETS["previa"], PRESETS["previa"]["crf"])
        bruto.unlink(missing_ok=True)
        print(f"prévia pronta ({time.time() - t0:.0f} s):")
        relatorio(destino, None)
        return

    preset = opcao("--preset", "social")
    if preset not in (*PRESETS, "site") or preset == "previa":
        sys.exit(f"preset desconhecido: {preset} (tem: social, youtube, app, site)")
    bruto = SAIDA / f"bruto-{nome}.mp4"

    if preset == "site":
        renderizar(formato, bruto, False, False)
        lado = "scale='if(gt(iw,ih),-2,720)':'if(gt(iw,ih),720,-2)':flags=lanczos"
        mp4, webm = SAIDA / f"{nome}-site.mp4", SAIDA / f"{nome}-site.webm"
        rodar(["ffmpeg", "-y", "-v", "error", "-i", str(bruto), "-vf", f"{lado},scale=out_range=tv,format=yuv420p", "-color_range", "tv", "-c:v", "libx264",
               "-preset", "slow", "-crf", "23", "-movflags", "+faststart", "-an", str(mp4)])
        rodar(["ffmpeg", "-y", "-v", "error", "-i", str(bruto), "-vf", lado, "-c:v", "libvpx-vp9", "-b:v", "0",
               "-crf", "34", "-row-mt", "1", "-an", str(webm)])
        bruto.unlink(missing_ok=True)
        c = capa(formato, nome, webp=True)
        print(f"pronto ({time.time() - t0:.0f} s):")
        relatorio(mp4, None)
        relatorio(webm, None)
        print(f"   capa: {c.name}")
        return

    p = PRESETS[preset]
    renderizar(formato, bruto, True, "--sem-trilha" not in sys.argv)
    destino = SAIDA / f"{nome}-{preset}.mp4"
    crf = p["crf"]
    teto = float(opcao("--teto", "0")) if preset == "app" else 0
    while True:
        codificar(bruto, destino, p, crf)
        if not teto or destino.stat().st_size / 1e6 <= teto or crf >= 35:
            break
        crf += 2
    bruto.unlink(missing_ok=True)
    c = capa(formato, nome)
    print(f"pronto ({time.time() - t0:.0f} s, CRF {crf}):")
    relatorio(destino, p["lufs"])
    print(f"   capa: {c.name}")


if __name__ == "__main__":
    main()
