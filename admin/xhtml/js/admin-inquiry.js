/**
 * 관리자 1:1 문의 목록·답변 (student-detail.html)
 * Firestore inquiries 컬렉션 — 회원 문의·관리자 답변
 */
(function () {
  var firebaseConfig = {
    apiKey: "AIzaSyCijM7nOf7xYPKevbOsRrrZTA6XwgODeIM",
    authDomain: "boostclass-7d4fd.firebaseapp.com",
    projectId: "boostclass-7d4fd",
    storageBucket: "boostclass-7d4fd.firebasestorage.app",
    messagingSenderId: "774803491487",
    appId: "1:774803491487:web:daada5b95008a14c2730aa"
  };

  var COLLECTION = "inquiries";
  var FILTER_ALL = "all";
  var FILTER_UNANSWERED = "unanswered";
  var currentDocs = [];
  var currentFilter = FILTER_ALL;

  function getDb() {
    if (typeof firebase === "undefined" || !firebase.apps || !firebase.apps.length) return null;
    return firebase.firestore();
  }

  function escapeHtml(s) {
    if (s == null) return "";
    var d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML;
  }

  function formatTs(ts) {
    if (!ts || typeof ts.toDate !== "function") return "—";
    try {
      return ts.toDate().toLocaleString("ko-KR");
    } catch (e) {
      return "—";
    }
  }

  function shortUid(uid) {
    if (!uid || typeof uid !== "string") return "—";
    return uid.length > 12 ? escapeHtml(uid.slice(0, 10)) + "…" : escapeHtml(uid);
  }

  function countUnanswered(docs) {
    var n = 0;
    for (var i = 0; i < docs.length; i++) {
      var r = docs[i].data.reply;
      if (!r || !String(r).trim()) n++;
    }
    return n;
  }

  function renderToolbar(total, unanswered) {
    var btnAll =
      currentFilter === FILTER_ALL ? "btn-primary" : "btn-outline-primary";
    var btnUn =
      currentFilter === FILTER_UNANSWERED ? "btn-warning" : "btn-outline-warning";
    return (
      '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">' +
      '<div class="small text-muted">총 <strong>' +
      total +
      "</strong>건 · 미답변 <strong class=\"text-warning\">" +
      unanswered +
      "</strong>건</div>" +
      '<div class="btn-group btn-group-sm" role="group" aria-label="문의 필터">' +
      '<button type="button" class="btn ' +
      btnAll +
      ' admin-inquiry-filter-btn" data-filter="' +
      FILTER_ALL +
      '">전체</button>' +
      '<button type="button" class="btn ' +
      btnUn +
      ' admin-inquiry-filter-btn" data-filter="' +
      FILTER_UNANSWERED +
      '">미답변만</button>' +
      "</div></div>"
    );
  }

  function renderList(docs, root) {
    currentDocs = docs;
    var unanswered = countUnanswered(docs);
    var filtered = docs;
    if (currentFilter === FILTER_UNANSWERED) {
      filtered = docs.filter(function (item) {
        var r = item.data.reply;
        return !r || !String(r).trim();
      });
    }

    if (!docs.length) {
      root.innerHTML =
        '<div class="alert alert-info mb-0">등록된 1:1 문의가 없습니다.</div>';
      return;
    }

    var toolbar = renderToolbar(docs.length, unanswered);

    if (!filtered.length) {
      root.innerHTML =
        toolbar +
        '<div class="alert alert-secondary mb-0">필터 조건에 해당하는 문의가 없습니다.</div>';
      return;
    }

    var html = [toolbar];
    for (var i = 0; i < filtered.length; i++) {
      var item = filtered[i];
      var d = item.data;
      var id = escapeHtml(item.id);
      var sub = escapeHtml(d.subject || "(제목 없음)");
      var msg = escapeHtml(d.message || "");
      var name = escapeHtml(d.userName || "-");
      var em = escapeHtml(d.userEmail || "-");
      var ph = escapeHtml(d.userPhone || "-");
      var uidShort = shortUid(d.uid);
      var hasReply = !!(d.reply && String(d.reply).trim());
      var rep = hasReply ? escapeHtml(String(d.reply)) : "";
      var statusBadge = hasReply
        ? '<span class="badge badge-success">답변완료</span>'
        : '<span class="badge badge-warning text-dark">미답변</span>';
      var replyArea =
        '<div class="mt-3">' +
        '<label class="form-label">관리자 답변</label>' +
        '<textarea class="form-control admin-inquiry-reply-text mb-2" rows="4" data-inquiry-id="' +
        id +
        '" placeholder="답변 내용을 입력하세요.">' +
        (hasReply ? rep : "") +
        "</textarea>" +
        '<button type="button" class="btn btn-primary btn-sm admin-inquiry-save-btn" data-inquiry-id="' +
        id +
        '">' +
        (hasReply ? "답변 수정" : "답변 등록") +
        "</button>" +
        "</div>";
      html.push(
        '<div class="card mb-3 border">' +
          '<div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">' +
          '<strong>' +
          sub +
          "</strong> " +
          statusBadge +
          "</div>" +
          '<div class="card-body">' +
          '<p class="small text-muted mb-2">' +
          formatTs(d.createdAt) +
          " · " +
          name +
          " · " +
          em +
          " · " +
          ph +
          " · UID " +
          uidShort +
          "</p>" +
          '<div class="mb-2"><strong>문의 내용</strong></div>' +
          '<div class="border rounded p-3 bg-light text-dark" style="white-space:pre-wrap;">' +
          msg +
          "</div>" +
          replyArea +
          "</div>" +
          "</div>"
      );
    }
    root.innerHTML = html.join("");
  }

  function init() {
    var root = document.getElementById("adminInquiryListRoot");
    if (!root) return;
    if (typeof firebase === "undefined") {
      root.innerHTML =
        '<div class="alert alert-danger">Firebase를 불러올 수 없습니다.</div>';
      return;
    }
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    var db = getDb();
    if (!db) return;

    db.collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(200)
      .onSnapshot(
        function (snap) {
          var docs = [];
          snap.forEach(function (doc) {
            docs.push({ id: doc.id, data: doc.data() });
          });
          renderList(docs, root);
        },
        function (err) {
          root.innerHTML =
            '<div class="alert alert-danger">문의 목록을 불러오지 못했습니다. Firestore 인덱스·규칙을 확인하세요.<br><small>' +
            escapeHtml(err.message || String(err)) +
            "</small></div>";
        }
      );

    root.addEventListener("click", function (ev) {
      var filterBtn = ev.target.closest(".admin-inquiry-filter-btn");
      if (filterBtn) {
        var f = filterBtn.getAttribute("data-filter");
        if (f === FILTER_ALL || f === FILTER_UNANSWERED) {
          currentFilter = f;
          renderList(currentDocs, root);
        }
        return;
      }

      var btn = ev.target.closest(".admin-inquiry-save-btn");
      if (!btn) return;
      var inquiryId = btn.getAttribute("data-inquiry-id");
      if (!inquiryId) return;
      var card = btn.closest(".card");
      var ta = card ? card.querySelector("textarea.admin-inquiry-reply-text") : null;
      if (!ta) return;
      var text = (ta.value || "").trim();
      if (!text) {
        alert("답변 내용을 입력해 주세요.");
        return;
      }
      btn.disabled = true;
      var prev = btn.textContent;
      btn.textContent = "저장 중…";
      db.collection(COLLECTION)
        .doc(inquiryId)
        .get()
        .then(function (doc) {
          if (!doc.exists) throw new Error("문의를 찾을 수 없습니다.");
          var before = doc.data();
          var uid = before.uid;
          var subj = before.subject || "";
          return db
            .collection(COLLECTION)
            .doc(inquiryId)
            .update({
              reply: text,
              replyAt: firebase.firestore.FieldValue.serverTimestamp(),
              status: "answered",
              repliedBy: (firebase.auth().currentUser && firebase.auth().currentUser.email) || ""
            })
            .then(function () {
              // 마이페이지 알림·문자: Firebase Functions(onInquiryReply)에서 Admin SDK로 처리
              // (관리자 세션은 다른 회원 member 문서에 쓰기 권한이 없을 수 있음)
            });
        })
        .catch(function (e) {
          alert("저장 실패: " + (e.message || e));
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = prev;
        });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
