"""Cuts the two arrows of ilha-cursors for the setup's scheme picker (src/Setup/Assets/arrow-black.png, arrow-white.png).

Since 04/11/2026 the icons themselves (the pack's icone/, and the app cards in src/Setup/Assets) come from the Desktop
Glow family in _organizacao/atalhos/desenhar_icones.py + gerar_icones.py; the old tile() and cursors_tile() drawings
below are no longer written.

    python ferramentas/make_icon.py
"""
import struct
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "icone"
SS = 4  # supersampling


def tile(size: int) -> Image.Image:
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))

    # background: graphite to black, top to bottom
    grad = Image.new("RGBA", (s, s))
    gd = ImageDraw.Draw(grad)
    for y in range(s):
        t = y / (s - 1)
        c = int(40 * (1 - t) + 6 * t)
        gd.line([(0, y), (s, y)], fill=(c, c, c + 6, 255))
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.23), fill=255)
    img.paste(grad, (0, 0), mask)

    d = ImageDraw.Draw(img)
    # the island: black pill with a lit rim
    pw, ph = s * 0.56, s * 0.17
    px, py = (s - pw) / 2, s * 0.17
    glow = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(glow).rounded_rectangle([px, py, px + pw, py + ph], radius=ph / 2, fill=(255, 255, 255, 70))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(s * 0.025)))
    rim = max(1, int(s * 0.012))
    d.rounded_rectangle([px, py, px + pw, py + ph], radius=ph / 2, fill=(0, 0, 0, 255), outline=(235, 235, 240, 255), width=rim)
    # a dot on the right of the pill, like the camera on the island
    r = ph * 0.17
    cx, cy = px + pw - ph * 0.5, py + ph / 2
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(70, 210, 120, 255))

    # arrow
    w = s * 0.075
    ax = s / 2
    top, tip = s * 0.43, s * 0.70
    d.rounded_rectangle([ax - w / 2, top, ax + w / 2, tip], radius=w / 2, fill=(245, 245, 248, 255))
    head = s * 0.15
    d.line([(ax - head, tip - head), (ax, tip), (ax + head, tip - head)], fill=(245, 245, 248, 255), width=int(w), joint="curve")
    for x, y in ((ax - head, tip - head), (ax + head, tip - head)):
        d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=(245, 245, 248, 255))

    # tray
    ty = s * 0.80
    d.rounded_rectangle([s * 0.24, ty, s * 0.76, ty + w], radius=w / 2, fill=(150, 150, 158, 255))
    return img.resize((size, size), Image.LANCZOS)


def read_cur(path: Path, want: int = 128) -> Image.Image:
    """The 32-bit frame of a .cur written by ilha-cursors (Pillow drops its alpha channel)."""
    data = path.read_bytes()
    count = struct.unpack_from("<H", data, 4)[0]
    for i in range(count):
        w, _h, _c, _r, _hx, _hy, size, offset = struct.unpack_from("<BBBBHHII", data, 6 + 16 * i)
        w = w or 256
        if w != want:
            continue
        header = struct.unpack_from("<IiiHH", data, offset)
        width, height2, bits = header[1], header[2], header[4]
        if bits != 32:
            break
        height = height2 // 2
        pixels = data[offset + 40: offset + 40 + width * height * 4]
        img = Image.frombuffer("RGBA", (width, height), pixels, "raw", "BGRA", 0, -1)
        return img.copy()
    raise ValueError(f"{path} has no 32-bit {want} px frame")


def cursors_tile(size: int = 512) -> Image.Image:
    """The card picture for the cursors: both arrows from ilha-cursors on a tile like the other apps' icons."""
    cursors = ROOT.parent / "ilha-cursors" / "build"
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    grad = Image.new("RGBA", (size, size))
    gd = ImageDraw.Draw(grad)
    for y in range(size):
        t = y / (size - 1)
        gd.line([(0, y), (size, y)], fill=(int(96 * (1 - t) + 22 * t), int(214 * (1 - t) + 104 * t), int(190 * (1 - t) + 120 * t), 255))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.23), fill=255)
    img.paste(grad, (0, 0), mask)
    for variant, (x, y), scale in (("white", (0.20, 0.16), 2.3), ("black", (0.50, 0.42), 2.3)):
        arrow = read_cur(cursors / variant / "arrow.cur")
        n = int(arrow.width * scale * size / 512)
        arrow = arrow.resize((n, n), Image.LANCZOS)
        img.alpha_composite(arrow, (int(x * size), int(y * size)))
    return img


def main() -> None:
    OUT.mkdir(exist_ok=True)
    assets = ROOT / "src" / "Setup" / "Assets"
    assets.mkdir(parents=True, exist_ok=True)
    for variant in ("black", "white"):
        arrow = read_cur(ROOT.parent / "ilha-cursors" / "build" / variant / "arrow.cur")
        arrow.crop(arrow.getbbox()).save(assets / f"arrow-{variant}.png")
    print("arrow-black.png e arrow-white.png prontos em", assets)


if __name__ == "__main__":
    main()
