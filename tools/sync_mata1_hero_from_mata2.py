# -*- coding: utf-8 -*-
"""mata2.html 히어로 섹션을 mata1.html에 복사. 첫 이미지 alt는 mata1 문구 유지, preload LCP URL만 갱신."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    m2 = (ROOT / "mata2.html").read_text(encoding="utf-8")
    m1 = (ROOT / "mata1.html").read_text(encoding="utf-8")
    m_hero = re.search(r'<section class="hero">.*?</section>', m2, re.DOTALL)
    if not m_hero:
        print("mata2에 hero 없음", file=sys.stderr)
        return 1
    hero2 = m_hero.group(0)
    hero2 = hero2.replace('alt="부스트클래스 랜딩"', 'alt="부스트클래스 랜딩 이미지"', 1)
    m1_new, n = re.subn(
        r'<section class="hero">.*?</section>',
        hero2,
        m1,
        count=1,
        flags=re.DOTALL,
    )
    if n != 1:
        print("mata1 hero 치환 실패", file=sys.stderr)
        return 1
    m1_new = m1_new.replace(
        'href="image/hero-opt/w860/frame-2.webp"',
        'href="image/hero-opt-mata2/w860/m2b-01.webp"',
        1,
    )
    (ROOT / "mata1.html").write_text(m1_new, encoding="utf-8")
    print("완료: mata1.html 히어로 = mata2와 동일(alt·preload만 mata1용)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
