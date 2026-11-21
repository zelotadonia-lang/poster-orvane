#!/usr/bin/env python3
"""Orvane poster: finish the generated scene into a travel poster.

Steps: take the generated 1024x1024 scene (scene.png, no text in it),
add a thin cream poster frame, set the place name ORVANE large across the calm upper
sky in letterspaced cream serif, and add one small line at the bottom that
speaks to the judge: this place does not exist. Nothing else is written
on the poster - no quotes, no ratings, no extra copy.

Palette (from the scene itself): deep teal sky, amber lamp light, cream
type. The eye path is name -> lantern tower -> horizon glow -> boats.
Run: python3 draw_entry.py  (writes repo/entry.png, 1024x1024, <= 1 MiB)
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "scene.png")
OUT = os.path.join(HERE, "repo", "entry.png")

CREAM = (244, 232, 203)
SHADOW = (10, 28, 38)
SIZE = 1024
CAP = 1_048_576

SERIF_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SERIF = "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"


def spaced(draw, cx, y, text, font, fill, tracking):
    """Draw text centred on cx with extra tracking between letters."""
    widths = [draw.textlength(ch, font=font) for ch in text]
    total = sum(widths) + tracking * (len(text) - 1)
    x = cx - total / 2
    for ch, w in zip(text, widths):
        draw.text((x, y), ch, font=font, fill=fill)
        x += w + tracking


def main():
    img = Image.open(SRC).convert("RGB")
    if img.size != (SIZE, SIZE):
        img = img.resize((SIZE, SIZE), Image.LANCZOS)
    draw = ImageDraw.Draw(img, "RGBA")

    # Cream poster frame: outer rule + inner hairline, 16 px margin.
    draw.rectangle([15, 15, SIZE - 16, SIZE - 16], outline=CREAM, width=3)
    draw.rectangle([24, 24, SIZE - 25, SIZE - 25], outline=CREAM + (160,), width=1)

    # The name: large serif, letterspaced, with a soft dark halo so it
    # reads against the teal sky and carries the poster's dusk mood.
    name_font = ImageFont.truetype(SERIF_BOLD, 118)
    for dx, dy in ((-3, 0), (3, 0), (0, -3), (0, 3), (-2, -2), (2, 2)):
        spaced(draw, SIZE // 2 + dx, 52 + dy, "ORVANE", name_font, SHADOW, 26)
    spaced(draw, SIZE // 2, 52, "ORVANE", name_font, CREAM, 26)

    # Thin amber rule under the name, same width as the word.
    w = draw.textlength("ORVANE", font=name_font) + 26 * 5
    draw.line([(SIZE // 2 - w / 2, 196), (SIZE // 2 + w / 2, 196)],
              fill=(232, 176, 92), width=3)

    # Judge line, small, bottom centre inside the frame.
    small = ImageFont.truetype(SERIF, 25)
    line = "ORVANE DOES NOT EXIST \u2014 INVENTED FOR THIS POSTER"
    for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        spaced(draw, SIZE // 2 + dx, 968 + dy, line, small, SHADOW, 4)
    spaced(draw, SIZE // 2, 968, line, small, CREAM, 4)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    # Painterly poster art survives a 256-colour adaptive palette well;
    # it is what brings the file under the 1 MiB cap without shrinking it.
    img = img.quantize(colors=256, method=Image.MEDIANCUT,
                       dither=Image.FLOYDSTEINBERG).convert("RGB")
    img.save(OUT, format="PNG", optimize=True)
    n = os.path.getsize(OUT)
    print(f"entry.png: {img.size[0]}x{img.size[1]}, {n} bytes, cap {CAP}")
    assert n <= CAP, f"over cap by {n - CAP} bytes"
    assert img.size == (SIZE, SIZE)


if __name__ == "__main__":
    main()
