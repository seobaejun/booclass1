/**
 * 전자책 다운로드 — Firestore ebooks, ownedEbookItems 또는 isFree
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

  var params = new URLSearchParams(window.location.search);
  var ebookId = params.get("id");
  var rootEl = document.getElementById("ebdRoot");

  function showError(html) {
    if (!rootEl) return;
    rootEl.innerHTML =
      '<div class="ebd-main"><div class="ebd-error-box">' + html + "</div></div>";
  }

  if (!ebookId) {
    showError("전자책 id가 없습니다.");
    return;
  }

  if (typeof firebase === "undefined") return;
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  var auth = firebase.auth();
  var db = firebase.firestore();

  function esc(s) {
    if (s == null) return "";
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function hasEbookAccess(memberData, eid, ebookData) {
    if (ebookData && ebookData.isFree === true) return true;
    var items = (memberData && memberData.ownedEbookItems) || [];
    return items.some(function (it) {
      return it && (it.key === "ebook:" + eid || it.itemId === eid);
    });
  }

  function mergeFreeEbookAccess(database, eid) {
    return database
      .collection("ebooks")
      .where("isFree", "==", true)
      .get()
      .then(function (snap) {
        return snap.docs.some(function (d) {
          return d.id === eid;
        });
      });
  }

  auth.onAuthStateChanged(function (user) {
    if (!user) {
      window.location.href = "login.html?next=" + encodeURIComponent(window.location.href);
      return;
    }
    Promise.all([
      db.collection("ebooks").doc(ebookId).get(),
      db.collection("member").doc(user.uid).get(),
      mergeFreeEbookAccess(db, ebookId)
    ])
      .then(function (results) {
        var doc = results[0];
        var memberDoc = results[1];
        var isFreeCatalog = results[2];
        if (!doc.exists) {
          showError("전자책을 찾을 수 없습니다.");
          return;
        }
        var ebook = doc.data() || {};
        var memberData = memberDoc.exists ? memberDoc.data() : {};
        var ok = hasEbookAccess(memberData, ebookId, ebook) || isFreeCatalog;
        if (!ok) {
          showError(
            "다운로드 권한이 없습니다. 마이페이지에서 구매코드를 등록했는지 확인해 주세요."
          );
          return;
        }
        var fileUrl = ebook.ebookFileUrl || "";
        var title = ebook.title || "전자책";
        var author = ebook.authorName || "";

        if (!rootEl) return;
        rootEl.innerHTML =
          '<header class="ebd-header">' +
          '<a class="ebd-back" href="mypage.html"><span aria-hidden="true">←</span> 마이페이지</a>' +
          "</header>" +
          '<div class="ebd-main ebd-wrap-center">' +
          (ebook.coverImageUrl
            ? '<img class="ebd-cover" src="' +
              esc(ebook.coverImageUrl) +
              '" alt="" onerror="this.style.display=\'none\'">'
            : "") +
          '<h1 class="ebd-title">' +
          esc(title) +
          "</h1>" +
          (author ? '<p class="ebd-author">' + esc(author) + "</p>" : "") +
          (fileUrl
            ? '<a class="ebd-btn-download" id="ebdDownloadLink" href="' +
              esc(fileUrl) +
              '" download target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-download" aria-hidden="true"></i> 전자책 파일 받기</a>' +
              '<p class="ebd-hint">브라우저에 따라 새 탭에서 열리거나 바로 저장됩니다. PDF·EPUB 등 업로드된 형식입니다.</p>'
            : '<div class="ebd-info">등록된 파일 URL이 없습니다. 관리자에게 문의해 주세요.</div>') +
          "</div>";
      })
      .catch(function (err) {
        console.error(err);
        showError("불러오기에 실패했습니다.");
      });
  });
})();
