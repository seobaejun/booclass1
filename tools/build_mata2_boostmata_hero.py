# -*- coding: utf-8 -*-
"""mata2 히어로를 image/boostmata/ 이미지(파일명 자연 정렬 순)로 교체. 산출: image/hero-opt-mata2/."""
from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BOOST_DIR = ROOT / "image" / "boostmata"
OUT_BASE = ROOT / "image" / "hero-opt-mata2"
W430 = OUT_BASE / "w430"
W860 = OUT_BASE / "w860"
WEBP_Q = 82
JPEG_Q = 85
HERO_SIZES = "(max-width: 1200px) 92vw, 1080px"
EXTS = {".png", ".jpg", ".jpeg", ".webp"}


def natural_key(path: Path) -> tuple:
    s = path.name
    parts = re.split(r"(\d+)", s)
    key: list = []
    for p in parts:
        if p.isdigit():
            key.append(int(p, 10))
        else:
            key.append(p.lower())
    return tuple(key)


def resize_max_width(im: Image.Image, max_w: int) -> Image.Image:
    w, h = im.size
    if w <= max_w:
        return im
    ratio = max_w / w
    nh = max(1, int(round(h * ratio)))
    return im.resize((max_w, nh), Image.Resampling.LANCZOS)


def to_rgb(im: Image.Image) -> Image.Image:
    if im.mode == "P":
        im = im.convert("RGBA")
    if im.mode == "RGBA":
        bg = Image.new("RGB", im.size, (0, 0, 0))
        bg.paste(im, mask=im.split()[3])
        return bg
    if im.mode != "RGB":
        return im.convert("RGB")
    return im


def process_one(src: Path, slug: str) -> dict:
    im = Image.open(src)
    im.load()
    w860_img = resize_max_width(im, 860)
    w430_img = resize_max_width(im, 430)
    w, h = w860_img.size
    meta = {"slug": slug, "width": w, "height": h, "source": src.name}
    for folder, img in ((W430, w430_img), (W860, w860_img)):
        folder.mkdir(parents=True, exist_ok=True)
        rgb = to_rgb(img)
        rgb.save(folder / f"{slug}.webp", "WEBP", quality=WEBP_Q, method=6)
        rgb.save(
            folder / f"{slug}.jpg",
            "JPEG",
            quality=JPEG_Q,
            optimize=True,
            progressive=True,
        )
    return meta


def build_picture_block(slug: str, w: int, h: int, alt: str, extra_img_attrs: str) -> str:
    esc_alt = html.escape(alt, quote=True)
    base = "image/hero-opt-mata2"
    return (
        f"      <picture>\n"
        f'        <source type="image/webp" srcset="{base}/w430/{slug}.webp 430w, '
        f'{base}/w860/{slug}.webp 860w" sizes="{HERO_SIZES}">\n'
        f'        <img src="{base}/w860/{slug}.jpg" '
        f'srcset="{base}/w430/{slug}.jpg 430w, {base}/w860/{slug}.jpg 860w" '
        f'sizes="{HERO_SIZES}" width="{w}" height="{h}" alt="{esc_alt}" decoding="async" {extra_img_attrs}>\n'
        f"      </picture>"
    )


def main() -> int:
    if not BOOST_DIR.is_dir():
        print(f"폴더 없음: {BOOST_DIR}", file=sys.stderr)
        return 1
    files = sorted(
        (
            p
            for p in BOOST_DIR.iterdir()
            if p.is_file() and p.suffix.lower() in EXTS
        ),
        key=natural_key,
    )
    if not files:
        print(f"{BOOST_DIR} 에 이미지가 없습니다.", file=sys.stderr)
        return 1

    manifest: list[dict] = []
    for i, src in enumerate(files, start=1):
        slug = f"m2b-{i:02d}"
        meta = process_one(src, slug)
        manifest.append({"url": f"image/boostmata/{src.name}", **meta})

    OUT_BASE.mkdir(parents=True, exist_ok=True)
    (OUT_BASE / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    blocks: list[str] = []
    for i, item in enumerate(manifest):
        slug = item["slug"]
        w, h = item["width"], item["height"]
        if i == 0:
            alt = "부스트클래스 랜딩"
            extra = 'fetchpriority="high"'
        else:
            alt = ""
            extra = 'loading="lazy"'
        blocks.append(build_picture_block(slug, w, h, alt, extra))

    html_path = ROOT / "mata2.html"
    text = html_path.read_text(encoding="utf-8")
    new_section = '<section class="hero">\n' + "\n".join(blocks) + "\n    </section>"
    new_text, n = re.subn(
        r'<section class="hero">.*?</section>',
        new_section,
        text,
        count=1,
        flags=re.DOTALL,
    )
    if n != 1:
        print("mata2.html hero 섹션 치환 실패", file=sys.stderr)
        return 1
    html_path.write_text(new_text, encoding="utf-8")

    print(f"처리: {len(files)}장 → {OUT_BASE}")
    print(f"갱신: {html_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
