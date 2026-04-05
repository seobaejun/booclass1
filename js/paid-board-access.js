/**
 * 유료 게시판 접근 — Firestore member.memberType 기준
 * 관리자 수강생 목록과 동일: 유료회원 + 강사·코치·관리자(운영·검수)
 */
(function (global) {
  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyCijM7nOf7xYPKevbOsRrrZTA6XwgODeIM",
    authDomain: "boostclass-7d4fd.firebaseapp.com",
    projectId: "boostclass-7d4fd",
    storageBucket: "boostclass-7d4fd.firebasestorage.app",
    messagingSenderId: "774803491487",
    appId: "1:774803491487:web:daada5b95008a14c2730aa"
  };

  var PAID_BOARD_ALLOWED_MEMBER_TYPES = ["유료회원", "강사", "코치", "관리자"];

  function initFirebase() {
    if (typeof firebase === "undefined") return false;
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    return true;
  }

  function canReadPaidBoard(memberType) {
    var t = memberType == null ? "" : String(memberType).trim();
    return PAID_BOARD_ALLOWED_MEMBER_TYPES.indexOf(t) !== -1;
  }

  /**
   * @param {{ onAllowed?: function(), onDenied?: function(string, string) }} opts
   * onDenied(reason, memberType?) — reason: 'guest' | 'forbidden' | 'error' | 'no-firebase'
   */
  function runGuard(opts) {
    opts = opts || {};
    if (!initFirebase()) {
      if (opts.onDenied) opts.onDenied("no-firebase");
      return;
    }
    var auth = firebase.auth();
    var db = firebase.firestore();
    auth.onAuthStateChanged(function (user) {
      if (!user) {
        if (opts.onDenied) opts.onDenied("guest");
        return;
      }
      db.collection("member")
        .doc(user.uid)
        .get()
        .then(function (doc) {
          var mt = doc.exists && doc.data() ? doc.data().memberType : "";
          if (canReadPaidBoard(mt)) {
            if (opts.onAllowed) opts.onAllowed();
          } else {
            if (opts.onDenied) opts.onDenied("forbidden", mt);
          }
        })
        .catch(function () {
          if (opts.onDenied) opts.onDenied("error");
        });
    });
  }

  global.PaidBoardAccess = {
    canReadPaidBoard: canReadPaidBoard,
    runGuard: runGuard
  };
})(typeof window !== "undefined" ? window : this);
