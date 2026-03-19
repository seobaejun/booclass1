/**
 * Firebase 초기화 (연결 시 사용)
 * - Vite 등 빌드 도구 사용 시: 이 파일을 firebase-config.js로 복사 후
 *   import.meta.env.VITE_FIREBASE_* 값이 주입됩니다.
 * - 정적 HTML만 사용 시: .env는 브라우저에서 읽지 못하므로
 *   firebase-config.js에 직접 config 객체를 넣고, 해당 파일은 .gitignore에 두세요.
 */
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env?.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export { app, analytics };
