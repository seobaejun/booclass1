# Firestore `inquiries` 컬렉션 규칙 예시

1:1 문의 기능을 쓰려면 콘솔에서 `inquiries` 컬렉션과 아래 규칙을 추가하세요.

## 인덱스

- 회원 마이페이지: `uid` (오름차순) + `createdAt` (내림차순) 복합 인덱스  
  → 쿼리 실행 시 콘솔에 표시되는 링크로 생성하면 됩니다.

## 규칙 예시 (member 문서에 `memberType`이 있는 경우)

```text
match /inquiries/{docId} {
  allow read: if request.auth != null && (
    resource.data.uid == request.auth.uid ||
    get(/databases/$(database)/documents/member/$(request.auth.uid)).data.memberType in ['관리자', '강사', '코치']
  );
  allow create: if request.auth != null
    && request.resource.data.uid == request.auth.uid
    && request.resource.data.message is string
    && request.resource.data.message.size() > 0;
  allow update: if request.auth != null
    && get(/databases/$(database)/documents/member/$(request.auth.uid)).data.memberType in ['관리자', '강사', '코치'];
  allow delete: if false;
}
```

관리자 페이지에서 Firestore에 접근하려면 **해당 브라우저에서 Firebase Auth로 로그인**되어 있어야 합니다. (임시 개발용으로 규칙을 완화할 수는 있으나 운영 환경에서는 사용하지 마세요.)
