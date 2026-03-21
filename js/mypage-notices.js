/**
 * 마이페이지 우측 상단 공지사항 — Firestore site_notices, 게시판과 동일한 목록 UI
 */
(function () {
  var COLLECTION = "site_notices";
  var PAGE_SIZE = 5;
  var firebaseConfig = {
    apiKey: "AIzaSyCijM7nOf7xYPKevbOsRrrZTA6XwgODeIM",
    authDomain: "boostclass-7d4fd.firebaseapp.com",
    projectId: "boostclass-7d4fd",
    storageBucket: "boostclass-7d4fd.firebasestorage.app",
    messagingSenderId: "774803491487",
    appId: "1:774803491487:web:daada5b95008a14c2730aa"
  };

  var cachedDocs = [];
  var currentPage = 1;
  var unsub = null;

  function escapeHtml(s) {
    if (s == null) return "";
    var d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML;
  }

  function formatDate(ts) {
    if (!ts) return "";
    try {
      if (typeof ts.toDate === "function") {
        var d = ts.toDate();
        return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
      }
    } catch (e) {}
    return "";
  }

  function getDocTime(d) {
    var ts = d.createdAt || d.updatedAt;
    if (!ts) return 0;
    if (ts.toMillis) return ts.toMillis();
    if (ts.toDate) return ts.toDate().getTime();
    return 0;
  }

  var PAGINATION_WINDOW = 7;

  function renderPagination(totalPages) {
    var nav = document.getElementById("mypageNoticePagination");
    if (!nav) return;
    if (totalPages < 1) totalPages = 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    var pageStart = 1;
    var pageEnd = totalPages;
    if (totalPages > PAGINATION_WINDOW) {
      pageStart = Math.max(1, currentPage - Math.floor(PAGINATION_WINDOW / 2));
      pageEnd = Math.min(totalPages, pageStart + PAGINATION_WINDOW - 1);
      if (pageEnd - pageStart + 1 < PAGINATION_WINDOW) {
        pageStart = Math.max(1, pageEnd - PAGINATION_WINDOW + 1);
      }
    }

    var html = '<div class="board-pagination-inner">';
    var prevDisabled = currentPage <= 1;
    var nextDisabled = currentPage >= totalPages;
    html +=
      '<button type="button" class="board-pagination-arrow' +
      (prevDisabled ? " is-disabled" : "") +
      '" data-mypage-notice-page="' +
      (currentPage - 1) +
      '" aria-label="이전"' +
      (prevDisabled ? " disabled" : "") +
      ">&#10094;</button>";
    html += '<span class="board-pagination-numbers">';
    for (var i = pageStart; i <= pageEnd; i++) {
      if (i === currentPage) {
        html += '<span class="board-pagination-num is-current" aria-current="page">' + i + "</span>";
      } else {
        html +=
          '<button type="button" class="board-pagination-num" data-mypage-notice-page="' +
          i +
          '">' +
          i +
          "</button>";
      }
    }
    html += "</span>";
    html +=
      '<button type="button" class="board-pagination-arrow' +
      (nextDisabled ? " is-disabled" : "") +
      '" data-mypage-notice-page="' +
      (currentPage + 1) +
      '" aria-label="다음"' +
      (nextDisabled ? " disabled" : "") +
      ">&#10095;</button>";
    html += "</div>";
    nav.innerHTML = html;
  }

  function renderList() {
    var root = document.getElementById("mypageNoticeListRoot");
    if (!root) return;

    var total = cachedDocs.length;
    var totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (total === 0) {
      root.innerHTML = '<p class="text-white-50 mb-0">등록된 공지사항이 없습니다.</p>';
      renderPagination(1);
      return;
    }

    var start = (currentPage - 1) * PAGE_SIZE;
    var pageItems = cachedDocs.slice(start, start + PAGE_SIZE);

    var html = '<div class="board-list-table">';
    html +=
      '<div class="board-list-header border-bottom border-secondary py-2 text-white-50 small">';
    html +=
      '<span class="board-list-col-no">번호</span><span class="board-list-col-title">제목</span><span class="board-list-col-date">작성일</span>';
    html += "</div>";
    html += '<ul class="list-unstyled mb-0 board-list">';
    pageItems.forEach(function (item, idx) {
      var globalNo = start + idx + 1;
      var title = item.title || "(제목 없음)";
      var dateStr = formatDate(item.createdAt || item.updatedAt);
      var collapseId = "mypageNoticeCollapse-" + (start + idx);
      var bodyHtml =
        item.content != null && item.content !== ""
          ? String(item.content)
          : item.body || item.context || item.description || "";
      html += '<li class="board-list-item border-bottom border-secondary">';
      html +=
        '<button type="button" class="board-list-row text-white py-3 d-flex align-items-center flex-wrap w-100" style="background:transparent;border:none;" data-bs-toggle="collapse" data-bs-target="#' +
        collapseId +
        '" aria-expanded="false" aria-controls="' +
        collapseId +
        '">';
      html += '<span class="board-list-col-no">' + globalNo + "</span>";
      html += '<span class="board-list-col-title text-start">' + escapeHtml(title) + "</span>";
      html += '<span class="board-list-col-date text-white-50 small">' + escapeHtml(dateStr) + "</span>";
      html += "</button>";
      html += '<div class="collapse" id="' + collapseId + '">';
      html +=
        '<div class="mypage-notice-detail-inner border-top border-secondary pt-0">' +
        bodyHtml +
        "</div>";
      html += "</div></li>";
    });
    html += "</ul></div>";
    root.innerHTML = html;
    renderPagination(totalPages);
  }

  function bindPagination() {
    var nav = document.getElementById("mypageNoticePagination");
    if (!nav || nav._mypageNoticeBound) return;
    nav._mypageNoticeBound = true;
    nav.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-mypage-notice-page]");
      if (!btn) return;
      if (btn.disabled) return;
      var p = parseInt(btn.getAttribute("data-mypage-notice-page"), 10);
      if (isNaN(p) || p < 1) return;
      var totalPages = Math.max(1, Math.ceil(cachedDocs.length / PAGE_SIZE));
      if (p > totalPages) return;
      currentPage = p;
      renderList();
    });
  }

  function run() {
    var root = document.getElementById("mypageNoticeListRoot");
    if (!root) return;
    if (typeof firebase === "undefined" || !firebase.firestore) return;
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();
    bindPagination();

    if (unsub) unsub();
    /**
     * orderBy(createdAt)는 필드 누락 문서 제외·인덱스 이슈가 있을 수 있어
     * 전체 조회 후 클라이언트에서 정렬합니다.
     */
    unsub = db
      .collection(COLLECTION)
      .limit(500)
      .onSnapshot(
        function (snap) {
          var list = [];
          snap.forEach(function (doc) {
            var d = doc.data() || {};
            d._id = doc.id;
            list.push(d);
          });
          list.sort(function (a, b) {
            return getDocTime(b) - getDocTime(a);
          });
          cachedDocs = list;
          var totalPages = Math.max(1, Math.ceil(cachedDocs.length / PAGE_SIZE));
          if (currentPage > totalPages) currentPage = totalPages;
          renderList();
        },
        function (err) {
          root.innerHTML =
            '<p class="text-danger small mb-0">공지사항을 불러오지 못했습니다. ' +
            escapeHtml(err.message || String(err)) +
            "</p>";
        }
      );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
