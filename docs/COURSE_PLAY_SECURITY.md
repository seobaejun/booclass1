# 강의 재생 보안 보조 (접근·로그·워터마크)

## 구현 요약

1. **접근 통제**  
   기존과 동일: 로그인 필수 + 수강 권한(또는 무료 강의).  
   Firebase Storage 영상은 **재생 직전 `getDownloadURL()`** 으로 주소를 받아 재생합니다. Firestore에 고정 다운로드 URL만 두는 것보다 유리합니다.

2. **감사 로그**  
   `member/{uid}/playLogs` 서브컬렉션에 이벤트가 쌓입니다.  
   `session_start`, `lecture_ready`, `play`, `pause`, `ended`, `heartbeat`, `tab_hidden` 등.

3. **워터마크**  
   영상 위에 이메일·UID 일부·시각을 표시합니다(유출 추적 보조, 녹화 방지 아님).

## 관리자에서 영상 필드

- **`parts[].videoStoragePath`** (권장): Storage 버킷 루트 기준 경로, 예: `courses/courseId/part1/lec1.mp4`  
- **`parts[].videoStorageUrl`**: 기존처럼 Firebase Storage HTTPS URL — 재생 시 SDK가 `refFromURL` 후 `getDownloadURL()` 로 갱신  
- **외부 URL** (`videoExternalUrl`, `videoUrl`): 그대로 사용(서버 없이 만료 URL 적용 불가)

## Firestore 규칙 (프로덕션 권장)

현재 프로젝트 루트 `firestore.rules` 가 전체 개방이면 누구나 `playLogs` 를 읽을 수 있습니다.  
배포 전 아래처럼 **회원 본인만 `playLogs` 생성** 하도록 분리하는 것을 권장합니다.

> 전역 `match /{document=**} { allow read, write: if true }` 와 **OR** 되면  
> `playLogs` 읽기가 여전히 열릴 수 있으므로, **최종 규칙에서 전역 개방을 제거**하고 컬렉션별로 나누는 편이 안전합니다.

예시(개념):

```
match /member/{memberId}/playLogs/{logId} {
  allow create: if request.auth != null
    && request.auth.uid == memberId
    && request.resource.data.courseId is string
    && request.resource.data.event is string;
  allow read, update, delete: if false;
}
```

관리자 대시보드에서 로그를 보려면 Cloud Functions + Admin SDK 또는 별도 백엔드로 집계하는 방식을 검토하세요.

## Storage 규칙

`storage.rules` 가 전체 개방이면 URL을 아는 사용자는 직접 다운로드할 수 있습니다.  
가능하면 **인증된 사용자만 특정 경로 읽기**로 제한하세요.
