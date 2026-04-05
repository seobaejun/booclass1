/**
 * Firebase 설정
 * 실제 값은 .env에 두고, 배포 시 이 파일을 .env 값으로 채우거나 빌드 시 치환하세요.
 * Firebase 클라이언트 API 키는 공개되어도 되며, Firebase Console에서 도메인 제한으로 보호됩니다.
 *
 * Firebase Console에서 반드시 설정:
 * - Authentication > Sign-in method > 이메일/비밀번호 사용 설정
 * - Authentication > Sign-in method > Google 사용 설정 (Google 로그인 시)
 */
export const firebaseConfig = {
  apiKey: "AIzaSyCijM7nOf7xYPKevbOsRrrZTA6XwgODeIM",
  authDomain: "boostclass-7d4fd.firebaseapp.com",
  projectId: "boostclass-7d4fd",
  storageBucket: "boostclass-7d4fd.firebasestorage.app",
  messagingSenderId: "774803491487",
  appId: "1:774803491487:web:daada5b95008a14c2730aa",
  measurementId: "G-MQCQ8F5F1K"
};
