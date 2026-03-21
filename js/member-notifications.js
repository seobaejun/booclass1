/**
 * 회원 member 문서의 notificationItems 배열 (최근 알림, 클라이언트 Timestamp)
 * 1:1 문의 등록/삭제는 추후 로직에서 BoostNotifications.notifyInquiryCreated 등 호출
 */
(function (global) {
  var NOTIFICATION_MAX = 100;

  function getDb() {
    if (typeof firebase === "undefined" || !firebase.apps || !firebase.apps.length) return null;
    return firebase.firestore();
  }

  function generateId() {
    return "n_" + Date.now() + "_" + Math.random().toString(36).slice(2, 11);
  }

  /**
   * @param {string} uid
   * @param {{ type?: string, title: string, body?: string }} partial
   */
  function pushNotification(uid, partial) {
    var db = getDb();
    if (!db || !uid) return Promise.reject(new Error("not-ready"));
    var ref = db.collection("member").doc(uid);
    return ref.get().then(function (doc) {
      var data = doc.exists ? doc.data() : {};
      var arr = Array.isArray(data.notificationItems) ? data.notificationItems.slice() : [];
      var n = {
        id: generateId(),
        type: partial.type || "general",
        title: partial.title || "",
        body: partial.body || "",
        createdAt:
          firebase.firestore.Timestamp && firebase.firestore.Timestamp.now
            ? firebase.firestore.Timestamp.now()
            : new Date()
      };
      arr.unshift(n);
      if (arr.length > NOTIFICATION_MAX) {
        arr = arr.slice(0, NOTIFICATION_MAX);
      }
      return ref.set({ notificationItems: arr }, { merge: true });
    });
  }

  function notifySignupWelcome(uid) {
    return pushNotification(uid, {
      type: "signup",
      title: "회원가입을 환영합니다",
      body: "부스트클래스 가입이 완료되었습니다."
    });
  }

  function notifyWishAdded(uid, productTitle) {
    var t = productTitle || "상품";
    return pushNotification(uid, {
      type: "wish_add",
      title: "찜 목록에 추가되었습니다",
      body: '"' + t + '"을(를) 찜했습니다.'
    });
  }

  function notifyWishRemoved(uid, productTitle) {
    var t = productTitle || "상품";
    return pushNotification(uid, {
      type: "wish_remove",
      title: "찜 목록에서 삭제되었습니다",
      body: '"' + t + '" 찜이 해제되었습니다.'
    });
  }

  function notifyCartAdded(uid, productTitle) {
    var t = productTitle || "상품";
    return pushNotification(uid, {
      type: "cart_add",
      title: "장바구니에 담았습니다",
      body: '"' + t + '"이(가) 장바구니에 추가되었습니다.'
    });
  }

  function notifyCartRemoved(uid, productTitle) {
    var t = productTitle || "상품";
    return pushNotification(uid, {
      type: "cart_remove",
      title: "장바구니에서 삭제되었습니다",
      body: '"' + t + '"을(를) 장바구니에서 제거했습니다.'
    });
  }

  /**
   * 관리자가 memberType 변경 시 (회원 등업/변경)
   * @param {string} uid
   * @param {string} previousLabel 표시용 이전 등급
   * @param {string} newLabel 표시용 새 등급
   */
  function notifyMemberTypeChanged(uid, previousLabel, newLabel) {
    var prev = previousLabel || "미지정";
    var next = newLabel || "미지정";
    if (prev === next) return Promise.resolve();
    return pushNotification(uid, {
      type: "grade_up",
      title: "회원 등급이 변경되었습니다",
      body: prev + " → " + next
    });
  }

  /**
   * 1:1 문의 등록 완료 시 호출 (문의 로직 구현 후 연결)
   * @param {string} [summary] 문의 제목/요약
   */
  function notifyInquiryCreated(uid, summary) {
    return pushNotification(uid, {
      type: "inquiry_create",
      title: "1:1 문의가 등록되었습니다",
      body: summary ? String(summary) : "문의가 접수되었습니다."
    });
  }

  /**
   * 1:1 문의 삭제 시 호출 (문의 로직 구현 후 연결)
   */
  function notifyInquiryDeleted(uid, summary) {
    return pushNotification(uid, {
      type: "inquiry_delete",
      title: "1:1 문의가 삭제되었습니다",
      body: summary ? String(summary) : "문의가 삭제 처리되었습니다."
    });
  }

  /**
   * 관리자가 문의에 답변 등록 시 회원에게 알림
   * @param {string} uid
   * @param {string} [subjectLine] 문의 제목
   * @param {string} [replyPreview] 답변 미리보기
   */
  function notifyInquiryReply(uid, subjectLine, replyPreview) {
    var sub = subjectLine ? String(subjectLine).trim() : "";
    var prev = replyPreview ? String(replyPreview).trim() : "";
    if (prev.length > 120) prev = prev.slice(0, 120) + "…";
    var body = sub ? "「" + sub + "」" + (prev ? " — " + prev : "") : prev || "마이페이지 1:1 문의에서 전체 답변을 확인하세요.";
    return pushNotification(uid, {
      type: "inquiry_reply",
      title: "1:1 문의에 답변이 등록되었습니다",
      body: body
    });
  }

  /**
   * 알림 한 건 삭제 (id 우선, 없으면 index)
   * @param {string} uid
   * @param {{ id?: string, index?: number }} opts
   */
  function removeNotificationEntry(uid, opts) {
    opts = opts || {};
    var db = getDb();
    if (!db || !uid) return Promise.reject(new Error("not-ready"));
    var ref = db.collection("member").doc(uid);
    return ref.get().then(function (doc) {
      var data = doc.exists ? doc.data() : {};
      var arr = Array.isArray(data.notificationItems) ? data.notificationItems.slice() : [];
      var next;
      if (opts.id) {
        next = arr.filter(function (x) {
          return x && x.id !== opts.id;
        });
      } else if (typeof opts.index === "number" && opts.index >= 0 && opts.index < arr.length) {
        next = arr.filter(function (_, i) {
          return i !== opts.index;
        });
      } else {
        return Promise.reject(new Error("invalid-notification-target"));
      }
      return ref.set({ notificationItems: next }, { merge: true });
    });
  }

  function clearAllNotifications(uid) {
    var db = getDb();
    if (!db || !uid) return Promise.reject(new Error("not-ready"));
    var ref = db.collection("member").doc(uid);
    return ref.set({ notificationItems: [] }, { merge: true });
  }

  global.BoostNotifications = {
    pushNotification: pushNotification,
    removeNotificationEntry: removeNotificationEntry,
    clearAllNotifications: clearAllNotifications,
    notifySignupWelcome: notifySignupWelcome,
    notifyWishAdded: notifyWishAdded,
    notifyWishRemoved: notifyWishRemoved,
    notifyCartAdded: notifyCartAdded,
    notifyCartRemoved: notifyCartRemoved,
    notifyMemberTypeChanged: notifyMemberTypeChanged,
    notifyInquiryCreated: notifyInquiryCreated,
    notifyInquiryDeleted: notifyInquiryDeleted,
    notifyInquiryReply: notifyInquiryReply
  };
})(typeof window !== "undefined" ? window : this);
