"""Genera los íconos de la PWA en pixel art (public/icons).

Uso: python tools/make-icons.py   (necesita Pillow: pip install pillow)
Reemplázalos por tu propio ícono cuando tengas uno; mantén los mismos nombres y tamaños.
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

NOCHE = (20, 16, 38)
AZUL = (61, 110, 224)
PAPEL = (243, 234, 216)
ROJO = (216, 57, 43)
ROJO_C = (255, 138, 112)
ROJO_O = (140, 30, 22)
VERDE = (61, 138, 42)
AMARILLO = (255, 194, 58)
AJI = (232, 68, 58)


def art(size=32, pad=0):
    """Dibujo en una grilla de 32x32: toldo de feria y un tomate con chispas de impacto."""
    im = Image.new("RGBA", (size, size), NOCHE + (255,))
    d = ImageDraw.Draw(im)
    o = pad
    # Toldo a rayas con borde ondulado
    for i in range(0, size, 4):
        d.rectangle([i, 0, i + 3, 6 + o // 2], fill=AZUL if (i // 4) % 2 == 0 else PAPEL)
        d.ellipse([i, 4 + o // 2, i + 3, 8 + o // 2], fill=AZUL if (i // 4) % 2 == 0 else PAPEL)
    cx, cy, r = size // 2, size // 2 + 3, 8
    # Chispas de impacto
    for (x1, y1, x2, y2) in [(-13, 0, -10, 0), (10, 0, 13, 0), (-10, -8, -8, -6), (8, -6, 10, -8), (-10, 8, -8, 6), (8, 6, 10, 8)]:
        d.line([cx + x1, cy + y1, cx + x2, cy + y2], fill=AMARILLO, width=2)
    # Tomate
    d.ellipse([cx - r, cy - r + 1, cx + r, cy + r + 1], fill=ROJO_O)
    d.ellipse([cx - r, cy - r, cx + r, cy + r - 1], fill=ROJO)
    d.rectangle([cx - 5, cy - 5, cx - 3, cy - 3], fill=ROJO_C)
    d.rectangle([cx - 4, cy - r - 1, cx + 3, cy - r], fill=VERDE)
    d.rectangle([cx - 1, cy - r - 3, cx, cy - r - 1], fill=VERDE)
    # Piso
    d.rectangle([0, size - 3, size, size], fill=AJI)
    return im


def save(im, px, name):
    im.resize((px, px), Image.NEAREST).save(OUT / name)


base = art()
save(base, 192, "icon-192.png")
save(base, 512, "icon-512.png")
save(base, 180, "apple-touch-icon.png")
save(base, 64, "favicon-64.png")

# Versión "maskable": el dibujo más chico, para que Android pueda recortarlo en círculo sin cortar nada.
mask = Image.new("RGBA", (40, 40), NOCHE + (255,))
mask.paste(art(), (4, 4))
save(mask, 512, "icon-maskable-512.png")
print("Íconos listos en", OUT)
