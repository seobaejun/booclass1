/**
 * 대시보드(index) 구매코드 관리 테이블 — Firestore courses/ebooks, 페이지네이션
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

  /** 오른쪽 카드 높이 기준 — 한 화면에 다 안 들어가면 2페이지 이상으로 나뉨 */
  var PAGE_SIZE = 5;
  var allRows = [];
  var currentPage = 1;

  function escapeAttr(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /** 마스킹(기본): password — 클릭 시 text 로 전환 */
  var ICON_EYE_SHOW =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  var ICON_EYE_HIDE =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

  function buildPurchaseCodeFieldHtml(row, inputClass) {
    var code = row.purchaseCode != null ? String(row.purchaseCode) : "";
    var hasCode = code.length > 0;
    var inputType = hasCode ? "password" : "text";
    var btnDisabled = hasCode ? "" : " disabled";
    return (
      '<div class="input-group input-group-sm purchase-code-input-group">' +
      '<button type="button" class="btn btn-outline-secondary purchase-code-mask-btn js-dash-pc-toggle"' +
      btnDisabled +
      ' title="' +
      (hasCode ? "구매코드 보기" : "코드 입력 후 사용") +
      '" aria-label="구매코드 표시/숨김" aria-pressed="false">' +
      ICON_EYE_SHOW +
      "</button>" +
      '<input type="' +
      inputType +
      '" class="form-control form-control-sm purchase-code-input ' +
      inputClass +
      '" value="' +
      escapeAttr(code) +
      '" placeholder="예: zxcv123" maxlength="80" autocomplete="off" />' +
      "</div>"
    );
  }

  function getDb() {
    if (typeof firebase === "undefined") return null;
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    return firebase.firestore();
  }

  function loadMergedRows() {
    var db = getDb();
    var tbody = document.getElementById("dashboardPurchaseCodeTbody");
    if (!db || !tbody) return;

    tbody.innerHTML =
      '<tr><td colspan="5" class="text-center text-muted py-4">불러오는 중...</td></tr>';

    Promise.all([db.collection("courses").get(), db.collection("ebooks").get()])
      .then(function (results) {
        allRows = [];
        results[0].forEach(function (doc) {
          var d = doc.data() || {};
          allRows.push({
            collection: "courses",
            id: doc.id,
            title: d.courseTitle || "(제목 없음)",
            purchaseCode: d.purchaseCode != null ? String(d.purchaseCode) : "",
            isFree: d.isFree === true
          });
        });
        results[1].forEach(function (doc) {
          var d = doc.data() || {};
          allRows.push({
            collection: "ebooks",
            id: doc.id,
            title: d.title || "(제목 없음)",
            purchaseCode: d.purchaseCode != null ? String(d.purchaseCode) : "",
            isFree: d.isFree === true
          });
        });
        allRows.sort(function (a, b) {
          return a.title.localeCompare(b.title, "ko");
        });
        currentPage = 1;
        renderPage();
      })
      .catch(function (err) {
        console.error("구매코드 목록 로드 실패:", err);
        tbody.innerHTML =
          '<tr><td colspan="5" class="text-center text-danger py-4">불러오기 실패</td></tr>';
        var pagEl = document.getElementById("dashboardPurchaseCodePagination");
        if (pagEl) pagEl.innerHTML = "";
      });
  }

  function renderPage() {
    var tbody = document.getElementById("dashboardPurchaseCodeTbody");
    var rangeEl = document.getElementById("dashboardPurchaseCodeRange");
    var pagEl = document.getElementById("dashboardPurchaseCodePagination");
    if (!tbody) return;

    var total = allRows.length;
    if (total === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="text-center text-muted py-4">등록된 강의·전자책이 없습니다.</td></tr>';
      if (rangeEl) rangeEl.textContent = "총 0개 중 0개 표시";
      if (pagEl) pagEl.innerHTML = "";
      return;
    }

    if (currentPage < 1) currentPage = 1;

    var totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    var start = (currentPage - 1) * PAGE_SIZE;
    var end = Math.min(start + PAGE_SIZE, total);
    var slice = allRows.slice(start, end);

    tbody.innerHTML = slice
      .map(function (row) {
        var kindLabel = row.collection === "courses" ? "강의" : "전자책";
        var badgeClass =
          row.collection === "courses"
            ? "purchase-code-badge--course"
            : "purchase-code-badge--ebook";
        return (
          '<tr data-collection="' +
          escapeAttr(row.collection) +
          '" data-id="' +
          escapeAttr(row.id) +
          '">' +
          '<td><span class="' +
          badgeClass +
          '">' +
          escapeAttr(kindLabel) +
          "</span></td>" +
          "<td>" +
          escapeAttr(row.title) +
          "</td>" +
          "<td>" +
          buildPurchaseCodeFieldHtml(row, "js-dash-pc-code") +
          "</td>" +
          '<td class="text-center">' +
          '<input type="checkbox" class="form-check-input js-dash-pc-free" ' +
          (row.isFree ? "checked" : "") +
          ' title="무료로 공개 시 코드 없이 마이페이지에 표시" />' +
          "</td>" +
          '<td class="text-end">' +
          '<button type="button" class="btn btn-sm btn-purchase-save js-dash-pc-save">저장</button>' +
          "</td>" +
          "</tr>"
        );
      })
      .join("");

    if (rangeEl) {
      rangeEl.textContent =
        "총 " + total + "개 중 " + (start + 1) + "~" + end + "개 표시";
    }
    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    var pagEl = document.getElementById("dashboardPurchaseCodePagination");
    if (!pagEl || totalPages < 1) return;

    var html = [];
    html.push(
      '<li class="page-item' +
        (currentPage <= 1 ? " disabled" : "") +
        '"><a class="page-link purchase-code-page-link" href="#" data-pc-page-action="prev" aria-label="이전 페이지">이전</a></li>'
    );
    var maxButtons = 10;
    var startPage = 1;
    var endPage = totalPages;
    if (totalPages > maxButtons) {
      startPage = Math.max(1, currentPage - 4);
      endPage = Math.min(totalPages, startPage + maxButtons - 1);
      if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
      }
    }
    for (var p = startPage; p <= endPage; p++) {
      html.push(
        '<li class="page-item' +
          (p === currentPage ? " active" : "") +
          '"><a class="page-link purchase-code-page-link" href="#" data-pc-page="' +
          p +
          '">' +
          p +
          "</a></li>"
      );
    }
    html.push(
      '<li class="page-item' +
        (currentPage >= totalPages ? " disabled" : "") +
        '"><a class="page-link purchase-code-page-link" href="#" data-pc-page-action="next" aria-label="다음 페이지">다음</a></li>'
    );
    pagEl.innerHTML = html.join("");

    pagEl.querySelectorAll("a.purchase-code-page-link").forEach(function (a) {
      a.addEventListener("click", function (ev) {
        ev.preventDefault();
        var dp = a.getAttribute("data-pc-page");
        var act = a.getAttribute("data-pc-page-action");
        if (dp != null && dp !== "") {
          currentPage = parseInt(dp, 10) || 1;
        } else if (act === "prev" && currentPage > 1) {
          currentPage--;
        } else if (act === "next" && currentPage < totalPages) {
          currentPage++;
        }
        renderPage();
      });
    });
  }

  function onDocumentClick(ev) {
    var toggleBtn = ev.target.closest(".js-dash-pc-toggle");
    if (toggleBtn) {
      ev.preventDefault();
      if (toggleBtn.disabled) return;
      var group = toggleBtn.closest(".purchase-code-input-group");
      var inp = group && group.querySelector(".js-dash-pc-code");
      if (!inp) return;
      var isHidden = inp.getAttribute("type") === "password";
      if (isHidden) {
        inp.setAttribute("type", "text");
        toggleBtn.setAttribute("aria-pressed", "true");
        toggleBtn.title = "구매코드 숨기기";
        toggleBtn.innerHTML = ICON_EYE_HIDE;
      } else {
        inp.setAttribute("type", "password");
        toggleBtn.setAttribute("aria-pressed", "false");
        toggleBtn.title = "구매코드 보기";
        toggleBtn.innerHTML = ICON_EYE_SHOW;
      }
      return;
    }

    var btn = ev.target.closest(".js-dash-pc-save");
    if (!btn) return;
    var tr = btn.closest("tr[data-collection]");
    if (!tr) return;
    var collection = tr.getAttribute("data-collection");
    var id = tr.getAttribute("data-id");
    var codeInp = tr.querySelector(".js-dash-pc-code");
    var freeChk = tr.querySelector(".js-dash-pc-free");
    var raw = codeInp ? codeInp.value : "";
    var purchaseCode = raw.replace(/^\s+|\s+$/g, "").replace(/^@+/, "");
    var isFree = freeChk && freeChk.checked;

    var db = getDb();
    if (!db || !collection || !id) return;

    btn.disabled = true;
    var prev = btn.textContent;
    btn.textContent = "저장 중…";

    db.collection(collection)
      .doc(id)
      .update({
        purchaseCode: purchaseCode,
        isFree: isFree,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      })
      .then(function () {
        var idx = allRows.findIndex(function (r) {
          return r.collection === collection && r.id === id;
        });
        if (idx >= 0) {
          allRows[idx].purchaseCode = purchaseCode;
          allRows[idx].isFree = isFree;
        }
        renderPage();
      })
      .catch(function (err) {
        console.error("구매코드 저장 실패:", err);
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = prev;
      });
  }

  function run() {
    var tbody = document.getElementById("dashboardPurchaseCodeTbody");
    if (!tbody) return;
    document.body.addEventListener("click", onDocumentClick);
    loadMergedRows();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
