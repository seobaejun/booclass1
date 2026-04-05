/**
 * 관리자 구매코드 관리: courses / ebooks 의 purchaseCode, isFree 필드 편집
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

  function escapeAttr(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  var ICON_EYE_SHOW =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  var ICON_EYE_HIDE =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

  function buildPcInputGroup(code, placeholder) {
    var hasCode = String(code || "").length > 0;
    var inputType = hasCode ? "password" : "text";
    var btnDisabled = hasCode ? "" : " disabled";
    return (
      '<div class="input-group input-group-sm purchase-code-input-group">' +
      '<button type="button" class="btn btn-outline-secondary purchase-code-mask-btn js-pc-toggle"' +
      btnDisabled +
      ' title="' +
      (hasCode ? "구매코드 보기" : "코드 입력 후 사용") +
      '" aria-label="구매코드 표시/숨김" aria-pressed="false">' +
      ICON_EYE_SHOW +
      "</button>" +
      '<input type="' +
      inputType +
      '" class="form-control form-control-sm purchase-code-input js-pc-code" value="' +
      escapeAttr(code) +
      '" placeholder="' +
      escapeAttr(placeholder) +
      '" maxlength="80" autocomplete="off" />' +
      "</div>"
    );
  }

  function setMessage(text, isError) {
    var msgEl = document.getElementById("purchaseCodeAdminMessage");
    if (!msgEl) return;
    msgEl.textContent = text || "";
    msgEl.className = "alert " + (isError ? "alert-danger" : "alert-success") + " mb-3";
    if (text) msgEl.classList.remove("d-none");
    else msgEl.classList.add("d-none");
  }

  function run() {
    if (typeof firebase === "undefined") {
      setMessage("Firebase를 불러올 수 없습니다.", true);
      return;
    }
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();

    var tbodyCourses = document.getElementById("purchaseCodeCoursesTbody");
    var tbodyEbooks = document.getElementById("purchaseCodeEbooksTbody");
    if (!tbodyCourses || !tbodyEbooks) return;

    function renderEmptyCourse() {
      tbodyCourses.innerHTML =
        '<tr><td colspan="4" class="text-center text-muted py-4">등록된 강의가 없습니다.</td></tr>';
    }

    function renderEmptyEbook() {
      tbodyEbooks.innerHTML =
        '<tr><td colspan="4" class="text-center text-muted py-4">등록된 전자책이 없습니다.</td></tr>';
    }

    function loadAll() {
      setMessage("", false);
      tbodyCourses.innerHTML =
        '<tr><td colspan="4" class="text-center text-muted py-4">불러오는 중...</td></tr>';
      tbodyEbooks.innerHTML =
        '<tr><td colspan="4" class="text-center text-muted py-4">불러오는 중...</td></tr>';

      Promise.all([db.collection("courses").get(), db.collection("ebooks").get()])
        .then(function (results) {
          var courseSnap = results[0];
          var ebookSnap = results[1];

          if (courseSnap.empty) {
            renderEmptyCourse();
          } else {
            var cdocs = courseSnap.docs.slice();
            cdocs.sort(function (a, b) {
              var ta = a.data().courseTitle || "";
              var tb = b.data().courseTitle || "";
              return ta.localeCompare(tb, "ko");
            });
            tbodyCourses.innerHTML = cdocs
              .map(function (doc) {
                var d = doc.data() || {};
                var title = d.courseTitle || "(제목 없음)";
                var code = d.purchaseCode != null ? String(d.purchaseCode) : "";
                var isFree = d.isFree === true;
                var id = doc.id;
                return (
                  "<tr data-collection=\"courses\" data-id=\"" +
                  escapeAttr(id) +
                  "\">" +
                  "<td>" +
                  escapeAttr(title) +
                  "</td>" +
                  "<td>" +
                  buildPcInputGroup(code, "예: zxcv123") +
                  "</td>" +
                  '<td class="text-center">' +
                  '<input type="checkbox" class="form-check-input js-pc-free" ' +
                  (isFree ? "checked" : "") +
                  " />" +
                  "</td>" +
                  '<td class="text-end">' +
                  '<button type="button" class="btn btn-primary btn-sm js-pc-save">저장</button>' +
                  "</td>" +
                  "</tr>"
                );
              })
              .join("");
          }

          if (ebookSnap.empty) {
            renderEmptyEbook();
          } else {
            var edocs = ebookSnap.docs.slice();
            edocs.sort(function (a, b) {
              var ta = a.data().title || "";
              var tb = b.data().title || "";
              return ta.localeCompare(tb, "ko");
            });
            tbodyEbooks.innerHTML = edocs
              .map(function (doc) {
                var d = doc.data() || {};
                var title = d.title || "(제목 없음)";
                var code = d.purchaseCode != null ? String(d.purchaseCode) : "";
                var isFree = d.isFree === true;
                var id = doc.id;
                return (
                  "<tr data-collection=\"ebooks\" data-id=\"" +
                  escapeAttr(id) +
                  "\">" +
                  "<td>" +
                  escapeAttr(title) +
                  "</td>" +
                  "<td>" +
                  buildPcInputGroup(code, "예: asdf456") +
                  "</td>" +
                  '<td class="text-center">' +
                  '<input type="checkbox" class="form-check-input js-pc-free" ' +
                  (isFree ? "checked" : "") +
                  " />" +
                  "</td>" +
                  '<td class="text-end">' +
                  '<button type="button" class="btn btn-primary btn-sm js-pc-save">저장</button>' +
                  "</td>" +
                  "</tr>"
                );
              })
              .join("");
          }
        })
        .catch(function (err) {
          console.error(err);
          setMessage("불러오기 실패: " + (err.message || err), true);
          tbodyCourses.innerHTML =
            '<tr><td colspan="4" class="text-center text-danger py-4">오류</td></tr>';
          tbodyEbooks.innerHTML =
            '<tr><td colspan="4" class="text-center text-danger py-4">오류</td></tr>';
        });
    }

    function onTableClick(ev) {
      var toggleBtn = ev.target.closest(".js-pc-toggle");
      if (toggleBtn) {
        ev.preventDefault();
        if (toggleBtn.disabled) return;
        var group = toggleBtn.closest(".purchase-code-input-group");
        var inp = group && group.querySelector(".js-pc-code");
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

      var btn = ev.target.closest(".js-pc-save");
      if (!btn) return;
      var tr = btn.closest("tr[data-collection]");
      if (!tr) return;
      var collection = tr.getAttribute("data-collection");
      var id = tr.getAttribute("data-id");
      if (!collection || !id) return;

      var codeInp = tr.querySelector(".js-pc-code");
      var freeChk = tr.querySelector(".js-pc-free");
      var raw = codeInp ? codeInp.value : "";
      var purchaseCode = raw.replace(/^\s+|\s+$/g, "").replace(/^@+/, "");
      var isFree = freeChk && freeChk.checked;

      btn.disabled = true;
      var prev = btn.textContent;
      btn.textContent = "저장 중…";

      var payload = {
        purchaseCode: purchaseCode,
        isFree: isFree,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      db.collection(collection)
        .doc(id)
        .update(payload)
        .then(function () {
          setMessage("저장되었습니다.", false);
          btn.disabled = false;
          btn.textContent = prev;
        })
        .catch(function (err) {
          console.error(err);
          setMessage("저장 실패: " + (err.message || err), true);
          btn.disabled = false;
          btn.textContent = prev;
        });
    }

    document.body.addEventListener("click", onTableClick);
    loadAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
