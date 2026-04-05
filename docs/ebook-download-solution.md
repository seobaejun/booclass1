# 전자책·Storage 다운로드 — 최종 해결 방법

Firebase Storage에 올린 전자책 파일을 웹에서 **빠르게·한 번만** 받고, 텍스트가 **탭에 펼쳐 보이지 않게** 하기까지 적용한 내용을 정리합니다.

---

## 1. 한 줄 요약

| 항목 | 결론 |
|------|------|
| **느림(수 분~10분)** | ~~SDK `getBlob`~~ **사용 안 함** — 파일 전체를 JS 메모리에 올리는 방식 제거 |
| **두 번 다운로드** | ~~숨김 iframe~~ **사용 안 함** — `<a download>` **한 번**만 클릭 |
| **텍스트가 웹에만 보임** | (1) 텍스트 확장자는 **`fetch` + Blob 저장** 시도 (CORS 필요) (2) 업로드 시 **`Content-Disposition: attachment`** (재업로드) |

구현: **`boostclass/js/boost-file-download.js`** (`?v=12` 등으로 캐시 갱신)

---

## 2. 최종 동작 흐름

### 공통

1. **Firebase SDK `getBlob` / 모듈러 Storage 동적 import — 사용하지 않음**  
   - 대용량에서 메모리 부담·지연이 커서 제외했습니다.

2. **iframe — 사용하지 않음**  
   - 일부 브라우저에서 **동일 파일이 두 번** 받아지는 현상이 있어 제외했습니다.

3. **연속 클릭 방지**  
   - 동일 URL에 대해 **약 2초 안** 재클릭은 무시합니다.

### 파일 종류별

| 종류 | 동작 |
|------|------|
| **PDF, 이미지, 압축 등 (비텍스트 패턴)** | Storage URL로 **`<a download="파일명">` 한 번** 프로그램 클릭 → 브라우저/OS 다운로드(스트리밍에 가깝게 처리) |
| **텍스트류** (`.txt`, `.md`, `.csv`, `.json`, `.xml`, `.rtf`, `.log`, `.tsv`, `.tab`) | **①** `fetch`(CORS)로 받은 뒤 **`application/octet-stream` Blob**으로 저장 시도 → **②** 실패 시 **①과 동일하게 `<a download>` 한 번** |

- 텍스트 ①번이 성공하면 탭에 글자만 뜨는 현상이 줄어듭니다.  
- ①번에는 **버킷 CORS**가 맞아야 합니다 (`storage-cors.json` + `gsutil cors set`).

### 업로드 쪽 (근본)

- 관리자 업로드 시 **`Content-Disposition: attachment`** 메타를 붙임 → **`js/storage-attachment-meta.js`** + `ebook-upload-admin.js` / `course-register-admin.js`
- 예전에 올린 파일은 메타가 없을 수 있음 → **해당 파일만 다시 업로드**하면 브라우저가 **다운로드로** 처리하기 쉬워집니다.

---

## 3. 겪었던 문제와 원인 (참고)

| 증상 | 원인 |
|------|------|
| 다운로드가 매우 느림 | `getBlob`으로 **전체 바이트를 메모리에** 받은 뒤 저장 |
| 같은 파일이 두 번 받아짐 | iframe으로 URL을 열면 환경에 따라 중복 트리거 |
| `.txt`가 탭에만 보임 | `text/plain` **인라인** 응답 + 링크만으로는 “저장”이 아니라 “열기”로 동작할 수 있음 |

---

## 4. Storage CORS 설정 (텍스트 `fetch` 경로)

텍스트 확장자에 대해 **`fetch`로 받아 저장**하려면 버킷에 CORS가 필요합니다.

```bash
gcloud auth login
gcloud config set project boostclass-7d4fd
cd boostclass
gsutil cors set storage-cors.json gs://boostclass-7d4fd.firebasestorage.app
gsutil cors get gs://boostclass-7d4fd.firebasestorage.app
```

- 버킷 이름은 **본인 Firebase Storage 버킷**과 일치해야 합니다.  
- 로컬 테스트 시 `storage-cors.json`의 `origin`에 예: `http://localhost:5500`, `http://127.0.0.1:5500` 포함.  
- `storage-cors.json`을 수정했다면 **반드시 다시** `gsutil cors set` 실행 후 브라우저 **강력 새로고침(Ctrl+F5)**.

자세한 설명: 루트 **`README-STORAGE-CORS.md`**

---

## 5. 관련 파일

| 경로 | 역할 |
|------|------|
| `js/boost-file-download.js` | 다운로드 로직 (핵심) |
| `js/storage-attachment-meta.js` | 업로드 시 `attachment` 메타 |
| `admin/xhtml/js/ebook-upload-admin.js` | 전자책 다중 파일 업로드 |
| `admin/xhtml/js/course-register-admin.js` | 강의 번들 전자책 업로드 |
| `storage-cors.json` | GCS CORS 규칙 |
| `ebook-download.html` / `course-player.html` | `boost-file-download.js` 로드 (`?v=` 로 캐시 무력화) |

---

## 6. 문제 재발 시 체크리스트

1. **`boost-file-download.js` 최신인지** — HTML의 `?v=` 숫자 올리고 배포했는지  
2. **텍스트만 이상할 때** — `gsutil cors get` 으로 CORS 적용 여부, 로컬 origin 포함 여부  
3. **예전에 올린 파일** — 관리자에서 **해당 파일 재업로드** (attachment 메타)  
4. 브라우저 확장 프로그램이 `fetch`를 막지 않는지  

---

## 7. 배포 시 팁

- HTML에서 스크립트 버전을 올려 캐시를 끊습니다:  
  `js/boost-file-download.js?v=12` → 이후 수정 시 `v=13` …
- 운영 도메인만 쓸 경우 `storage-cors.json`의 `"origin": ["*"]` 를 실제 도메인으로 좁히는 것을 권장합니다.

---

*이 문서는 부스트클래스 Storage 다운로드 UX 확정본 기준으로 유지합니다.*
