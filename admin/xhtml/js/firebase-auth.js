/**
 * Firebase Authentication 연동
 * - 이메일/비밀번호 로그인, 회원가입
 * - Google 로그인
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const DASHBOARD_URL = 'index.html';
const LOGIN_URL = 'page-login.html';

/**
 * 이메일/비밀번호 로그인
 */
export async function signInEmail(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

/**
 * 이메일/비밀번호 회원가입 (선택: displayName)
 */
export async function signUpEmail(email, password, displayName = '') {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
  }
  return userCredential.user;
}

/**
 * Google 로그인
 */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

/**
 * 로그아웃
 */
export async function signOutUser() {
  await signOut(auth);
}

/**
 * 로그인 상태 변경 리스너
 */
export function subscribeAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Firebase Auth 에러 메시지를 한국어로 변환
 */
export function getAuthErrorMessage(errorCode) {
  const messages = {
    'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
    'auth/invalid-email': '올바른 이메일 형식이 아닙니다.',
    'auth/operation-not-allowed': '해당 로그인 방식이 비활성화되어 있습니다.',
    'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
    'auth/user-disabled': '비활성화된 계정입니다.',
    'auth/user-not-found': '등록되지 않은 이메일입니다.',
    'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
    'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'auth/popup-closed-by-user': '로그인 창이 닫혔습니다.',
    'auth/popup-blocked': '팝업이 차단되었습니다. 브라우저에서 팝업을 허용해 주세요.',
    'auth/cancelled-popup-request': '로그인 요청이 취소되었습니다.'
  };
  return messages[errorCode] || (errorCode || '오류가 발생했습니다.');
}

export { DASHBOARD_URL, LOGIN_URL };
