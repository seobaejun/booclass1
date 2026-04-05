# 전자책 / Storage 다운로드

**상세 가이드(문제·해결·체크리스트):** [`docs/ebook-download-solution.md`](docs/ebook-download-solution.md)

---

## 기본 동작 (현재 코드)

`boost-file-download.js`는 **`<a download>` 한 번 클릭**으로 Storage URL을 엽니다 (iframe 미사용 — 일부 환경에서 **두 번 받아지는 현상** 방지).

- **PDF·이미지 등**: 브라우저/OS 다운로드로 스트리밍에 가깝게 처리됩니다.
- **텍스트(.txt 등)가 웹에만 펼쳐질 때**: 먼저 **`fetch`(CORS 필요)** 로 Blob을 받아 파일로 저장하려고 시도합니다. 이때는 **버킷 CORS**가 필요할 수 있습니다 (`storage-cors.json`).

## 업로드 시 권장 (파일명·다운로드 동작)

관리자 업로드에서 **`Content-Disposition: attachment`** 가 붙도록 되어 있습니다 (`storage-attachment-meta.js`).  
예전에 올린 파일은 **관리자에서 해당 파일만 다시 업로드**하면 동일하게 맞출 수 있습니다.

- 텍스트/PDF가 **웹에 펼쳐 보이는** 경우 → 대개 **attachment 없음** → **재업로드** 권장.

## CORS가 필요한 경우

- **텍스트 확장자**에 대해 **`fetch`로 받아 저장**하는 경로를 쓰려면 버킷 **CORS**가 필요합니다.
- **PDF 등 비텍스트**는 `<a download>`만 쓰는 경우가 많아 **CORS 없이도** 다운로드가 동작할 수 있습니다.

`storage-cors.json` 적용:

```bash
gsutil cors set storage-cors.json gs://boostclass-7d4fd.firebasestorage.app
gsutil cors get gs://boostclass-7d4fd.firebasestorage.app
```

운영 배포 시 `"origin": ["*"]` 대신 실제 도메인으로 좁히는 것을 권장합니다.

```json
"origin": ["https://당신도메인.com", "http://localhost:5500", "http://127.0.0.1:5500"]
```
