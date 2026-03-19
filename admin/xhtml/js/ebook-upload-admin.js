/**
 * 관리자 전자책 업로드: 저자/표지 이미지·전자책 파일 → Storage 업로드, 메타데이터 → Firestore 저장
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

  var STORAGE_PREFIX = "ebooks";

  function runWhenReady() {
    var form = document.getElementById("ebookUploadForm");
    var btnSubmit = document.getElementById("btnEbookSubmit");
    if (!form || !btnSubmit) return;

    function showMessage(msg, isError) {
      var existing = form.querySelector(".alert");
      if (existing) existing.remove();
      var div = document.createElement("div");
      div.className = "alert " + (isError ? "alert-danger" : "alert-success") + " mt-3";
      div.setAttribute("role", "alert");
      div.textContent = msg;
      form.appendChild(div);
    }

    if (typeof firebase === "undefined") {
      showMessage("Firebase를 불러올 수 없습니다. 스크립트 로드 순서를 확인하세요.", true);
      return;
    }
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();
    var storage = firebase.storage();

    var btnCancel = document.getElementById("btnEbookCancel");
    var editorInstance = null;

    function initEditor() {
      try {
        if (typeof RichEditorAdmin !== "undefined" && document.getElementById("ebookIntroEditor")) {
          editorInstance = RichEditorAdmin.create({
            containerId: "ebookIntroEditor",
            height: "320px",
            storage: storage,
            storagePathPrefix: "ebooks/editor-images"
          });
        }
      } catch (e) {
        console.warn("에디터 초기화 실패:", e);
      }
    }

    function getIntroHtml() {
      if (editorInstance && editorInstance.getHTML) return editorInstance.getHTML() || "";
      return "";
    }

    function uniqueId() {
      return Date.now() + "_" + Math.random().toString(36).slice(2, 10);
    }

    function getExtension(filename) {
      if (!filename) return "";
      var i = filename.lastIndexOf(".");
      return i >= 0 ? filename.slice(i) : "";
    }

    function uploadFile(file, path) {
      return new Promise(function (resolve, reject) {
        if (!file) {
          resolve("");
          return;
        }
        var ref = storage.ref(path);
        ref.put(file).then(function () {
          return ref.getDownloadURL();
        }).then(resolve).catch(reject);
      });
    }

    function saveEbook(payload) {
      var data = {
        title: payload.title,
        authorName: payload.authorName,
        authorImageUrl: payload.authorImageUrl || "",
        coverImageUrl: payload.coverImageUrl || "",
        ebookFileUrl: payload.ebookFileUrl || "",
        priceOriginal: payload.priceOriginal,
        priceSale: payload.priceSale,
        intro: payload.intro || "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        order: payload.order
      };
      return db.collection("ebooks").add(data);
    }

    if (btnCancel) {
      btnCancel.addEventListener("click", function () {
        form.reset();
        if (editorInstance && editorInstance.setHTML) editorInstance.setHTML("");
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var title, authorName, priceOriginal, priceSale, coverFile, authorFile, ebookFile;

      try {
        title = (document.getElementById("ebookTitle") && document.getElementById("ebookTitle").value) ? document.getElementById("ebookTitle").value.trim() : "";
        authorName = (document.getElementById("ebookAuthor") && document.getElementById("ebookAuthor").value) ? document.getElementById("ebookAuthor").value.trim() : "";
        priceOriginal = parseInt((document.getElementById("ebookPriceOriginal") && document.getElementById("ebookPriceOriginal").value) || "0", 10) || 0;
        priceSale = parseInt((document.getElementById("ebookPriceSale") && document.getElementById("ebookPriceSale").value) || "0", 10) || 0;
        coverFile = document.getElementById("ebookCover") && document.getElementById("ebookCover").files[0];
        authorFile = document.getElementById("ebookAuthorImage") && document.getElementById("ebookAuthorImage").files[0];
        ebookFile = document.getElementById("ebookFileUpload") && document.getElementById("ebookFileUpload").files[0];
      } catch (err) {
        showMessage("입력값 읽기 오류: " + (err.message || err), true);
        return;
      }

      if (!title || !authorName) {
        showMessage("제목과 저자명은 필수입니다.", true);
        return;
      }

      btnSubmit.disabled = true;
      showMessage("업로드 및 등록 중...", false);

      var refId = uniqueId();
      var basePath = STORAGE_PREFIX + "/" + refId;

      Promise.all([
        uploadFile(authorFile, basePath + "/author" + (authorFile ? getExtension(authorFile.name) : "")),
        uploadFile(coverFile, basePath + "/cover" + (coverFile ? getExtension(coverFile.name) : "")),
        uploadFile(ebookFile, basePath + "/ebook" + (ebookFile ? getExtension(ebookFile.name) : ""))
      ]).then(function (urls) {
        return db.collection("ebooks").get().then(function (snap) {
          return saveEbook({
            title: title,
            authorName: authorName,
            authorImageUrl: urls[0] || "",
            coverImageUrl: urls[1] || "",
            ebookFileUrl: urls[2] || "",
            priceOriginal: priceOriginal,
            priceSale: priceSale,
            intro: getIntroHtml(),
            order: snap.size
          });
        });
      }).then(function () {
        showMessage("전자책이 등록되었습니다.", false);
        form.reset();
        if (editorInstance && editorInstance.setHTML) editorInstance.setHTML("");
      }).catch(function (err) {
        console.error(err);
        var msg = err.message || String(err);
        if (/payload|size|too large|limit/i.test(msg)) {
          msg = "파일 용량이 너무 크거나 문서 제한을 초과했습니다. 파일 크기를 줄인 뒤 다시 시도해 주세요.";
        } else {
          msg = "저장 중 오류: " + msg;
        }
        showMessage(msg, true);
      }).finally(function () {
        btnSubmit.disabled = false;
      });
    });

    initEditor();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runWhenReady);
  } else {
    runWhenReady();
  }
})();
