# -*- coding: utf-8 -*-
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    t2 = (ROOT / "mata2.html").read_text(encoding="utf-8")
    m = re.search(r'<section class="hero">.*?</section>', t2, re.DOTALL)
    if not m:
        raise SystemExit("mata2: hero 없음")
    hero = m.group(0)
    hero = hero.replace('alt="부스트클래스 랜딩"', 'alt="부스트클래스 랜딩 이미지"', 1)

    t1 = (ROOT / "mata1.html").read_text(encoding="utf-8")
    t1n, n = re.subn(
        r'<section class="hero">.*?</section>',
        hero,
        t1,
        count=1,
        flags=re.DOTALL,
    )
    if n != 1:
        raise SystemExit("mata1: hero 치환 실패")
    (ROOT / "mata1.html").write_text(t1n, encoding="utf-8")
    print("OK: mata1 hero <- mata2 (+ 첫 alt)")


if __name__ == "__main__":
    main()
