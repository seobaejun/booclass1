/**
 * Firebase Auth 초기화 및 로그인/회원가입 폼 연동 (스크립트 태그 방식 - 모듈 불필요)
 */
(function () {
  var firebaseConfig = {
    apiKey: "AIzaSyCijM7nOf7xYPKevbOsRrrZTA6XwgODeIM",
    authDomain: "boostclass-7d4fd.firebaseapp.com",
    projectId: "boostclass-7d4fd",
    storageBucket: "boostclass-7d4fd.firebasestorage.app",
    messagingSenderId: "774803491487",
    appId: "1:774803491487:web:daada5b95008a14c2730aa",
    measurementId: "G-MQCQ8F5F1K"
  };

  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK가 로드되지 않았습니다. firebase-app-compat.js, firebase-auth-compat.js를 먼저 로드하세요.');
    return;
  }

  firebase.initializeApp(firebaseConfig);
  var auth = firebase.auth();
  var DASHBOARD_URL = 'index.html';

  function getAuthErrorMessage(code) {
    var messages = {
      'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
      'auth/invalid-email': '올바른 이메일 형식이 아닙니다.',
      'auth/operation-not-allowed': '해당 로그인 방식이 비활성화되어 있습니다.',
      'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
      'auth/user-disabled': '비활성화된 계정입니다.',
      'auth/user-not-found': '등록되지 않은 이메일입니다.',
      'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
      'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
      'auth/invalid-login-credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
      'auth/too-many-requests': '시도 횟수가 많습니다. 잠시 후 다시 시도해 주세요.',
      'auth/popup-closed-by-user': '로그인 창이 닫혔습니다.',
      'auth/popup-blocked': '팝업이 차단되었습니다. 브라우저에서 팝업을 허용해 주세요.',
      'auth/cancelled-popup-request': '로그인 요청이 취소되었습니다.'
    };
    return messages[code] || (code || '오류가 발생했습니다.');
  }

  function runWhenReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  runWhenReady(function () {
    auth.onAuthStateChanged(function (user) {
      if (user && (document.getElementById('loginForm') || document.getElementById('registerForm'))) {
        window.location.href = DASHBOARD_URL;
      }
    });

    var loginForm = document.getElementById('loginForm');
    if (loginForm) {
      var loginError = document.getElementById('loginError');
      var btnLoginSubmit = document.getElementById('btnLoginSubmit');
      var btnGoogleLogin = document.getElementById('btnGoogleLogin');

      function showError(msg) {
        loginError.textContent = msg;
        loginError.classList.remove('d-none');
      }
      function hideError() {
        loginError.classList.add('d-none');
      }
      function setLoading(loading) {
        btnLoginSubmit.disabled = loading;
        btnLoginSubmit.textContent = loading ? '로그인 중…' : '로그인';
      }

      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        hideError();
        var email = document.getElementById('loginEmail').value.trim();
        var password = document.getElementById('loginPassword').value;
        if (!email || !password) {
          showError('이메일과 비밀번호를 입력해 주세요.');
          return;
        }
        setLoading(true);
        auth.signInWithEmailAndPassword(email, password)
          .then(function () {
            window.location.href = DASHBOARD_URL;
          })
          .catch(function (err) {
            showError(getAuthErrorMessage(err.code));
          })
          .finally(function () {
            setLoading(false);
          });
      });

      if (btnGoogleLogin) {
        btnGoogleLogin.addEventListener('click', function () {
          hideError();
          setLoading(true);
          auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
            .then(function () {
              window.location.href = DASHBOARD_URL;
            })
            .catch(function (err) {
              showError(getAuthErrorMessage(err.code));
            })
            .finally(function () {
              setLoading(false);
            });
        });
      }
    });

    var registerForm = document.getElementById('registerForm');
    if (registerForm) {
      var registerError = document.getElementById('registerError');
      var btnRegisterSubmit = document.getElementById('btnRegisterSubmit');
      var btnGoogleSignup = document.getElementById('btnGoogleSignup');

      function showError(msg) {
        registerError.textContent = msg;
        registerError.classList.remove('d-none');
      }
      function hideError() {
        registerError.classList.add('d-none');
      }
      function setLoading(loading) {
        btnRegisterSubmit.disabled = loading;
        btnRegisterSubmit.textContent = loading ? '가입 중…' : '회원가입';
      }

      registerForm.addEventListener('submit', function (e) {
        e.preventDefault();
        hideError();
        var displayName = document.getElementById('registerDisplayName') && document.getElementById('registerDisplayName').value.trim();
        var email = document.getElementById('registerEmail').value.trim();
        var password = document.getElementById('registerPassword').value;
        var passwordConfirm = document.getElementById('registerPasswordConfirm').value;
        if (!email || !password) {
          showError('이메일과 비밀번호를 입력해 주세요.');
          return;
        }
        if (password.length < 6) {
          showError('비밀번호는 6자 이상이어야 합니다.');
          return;
        }
        if (password !== passwordConfirm) {
          showError('비밀번호가 일치하지 않습니다.');
          return;
        }
        setLoading(true);
        auth.createUserWithEmailAndPassword(email, password)
          .then(function (userCredential) {
            if (displayName && userCredential.user) {
              return userCredential.user.updateProfile({ displayName: displayName }).then(function () {
                return userCredential;
              });
            }
            return userCredential;
          })
          .then(function () {
            window.location.href = DASHBOARD_URL;
          })
          .catch(function (err) {
            showError(getAuthErrorMessage(err.code));
          })
          .finally(function () {
            setLoading(false);
          });
      });

      if (btnGoogleSignup) {
        btnGoogleSignup.addEventListener('click', function () {
          hideError();
          setLoading(true);
          auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
            .then(function () {
              window.location.href = DASHBOARD_URL;
            })
            .catch(function (err) {
              showError(getAuthErrorMessage(err.code));
            })
            .finally(function () {
              setLoading(false);
            });
        });
      }
    }
  });
})();
