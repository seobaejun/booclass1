/**
 * 관리자 전자책 업로드: 저자/표지 이미지·전자책 파일 → Storage 업로드, 메타데이터 → Firestore 저장
 * ?edit=문서ID 로 수정 모드 (강의 등록 course-register-admin.js 와 동일 패턴)
 *
 * 수정 시 소개 HTML은 Firestore 비동기 로드 후 setHTML이 아니라 RichEditorAdmin.create({ initialValue })로
 * 주입한다. Toast UI Editor는 마운트 이후 비동기 setHTML이 무시되는 경우가 있어 강의 수정과 동작이 달랐음.
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

  function resolveIntroHtml(d) {
    if (!d || typeof d !== "object") return "";
    var v = d.intro;
    if (v == null || v === "") v = d.description;
    if (v == null || v === "") v = d.content;
    if (v == null || v === "") v = d.ebookIntro;
    if (v == null) return "";
    return typeof v === "string" ? v : String(v);
  }

  function runWhenReady() {
    var form = document.getElementById("ebookUploadForm");
    var btnSubmit = document.getElementById("btnEbookSubmit");
    if (!form || !btnSubmit) return;

    var editEbookId = (new URLSearchParams(window.location.search)).get("edit") || "";
    var currentEbookDoc = null;
    var editorInstance = null;
    var isEditDataReady = !editEbookId;

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

    /**
     * 에디터는 페이지당 1회만 생성. 수정 모드에서는 Firestore에서 받은 HTML을 initialValue로 넣는다.
     * @param {object|null} introSource - intro 필드를 가진 문서 또는 null(신규)
     */
    function initEditor(introSource) {
      try {
        if (typeof RichEditorAdmin === "undefined" || !document.getElementById("ebookIntroEditor")) return;
        editorInstance = RichEditorAdmin.create({
          containerId: "ebookIntroEditor",
          height: "320px",
          storage: storage,
          storagePathPrefix: "ebooks/editor-images",
          initialValue: resolveIntroHtml(introSource)
        });
      } catch (e) {
        console.warn("에디터 초기화 실패:", e);
      }
    }

    function getIntroHtml() {
      if (editorInstance && editorInstance.getHTML) return editorInstance.getHTML() || "";
      return "";
    }

    function fillEbookFields(d) {
      if (!d) return;
      var el = function (id) { return document.getElementById(id); };
      if (el("ebookTitle")) el("ebookTitle").value = d.title || "";
      if (el("ebookAuthor")) el("ebookAuthor").value = d.authorName || "";
      if (el("ebookPriceOriginal")) {
        el("ebookPriceOriginal").value = d.priceOriginal !== undefined && d.priceOriginal !== null ? String(d.priceOriginal) : "";
      }
      if (el("ebookPriceSale")) {
        el("ebookPriceSale").value = d.priceSale !== undefined && d.priceSale !== null ? String(d.priceSale) : "";
      }
    }

    function beginEditLoad() {
      if (!editEbookId) {
        initEditor(null);
        return;
      }
      isEditDataReady = false;
      btnSubmit.disabled = true;
      btnSubmit.textContent = "불러오는 중…";

      db.collection("ebooks")
        .doc(editEbookId)
        .get()
        .then(function (doc) {
          if (!doc.exists) {
            showMessage("전자책을 찾을 수 없습니다.", true);
            initEditor(null);
            btnSubmit.textContent = "전자책 업로드";
            btnSubmit.disabled = false;
            return;
          }
          currentEbookDoc = doc.data() || {};
          initEditor(currentEbookDoc);
          fillEbookFields(currentEbookDoc);
          btnSubmit.textContent = "전자책 수정";
          btnSubmit.disabled = false;
          isEditDataReady = true;
          var cardTitle = document.getElementById("ebookUploadCardTitle");
          if (cardTitle) cardTitle.textContent = "전자책 수정";
        })
        .catch(function (err) {
          console.error(err);
          showMessage("전자책 불러오기 실패: " + (err.message || err), true);
          initEditor(null);
          btnSubmit.textContent = "전자책 업로드";
          btnSubmit.disabled = false;
          isEditDataReady = false;
        });
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

    beginEditLoad();

    if (btnCancel) {
      btnCancel.addEventListener("click", function () {
        if (editEbookId && currentEbookDoc) {
          fillEbookFields(currentEbookDoc);
          form.querySelectorAll('input[type="file"]').forEach(function (inp) {
            inp.value = "";
          });
          if (editorInstance && editorInstance.setHTML) {
            var html = resolveIntroHtml(currentEbookDoc);
            editorInstance.setHTML(html);
            setTimeout(function () {
              if (editorInstance && editorInstance.setHTML) editorInstance.setHTML(html);
            }, 0);
          }
        } else {
          form.reset();
          if (editorInstance && editorInstance.setHTML) editorInstance.setHTML("");
        }
        var alertEl = form.querySelector(".alert");
        if (alertEl) alertEl.remove();
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (editEbookId && !isEditDataReady) {
        showMessage("데이터를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.", true);
        return;
      }
      if (editEbookId && !currentEbookDoc) {
        showMessage("수정할 전자책 정보가 없습니다. 페이지를 새로고침 해 주세요.", true);
        return;
      }

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
      showMessage(editEbookId ? "수정 중..." : "업로드 및 등록 중...", false);

      var refId =
        editEbookId && currentEbookDoc && currentEbookDoc.refId
          ? currentEbookDoc.refId
          : uniqueId();
      var basePath = STORAGE_PREFIX + "/" + refId;

      Promise.all([
        uploadFile(authorFile, basePath + "/author" + (authorFile ? getExtension(authorFile.name) : "")),
        uploadFile(coverFile, basePath + "/cover" + (coverFile ? getExtension(coverFile.name) : "")),
        uploadFile(ebookFile, basePath + "/ebook" + (ebookFile ? getExtension(ebookFile.name) : ""))
      ]).then(function (urls) {
        var authorImageUrl = urls[0] || (currentEbookDoc && currentEbookDoc.authorImageUrl) || "";
        var coverImageUrl = urls[1] || (currentEbookDoc && currentEbookDoc.coverImageUrl) || "";
        var ebookFileUrl = urls[2] || (currentEbookDoc && currentEbookDoc.ebookFileUrl) || "";
        var introHtml = getIntroHtml();
        var orderVal = currentEbookDoc && currentEbookDoc.order != null ? currentEbookDoc.order : 0;

        if (editEbookId && currentEbookDoc) {
          var updateData = {
            title: title,
            authorName: authorName,
            authorImageUrl: authorImageUrl,
            coverImageUrl: coverImageUrl,
            ebookFileUrl: ebookFileUrl,
            priceOriginal: priceOriginal,
            priceSale: priceSale,
            intro: introHtml,
            order: orderVal,
            refId: refId,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          };
          return db.collection("ebooks").doc(editEbookId).update(updateData);
        }

        return db.collection("ebooks").get().then(function (snap) {
          var data = {
            title: title,
            authorName: authorName,
            authorImageUrl: authorImageUrl,
            coverImageUrl: coverImageUrl,
            ebookFileUrl: ebookFileUrl,
            priceOriginal: priceOriginal,
            priceSale: priceSale,
            intro: introHtml,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            order: snap.size,
            refId: refId
          };
          return db.collection("ebooks").add(data);
        });
      }).then(function () {
        showMessage(editEbookId ? "전자책이 수정되었습니다." : "전자책이 등록되었습니다.", false);
        if (!editEbookId) {
          form.reset();
          if (editorInstance && editorInstance.setHTML) editorInstance.setHTML("");
        }
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runWhenReady);
  } else {
    runWhenReady();
  }
})();
