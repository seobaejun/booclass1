/**
 * Firestore inquiries 컬렉션 — 1:1 문의
 * 보안 규칙 예시는 파일 하단 주석 참고
 */
(function (global) {
  var COLLECTION = "inquiries";

  function getDb() {
    if (typeof firebase === "undefined" || !firebase.apps || !firebase.apps.length) return null;
    return firebase.firestore();
  }

  /**
   * @param {string} uid
   * @param {{ subject?: string, message: string, userEmail?: string, userName?: string, userPhone?: string }} payload
   */
  function createInquiry(uid, payload) {
    var db = getDb();
    if (!db || !uid) return Promise.reject(new Error("not-ready"));
    var msg = (payload && payload.message) ? String(payload.message).trim() : "";
    if (!msg) return Promise.reject(new Error("empty-message"));
    var data = {
      uid: uid,
      userEmail: (payload && payload.userEmail) ? String(payload.userEmail) : "",
      userName: (payload && payload.userName) ? String(payload.userName) : "",
      userPhone: (payload && payload.userPhone) ? String(payload.userPhone) : "",
      subject: (payload && payload.subject) ? String(payload.subject).trim() : "",
      message: msg,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      reply: "",
      replyAt: null,
      status: "open",
      repliedBy: ""
    };
    return db
      .collection(COLLECTION)
      .add(data)
      .then(function (docRef) {
        if (global.BoostNotifications && global.BoostNotifications.notifyInquiryCreated) {
          var subj = data.subject || "문의";
          return global.BoostNotifications.notifyInquiryCreated(uid, subj).catch(function () {}).then(function () {
            return docRef;
          });
        }
        return docRef;
      });
  }

  /**
   * @param {string} uid
   * @param {function} onNext (docs array of { id, data })
   */
  function inquiryCreatedAtMs(data) {
    var ts = data && data.createdAt;
    if (!ts) return 0;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (ts.seconds != null) return ts.seconds * 1000 + (ts.nanoseconds || 0) / 1e6;
    return 0;
  }

  /**
   * uid만으로 조회 후 클라이언트에서 정렬 (where+orderBy는 복합 인덱스 필요 → 미구성 시 리스너 실패로 목록이 비어 보임)
   */
  function subscribeMyInquiries(uid, onNext, onErr) {
    var db = getDb();
    if (!db || !uid) {
      if (onErr) onErr(new Error("not-ready"));
      return function () {};
    }
    return db
      .collection(COLLECTION)
      .where("uid", "==", uid)
      .onSnapshot(
        function (snap) {
          var list = [];
          snap.forEach(function (d) {
            list.push({ id: d.id, data: d.data() });
          });
          list.sort(function (a, b) {
            return inquiryCreatedAtMs(b.data) - inquiryCreatedAtMs(a.data);
          });
          if (onNext) onNext(list);
        },
        function (err) {
          if (typeof console !== "undefined" && console.error) {
            console.error("BoostInquiry.subscribeMyInquiries", err);
          }
          if (onErr) onErr(err);
        }
      );
  }

  global.BoostInquiry = {
    COLLECTION: COLLECTION,
    createInquiry: createInquiry,
    subscribeMyInquiries: subscribeMyInquiries
  };
})(typeof window !== "undefined" ? window : this);

/*
 * --- Firestore 보안 규칙 예시 (콘솔에 맞게 조정) ---
 *
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     match /inquiries/{docId} {
 *       allow read: if request.auth != null && (
 *         resource.data.uid == request.auth.uid ||
 *         get(/databases/$(database)/documents/member/$(request.auth.uid)).data.memberType in ['관리자','강사','코치']
 *       );
 *       allow create: if request.auth != null
 *         && request.resource.data.uid == request.auth.uid
 *         && request.resource.data.keys().hasAll(['uid','message','createdAt']);
 *       allow update: if request.auth != null
 *         && get(/databases/$(database)/documents/member/$(request.auth.uid)).data.memberType in ['관리자','강사','코치'];
 *     }
 *   }
 * }
 */
