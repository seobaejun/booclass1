/**
 * 헤더 로그인/회원가입/마이페이지/로그아웃 표시 (공통)
 * Firebase Auth 로그인 상태에 따라 headerGuest / headerUser 토글
 * 푸터 관리자 링크는 관리자 이메일 로그인 시에만 표시
 */
(function () {
  var ADMIN_EMAIL = "sprince1004@naver.com";

  var config = {
    apiKey: "AIzaSyCijM7nOf7xYPKevbOsRrrZTA6XwgODeIM",
    authDomain: "boostclass-7d4fd.firebaseapp.com",
    projectId: "boostclass-7d4fd",
    storageBucket: "boostclass-7d4fd.firebasestorage.app",
    messagingSenderId: "774803491487",
    appId: "1:774803491487:web:daada5b95008a14c2730aa"
  };

  function run() {
    if (typeof firebase === "undefined") return false;
    if (!firebase.apps.length) firebase.initializeApp(config);
    var auth = firebase.auth();

    function updateHeader(user) {
      var guest = document.getElementById("headerGuest");
      var userEl = document.getElementById("headerUser");
      if (guest && userEl) {
        if (user) {
          guest.classList.add("d-none");
          userEl.classList.remove("d-none");
        } else {
          guest.classList.remove("d-none");
          userEl.classList.add("d-none");
        }
      }
      var footerAdmin = document.getElementById("footerAdminLink");
      if (footerAdmin) {
        if (user && user.email === ADMIN_EMAIL) {
          footerAdmin.classList.remove("d-none");
        } else {
          footerAdmin.classList.add("d-none");
        }
      }
    }

    auth.onAuthStateChanged(function (user) { updateHeader(user); });

    var btn = document.getElementById("btnHeaderLogout");
    if (btn) btn.addEventListener("click", function () { auth.signOut(); });
    return true;
  }

  if (run()) return;
  document.addEventListener("DOMContentLoaded", function () {
    var tries = 0;
    var t = setInterval(function () {
      if (run() || ++tries > 50) clearInterval(t);
    }, 100);
  });
})();
