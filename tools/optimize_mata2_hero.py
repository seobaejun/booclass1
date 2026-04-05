# -*- coding: utf-8 -*-
"""mata2 히어로용 이미지: 최대 860px / 430px 두 가지 폭으로 WebP+JPEG 생성."""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMAGE_DIR = ROOT / "image"
OUT_BASE = IMAGE_DIR / "hero-opt"
W430 = OUT_BASE / "w430"
W860 = OUT_BASE / "w860"

WEBP_Q = 82
JPEG_Q = 85


def slug_from_disk_name(name: str) -> str:
    if name.startswith("Frame#") and name.endswith(".png"):
        return f"frame-{name[6:-4]}"
    if re.match(r"^\d+\.jpg$", name):
        return name[:-4]
    raise ValueError(f"지원하지 않는 파일명: {name}")


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


def url_to_path(url: str) -> Path:
    name = unquote(url.replace("\\", "/").split("/")[-1])
    return IMAGE_DIR / name


HERO_SIZES = "(max-width: 1200px) 92vw, 1080px"


def parse_hero_img_tags(block: str) -> list[dict]:
    """src·alt 추출 (순서 유지)."""
    rows: list[dict] = []
    for m in re.finditer(r"<img\s[^>]+>", block, re.IGNORECASE):
        tag = m.group(0)
        sm = re.search(r'\bsrc="([^"]+)"', tag, re.IGNORECASE)
        if not sm:
            continue
        src = sm.group(1)
        am = re.search(r'\balt="([^"]*)"', tag, re.IGNORECASE)
        alt = am.group(1) if am else ""
        rows.append({"src": src, "alt": alt})
    return rows


def resolve_source_urls(
    img_rows: list[dict], manifest_path: Path
) -> tuple[list[str], list[str]]:
    """히어로가 이미 최적화 경로면 manifest의 원본 url을 사용."""
    alts = [r["alt"] for r in img_rows]
    srcs = [r["src"] for r in img_rows]
    if not srcs or "hero-opt" not in srcs[0]:
        return srcs, alts
    if not manifest_path.is_file():
        raise FileNotFoundError(
            f"{manifest_path} 가 필요합니다. 원본 image/ 경로 복구 후 다시 실행하세요."
        )
    prev = json.loads(manifest_path.read_text(encoding="utf-8"))
    if len(prev) != len(srcs):
        raise ValueError("manifest와 히어로 img 개수가 맞지 않습니다.")
    return [x["url"] for x in prev], alts


def patch_mata2_html(manifest: list[dict], alts: list[str]) -> None:
    html_path = ROOT / "mata2.html"
    text = html_path.read_text(encoding="utf-8")
    blocks: list[str] = []
    for i, item in enumerate(manifest):
        slug = item["slug"]
        w, h = item["width"], item["height"]
        alt = alts[i] if i < len(alts) else ""
        esc_alt = html.escape(alt, quote=True)
        extra = 'fetchpriority="high"' if i == 0 else 'loading="lazy"'
        blocks.append(
            f'      <picture>\n'
            f'        <source type="image/webp" srcset="image/hero-opt/w430/{slug}.webp 430w, '
            f'image/hero-opt/w860/{slug}.webp 860w" sizes="{HERO_SIZES}">\n'
            f'        <img src="image/hero-opt/w860/{slug}.jpg" '
            f'srcset="image/hero-opt/w430/{slug}.jpg 430w, image/hero-opt/w860/{slug}.jpg 860w" '
            f'sizes="{HERO_SIZES}" width="{w}" height="{h}" alt="{esc_alt}" decoding="async" {extra}>\n'
            f'      </picture>'
        )
    # 앞줄 들여쓰기(4칸)는 유지되므로 <section>은 들여쓰기 없이 시작
    new_section = "<section class=\"hero\">\n" + "\n".join(blocks) + "\n    </section>"
    new_text, n = re.subn(
        r'<section class="hero">.*?</section>',
        new_section,
        text,
        count=1,
        flags=re.DOTALL,
    )
    if n != 1:
        print("hero 섹션 치환 실패", file=sys.stderr)
        raise SystemExit(1)
    html_path.write_text(new_text, encoding="utf-8")
    print(f"갱신됨: {html_path}")


def ensure_head_extras() -> None:
    """preconnect + hero picture 스타일 + 버튼 터치 지연 완화."""
    html_path = ROOT / "mata2.html"
    text = html_path.read_text(encoding="utf-8")
    if 'rel="preconnect" href="https://boostmaster.imweb.me"' not in text:
        inject = (
            '  <link rel="preconnect" href="https://boostmaster.imweb.me">\n'
            '  <link rel="dns-prefetch" href="https://boostmaster.imweb.me">\n'
        )
        if "<title>" in text:
            text = text.replace("<title>", inject + "  <title>", 1)
        else:
            text = inject + text
    if ".hero picture {" not in text:
        text = text.replace(
            "    .hero img {\n      width: 100%;",
            "    .hero picture {\n      display: block;\n    }\n"
            "    .hero img {\n      width: 100%;",
            1,
        )
    if "touch-action: manipulation" not in text:
        text = text.replace(
            "    .btn {\n      display: inline-flex;",
            "    .btn {\n      touch-action: manipulation;\n      display: inline-flex;",
            1,
        )
    html_path.write_text(text, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--apply-html",
        action="store_true",
        help="manifest 기준으로 mata2.html 히어로만 갱신(이미지 재생성 없음)",
    )
    args = parser.parse_args()

    html_path = ROOT / "mata2.html"
    text = html_path.read_text(encoding="utf-8")
    m = re.search(r'<section class="hero">(.*?)</section>', text, re.DOTALL)
    if not m:
        print("hero 섹션을 찾을 수 없습니다.", file=sys.stderr)
        return 1
    block = m.group(1)
    img_rows = parse_hero_img_tags(block)
    if not img_rows:
        print("img가 없습니다.", file=sys.stderr)
        return 1
    manifest_path = OUT_BASE / "manifest.json"
    try:
        srcs, alts = resolve_source_urls(img_rows, manifest_path)
    except (FileNotFoundError, ValueError) as e:
        print(str(e), file=sys.stderr)
        return 1

    if args.apply_html:
        if not manifest_path.is_file():
            print("manifest.json 없음. 먼저 스크립트를 인자 없이 실행하세요.", file=sys.stderr)
            return 1
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if len(manifest) != len(srcs):
            print(
                f"manifest({len(manifest)})와 HTML img 개수({len(srcs)}) 불일치",
                file=sys.stderr,
            )
            return 1
        patch_mata2_html(manifest, alts)
        ensure_head_extras()
        return 0

    manifest: list[dict] = []
    for url in srcs:
        src_path = url_to_path(url)
        if not src_path.is_file():
            print(f"없는 파일: {src_path}", file=sys.stderr)
            return 1
        slug = slug_from_disk_name(src_path.name)
        meta = process_one(src_path, slug)
        manifest.append({"url": url, **meta})

    manifest_path = OUT_BASE / "manifest.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"완료: {len(manifest)}개 → {OUT_BASE}")
    print(f"매니페스트: {manifest_path}")

    patch_mata2_html(manifest, alts)
    ensure_head_extras()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
