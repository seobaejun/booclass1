/**
 * 전자책 다운로드 — Firestore ebooks, ownedEbookItems 또는 isFree
 * ebookFiles[] 또는 레거시 ebookFileUrl 지원
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

  function downloadErrorMessage() {
    if (typeof BoostFileDownloadHelp === "string") return BoostFileDownloadHelp;
    return "다운로드에 실패했습니다. docs/ebook-download-solution.md 를 참고하세요.";
  }

  function escAttr(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function normalizeEbookFiles(ebook) {
    if (!ebook) return [];
    if (ebook.ebookFiles && Array.isArray(ebook.ebookFiles) && ebook.ebookFiles.length) {
      return ebook.ebookFiles
        .slice()
        .sort(function (a, b) {
          return (a.order || 0) - (b.order || 0);
        })
        .map(function (x) {
          return {
            fileLabel: x.fileLabel || x.label || "파일",
            fileUrl: x.fileUrl || x.url || ""
          };
        })
        .filter(function (x) {
          return x.fileUrl;
        });
    }
    if (ebook.ebookFileUrl) {
      return [{ fileLabel: "파일 받기", fileUrl: ebook.ebookFileUrl }];
    }
    return [];
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

  if (rootEl) {
    rootEl.addEventListener("click", function (ev) {
      var btn = ev.target.closest(".ebd-download-one");
      if (!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      var url = btn.getAttribute("data-ebook-url") || "";
      var t = btn.getAttribute("data-ebook-title") || "";
      if (!url) return;
      if (typeof BoostFileDownload === "undefined" || !BoostFileDownload.downloadFromUrl) {
        alert("다운로드 스크립트를 불러올 수 없습니다. 페이지를 새로고침해 주세요.");
        return;
      }
      btn.disabled = true;
      var idleHtml = btn.getAttribute("data-download-idle-html");
      if (!idleHtml) {
        idleHtml = btn.innerHTML;
        btn.setAttribute("data-download-idle-html", idleHtml);
      }
      btn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> 다운로드 시작…';
      BoostFileDownload.downloadFromUrl(url, t, {
        onEnd: function () {
          btn.innerHTML = btn.getAttribute("data-download-idle-html") || idleHtml;
        }
      })
        .then(function () {
          if (
            typeof BoostFileDownloadUsedTabFallback !== "undefined" &&
            BoostFileDownloadUsedTabFallback &&
            !sessionStorage.getItem("boost_download_cors_hint_shown")
          ) {
            sessionStorage.setItem("boost_download_cors_hint_shown", "1");
            alert(
              "파일을 새 탭에서 열었습니다.\n" +
                "PC 저장: Ctrl+S 또는 ⋮ → 다른 이름으로 저장.\n\n" +
                "※ 화면에만 보이고 저장이 안 되면 관리자에서 해당 파일을 다시 업로드해 주세요.\n" +
                "(Storage에 attachment가 붙어야 브라우저가 바로 내려받습니다.)"
            );
          }
        })
        .catch(function (err) {
          console.error(err);
          alert("다운로드에 실패했습니다.\n\n" + downloadErrorMessage());
        })
        .finally(function () {
          btn.disabled = false;
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
        var files = normalizeEbookFiles(ebook);
        var title = ebook.title || "전자책";
        var author = ebook.authorName || "";

        if (!rootEl) return;
        var filesHtml = "";
        if (files.length) {
          filesHtml = files
            .map(function (f, i) {
              var btnLabel = f.fileLabel || "파일 " + (i + 1);
              var downloadName = f.fileLabel || title + "_" + (i + 1);
              return (
                '<button type="button" class="ebd-btn-download ebd-download-one mb-2" data-ebook-url="' +
                escAttr(f.fileUrl) +
                '" data-ebook-title="' +
                escAttr(downloadName) +
                '"><i class="fa-solid fa-download" aria-hidden="true"></i> ' +
                esc(btnLabel) +
                "</button>"
              );
            })
            .join("");
        } else {
          filesHtml =
            '<div class="ebd-info">등록된 파일 URL이 없습니다. 관리자에게 문의해 주세요.</div>';
        }

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
          (files.length
            ? '<div class="ebd-file-actions w-100" style="max-width:320px;margin:0 auto;">' +
              filesHtml +
              "</div>" +
              '<p class="ebd-hint">PC에 저장됩니다. PDF·엑셀·텍스트 등 업로드한 형식 그대로 받습니다.</p>'
            : filesHtml) +
          "</div>";
      })
      .catch(function (err) {
        console.error(err);
        showError("불러오기에 실패했습니다.");
      });
  });
})();
