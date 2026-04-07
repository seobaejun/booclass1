/**
 * 관리자 전자책 업로드: 저자/표지 이미지·전자책 파일(다중 행) → Storage 업로드, 메타데이터 → Firestore 저장
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

  function normalizeEbookFilesArray(doc) {
    if (!doc) return [];
    if (doc.ebookFiles && Array.isArray(doc.ebookFiles) && doc.ebookFiles.length) {
      return doc.ebookFiles
        .slice()
        .sort(function (a, b) {
          return (a.order || 0) - (b.order || 0);
        })
        .map(function (x) {
          return {
            fileLabel: x.fileLabel || x.label || "",
            fileUrl: x.fileUrl || x.url || "",
            order: x.order != null ? x.order : 0
          };
        });
    }
    if (doc.ebookFileUrl) {
      return [{ fileLabel: "파일 1", fileUrl: doc.ebookFileUrl, order: 0 }];
    }
    return [];
  }

  function runWhenReady() {
    var form = document.getElementById("ebookUploadForm");
    var btnSubmit = document.getElementById("btnEbookSubmit");
    if (!form || !btnSubmit) return;

    var editEbookId = new URLSearchParams(window.location.search).get("edit") || "";
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
    var btnAddEbookFileRow = document.getElementById("btnAddEbookFileRow");
    var ebookFileRows = document.getElementById("ebookFileRows");

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
      var el = function (id) {
        return document.getElementById(id);
      };
      if (el("ebookTitle")) el("ebookTitle").value = d.title || "";
      if (el("ebookAuthor")) el("ebookAuthor").value = d.authorName || "";
      if (el("ebookPriceOriginal")) {
        el("ebookPriceOriginal").value =
          d.priceOriginal !== undefined && d.priceOriginal !== null ? String(d.priceOriginal) : "";
      }
      if (el("ebookPriceSale")) {
        el("ebookPriceSale").value =
          d.priceSale !== undefined && d.priceSale !== null ? String(d.priceSale) : "";
      }
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
        var meta = {};
        if (file.type) {
          meta.contentType = file.type;
        } else if (typeof BoostMimeTypes !== "undefined" && BoostMimeTypes.getMimeTypeFromFilename) {
          meta.contentType = BoostMimeTypes.getMimeTypeFromFilename(file.name);
        }
        if (
          typeof BoostStorageAttachment !== "undefined" &&
          BoostStorageAttachment.isDownloadAttachmentPath &&
          BoostStorageAttachment.buildContentDisposition &&
          BoostStorageAttachment.isDownloadAttachmentPath(path)
        ) {
          meta.contentDisposition = BoostStorageAttachment.buildContentDisposition(file.name);
        }
        ref
          .put(file, meta)
          .then(function () {
            return ref.getDownloadURL();
          })
          .then(resolve)
          .catch(reject);
      });
    }

    function createEbookFileRow(optionalLabel, optionalExistingUrl) {
      var row = document.createElement("div");
      row.className = "ebook-file-row border rounded p-3 mb-2";
      if (optionalExistingUrl) row.setAttribute("data-existing-url", optionalExistingUrl);
      row.innerHTML =
        '<div class="d-flex justify-content-between align-items-start gap-2 mb-2">' +
        '<div class="flex-grow-1">' +
        '<label class="form-label small mb-1">파일 설명</label>' +
        '<input type="text" class="form-control ebook-file-label" placeholder="예: 본문 PDF, 실습 엑셀">' +
        "</div>" +
        '<button type="button" class="btn btn-sm btn-outline-danger btn-remove-ebook-file mt-4 flex-shrink-0" title="이 행 제거">삭제</button>' +
        "</div>" +
        '<label class="form-label small mb-1">파일 선택</label>' +
        '<input type="file" class="form-control ebook-file-input" accept=".pdf,.epub,.doc,.docx,.txt,.rtf,.odt,.hwp,.xls,.xlsx,.xlsm,.csv,.ppt,.pptx,.ods,.odp">' +
        '<small class="text-muted d-block mt-1 ebook-file-hint"></small>';
      var labelInp = row.querySelector(".ebook-file-label");
      var hint = row.querySelector(".ebook-file-hint");
      if (optionalLabel && labelInp) labelInp.value = optionalLabel;
      if (optionalExistingUrl && hint) {
        hint.textContent = "현재 파일이 등록되어 있습니다. 새 파일을 선택하면 교체됩니다.";
      }
      return row;
    }

    function initEbookFileRowsEmpty() {
      if (!ebookFileRows) return;
      ebookFileRows.innerHTML = "";
      ebookFileRows.appendChild(createEbookFileRow("", ""));
    }

    function buildEbookFileRowsFromDoc(docData) {
      if (!ebookFileRows) return;
      ebookFileRows.innerHTML = "";
      var files = normalizeEbookFilesArray(docData);
      if (!files.length) {
        ebookFileRows.appendChild(createEbookFileRow("", ""));
        return;
      }
      files.forEach(function (f) {
        ebookFileRows.appendChild(createEbookFileRow(f.fileLabel || "", f.fileUrl || ""));
      });
    }

    if (ebookFileRows) {
      ebookFileRows.addEventListener("click", function (ev) {
        var btn = ev.target.closest(".btn-remove-ebook-file");
        if (!btn) return;
        var row = btn.closest(".ebook-file-row");
        if (!row || !ebookFileRows) return;
        var rows = ebookFileRows.querySelectorAll(".ebook-file-row");
        if (rows.length <= 1) {
          showMessage("전자책 파일 행은 최소 1개 필요합니다.", true);
          return;
        }
        row.remove();
      });
    }

    if (btnAddEbookFileRow && ebookFileRows) {
      btnAddEbookFileRow.addEventListener("click", function () {
        ebookFileRows.appendChild(createEbookFileRow("", ""));
      });
    }

    function beginEditLoad() {
      if (!editEbookId) {
        initEditor(null);
        initEbookFileRowsEmpty();
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
            initEbookFileRowsEmpty();
            btnSubmit.textContent = "전자책 업로드";
            btnSubmit.disabled = false;
            return;
          }
          currentEbookDoc = doc.data() || {};
          initEditor(currentEbookDoc);
          fillEbookFields(currentEbookDoc);
          buildEbookFileRowsFromDoc(currentEbookDoc);
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
          initEbookFileRowsEmpty();
          btnSubmit.textContent = "전자책 업로드";
          btnSubmit.disabled = false;
          isEditDataReady = false;
        });
    }

    function validateEbookFileRows() {
      if (!ebookFileRows) return true;
      var rows = ebookFileRows.querySelectorAll(".ebook-file-row");
      var hasAny = false;
      rows.forEach(function (row) {
        var fileInp = row.querySelector(".ebook-file-input");
        var file = fileInp && fileInp.files && fileInp.files[0];
        var existing = row.getAttribute("data-existing-url");
        if (file || (existing && existing.length)) hasAny = true;
      });
      if (!hasAny) {
        showMessage("전자책 파일을 최소 1개 이상 등록해 주세요.", true);
        return false;
      }
      return true;
    }

    function collectEbookFilesPayload(basePath) {
      if (!ebookFileRows) return Promise.resolve([]);
      var rows = ebookFileRows.querySelectorAll(".ebook-file-row");
      var promises = [];
      rows.forEach(function (row, index) {
        var labelInp = row.querySelector(".ebook-file-label");
        var fileInp = row.querySelector(".ebook-file-input");
        var file = fileInp && fileInp.files && fileInp.files[0] ? fileInp.files[0] : null;
        var existingUrl = row.getAttribute("data-existing-url") || "";
        var label =
          labelInp && labelInp.value.trim() ? labelInp.value.trim() : "파일 " + (index + 1);
        if (file) {
          var path = basePath + "/files/f" + index + "_" + uniqueId() + getExtension(file.name);
          promises.push(
            uploadFile(file, path).then(function (url) {
              return { fileLabel: label, fileUrl: url, order: index };
            })
          );
        } else if (existingUrl) {
          promises.push(
            Promise.resolve({ fileLabel: label, fileUrl: existingUrl, order: index })
          );
        }
      });
      if (!promises.length) return Promise.resolve([]);
      return Promise.all(promises);
    }

    beginEditLoad();

    if (btnCancel) {
      btnCancel.addEventListener("click", function () {
        if (editEbookId && currentEbookDoc) {
          fillEbookFields(currentEbookDoc);
          form.querySelectorAll('input[type="file"]').forEach(function (inp) {
            inp.value = "";
          });
          buildEbookFileRowsFromDoc(currentEbookDoc);
          if (editorInstance && editorInstance.setHTML) {
            var html = resolveIntroHtml(currentEbookDoc);
            editorInstance.setHTML(html);
            setTimeout(function () {
              if (editorInstance && editorInstance.setHTML) editorInstance.setHTML(html);
            }, 0);
          }
        } else {
          form.reset();
          initEbookFileRowsEmpty();
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

      if (!validateEbookFileRows()) return;

      var title,
        authorName,
        priceOriginal,
        priceSale,
        coverFile,
        authorFile;

      try {
        title = document.getElementById("ebookTitle") && document.getElementById("ebookTitle").value
          ? document.getElementById("ebookTitle").value.trim()
          : "";
        authorName =
          document.getElementById("ebookAuthor") && document.getElementById("ebookAuthor").value
            ? document.getElementById("ebookAuthor").value.trim()
            : "";
        priceOriginal =
          parseInt(
            (document.getElementById("ebookPriceOriginal") &&
              document.getElementById("ebookPriceOriginal").value) ||
              "0",
            10
          ) || 0;
        priceSale =
          parseInt(
            (document.getElementById("ebookPriceSale") &&
              document.getElementById("ebookPriceSale").value) ||
              "0",
            10
          ) || 0;
        coverFile =
          document.getElementById("ebookCover") && document.getElementById("ebookCover").files[0];
        authorFile =
          document.getElementById("ebookAuthorImage") &&
          document.getElementById("ebookAuthorImage").files[0];
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

      function optimizeRaster(file, preset) {
        if (!file) return Promise.resolve(null);
        if (
          typeof BoostImageOptimize !== "undefined" &&
          BoostImageOptimize.resizeImageFile &&
          preset
        ) {
          return BoostImageOptimize.resizeImageFile(file, preset);
        }
        return Promise.resolve(file);
      }

      function extForUpload(f, fallbackWhenFile) {
        if (!f) return "";
        var ext = f.name ? getExtension(f.name) : "";
        if (!ext && fallbackWhenFile) return ".jpg";
        return ext;
      }

      Promise.all([
        optimizeRaster(authorFile, BoostImageOptimize && BoostImageOptimize.presetAvatar).then(
          function (f) {
            return uploadFile(f, basePath + "/author" + extForUpload(f, true));
          }
        ),
        optimizeRaster(coverFile, BoostImageOptimize && BoostImageOptimize.presetCover).then(
          function (f) {
            return uploadFile(f, basePath + "/cover" + extForUpload(f, true));
          }
        )
      ])
        .then(function (urls) {
          var authorImageUrl = urls[0] || (currentEbookDoc && currentEbookDoc.authorImageUrl) || "";
          var coverImageUrl = urls[1] || (currentEbookDoc && currentEbookDoc.coverImageUrl) || "";
          return collectEbookFilesPayload(basePath).then(function (ebookFiles) {
            var ebookFileUrl = ebookFiles[0] ? ebookFiles[0].fileUrl : "";
            var introHtml = getIntroHtml();
            var orderVal =
              currentEbookDoc && currentEbookDoc.order != null ? currentEbookDoc.order : 0;

            if (editEbookId && currentEbookDoc) {
              var updateData = {
                title: title,
                authorName: authorName,
                authorImageUrl: authorImageUrl,
                coverImageUrl: coverImageUrl,
                ebookFileUrl: ebookFileUrl,
                ebookFiles: ebookFiles,
                priceOriginal: priceOriginal,
                priceSale: priceSale,
                isFree: priceSale === 0,
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
                ebookFiles: ebookFiles,
                priceOriginal: priceOriginal,
                priceSale: priceSale,
                isFree: priceSale === 0,
                intro: introHtml,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                order: snap.size,
                refId: refId
              };
              return db.collection("ebooks").add(data);
            });
          });
        })
        .then(function () {
          showMessage(editEbookId ? "전자책이 수정되었습니다." : "전자책이 등록되었습니다.", false);
          if (!editEbookId) {
            form.reset();
            initEbookFileRowsEmpty();
            if (editorInstance && editorInstance.setHTML) editorInstance.setHTML("");
          }
        })
        .catch(function (err) {
          console.error(err);
          var msg = err.message || String(err);
          if (/payload|size|too large|limit/i.test(msg)) {
            msg = "파일 용량이 너무 크거나 문서 제한을 초과했습니다. 파일 크기를 줄인 뒤 다시 시도해 주세요.";
          } else {
            msg = "저장 중 오류: " + msg;
          }
          showMessage(msg, true);
        })
        .finally(function () {
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
