# -*- coding: utf-8 -*-
"""
대시보드(index.html)와 동일하게 모든 관리자 페이지의
로고, 한글 메뉴, 강의등록, 강의 목록을 통일합니다.
"""
import os
import re
import glob

BASE = os.path.dirname(os.path.abspath(__file__))
INDEX_PATH = os.path.join(BASE, "index.html")

# 부스트클래스 로고 (통일용)
LOGO_HTML = '''<a href="index.html" class="brand-logo d-flex align-items-center">
\t\t\t\t<img src="../../image/logo.png" alt="부스트클래스" class="img-fluid" style="max-height: 40px; width: auto; border-radius: 8px;">
            </a>'''


def find_matching_div_end(content, start_pos):
    """start_pos의 <div>에 대응하는 </div> 끝 위치 반환 (중첩 카운트)"""
    pos = start_pos
    depth = 0
    while pos < len(content):
        if pos + 5 <= len(content) and (content[pos:pos+5] == '<div ' or content[pos:pos+5] == '<div>'):
            depth += 1
            pos += 5
            continue
        if pos + 6 <= len(content) and content[pos:pos+6] == '</div>':
            depth -= 1
            if depth == 0:
                return pos + 6
            pos += 6
            continue
        pos += 1
    return -1


def extract_sidebar_from_index(content):
    """index.html 내용에서 사이드바 블록 추출 (dlabnav 전체)"""
    start = content.find('<div class="dlabnav">')
    if start == -1:
        return None
    end = find_matching_div_end(content, start)
    if end == -1:
        return None
    return content[start:end]


def replace_logo(content):
    """brand-logo 영역을 부스트클래스 로고로 통일"""
    # 기존 로고: <a href="index.html" class="brand-logo ..."> ... </a>
    pattern = re.compile(
        r'<a\s+href="index\.html"\s+class="brand-logo[^"]*">.*?</a>',
        re.DOTALL
    )
    return pattern.sub(LOGO_HTML, content, count=1)


def replace_sidebar(content, sidebar_block):
    """사이드바 블록 전체를 index와 동일하게 교체"""
    start = content.find('<div class="dlabnav">')
    if start == -1:
        return content, False
    end = find_matching_div_end(content, start)
    if end == -1:
        return content, False
    new_content = content[:start] + sidebar_block + content[end:]
    return new_content, True


def main():
    with open(INDEX_PATH, "r", encoding="utf-8") as f:
        index_content = f.read()

    sidebar_block = extract_sidebar_from_index(index_content)
    if not sidebar_block:
        print("ERROR: index.html에서 사이드바 블록을 찾을 수 없습니다.")
        return

    html_files = [f for f in glob.glob(os.path.join(BASE, "*.html")) if os.path.basename(f) != "index.html"]
    updated_logo = 0
    updated_sidebar = 0

    for path in sorted(html_files):
        name = os.path.basename(path)
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception as e:
            print("SKIP (read):", name, e)
            continue

        if '<div class="dlabnav">' not in content:
            continue

        orig = content
        # 1) 로고 교체
        content = replace_logo(content)
        if content != orig:
            updated_logo += 1

        # 2) 사이드바 교체
        content, changed = replace_sidebar(content, sidebar_block)
        if changed:
            updated_sidebar += 1

        try:
            with open(path, "w", encoding="utf-8", newline="") as f:
                f.write(content)
        except Exception as e:
            print("SKIP (write):", name, e)
            continue
        print("OK:", name)

    print("\n로고 교체:", updated_logo, "파일")
    print("사이드바 교체:", updated_sidebar, "파일")


if __name__ == "__main__":
    main()
