/**
 * 강의 등록: 파트·강의 다중 영상, 기존 단일 영상(레거시) 호환
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

  var STORAGE_PREFIX = "courses";

  function runWhenReady() {
    var form = document.getElementById("courseVideoForm");
    var btnSubmit = document.getElementById("btnCourseSubmit");
    var msgEl = document.getElementById("courseFormMessage");
    if (!form || !btnSubmit) return;

    function showMessage(msg, isError) {
      if (!msgEl) return;
      msgEl.textContent = msg;
      msgEl.className = "alert " + (isError ? "alert-danger" : "alert-success") + " mt-3";
      msgEl.classList.remove("d-none");
    }

    if (typeof firebase === "undefined") {
      showMessage("Firebase를 불러올 수 없습니다.", true);
      return;
    }
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();
    var storage = firebase.storage();

    var editCourseId = new URLSearchParams(window.location.search).get("edit") || "";
    var currentCourseDoc = null;
    var courseDescEditor = null;

    function initCourseDescEditor() {
      try {
        if (typeof RichEditorAdmin !== "undefined" && document.getElementById("courseDescEditor")) {
          courseDescEditor = RichEditorAdmin.create({
            containerId: "courseDescEditor",
            height: "360px",
            storage: storage,
            storagePathPrefix: "courses/editor-images"
          });
        }
      } catch (err) {
        console.warn("강의 설명 에디터 초기화 실패:", err);
      }
    }
    initCourseDescEditor();

    function uniqueId() {
      return Date.now() + "_" + Math.random().toString(36).slice(2, 10);
    }

    function uploadFile(file, path) {
      return new Promise(function (resolve, reject) {
        if (!file) {
          resolve("");
          return;
        }
        var ref = storage.ref(path);
        ref
          .put(file)
          .then(function () {
            return ref.getDownloadURL();
          })
          .then(resolve)
          .catch(reject);
      });
    }

    function getExtension(filename) {
      if (!filename) return "";
      var i = filename.lastIndexOf(".");
      return i >= 0 ? filename.slice(i) : "";
    }

    function escHtmlAttr(s) {
      if (s == null) return "";
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;");
    }

    function collectAttachedEbookIds() {
      var mount = document.getElementById("courseAttachedEbooksMount");
      if (!mount) return [];
      var ids = [];
      mount.querySelectorAll('input[type="checkbox"][data-attached-ebook-id]').forEach(function (cb) {
        if (cb.checked && cb.getAttribute("data-attached-ebook-id")) {
          ids.push(cb.getAttribute("data-attached-ebook-id"));
        }
      });
      return ids;
    }

    /**
     * @param {string[]|undefined} selectedIds
     * @returns {Promise<void>}
     */
    function renderAttachedEbookPicker(selectedIds) {
      var mount = document.getElementById("courseAttachedEbooksMount");
      if (!mount) return Promise.resolve();
      var sel = {};
      (selectedIds || []).forEach(function (id) {
        if (id) sel[id] = true;
      });
      mount.innerHTML =
        '<p class="text-muted small mb-2 mb-0">전자책 목록을 불러오는 중…</p>';
      return db
        .collection("ebooks")
        .get()
        .then(function (snap) {
          if (snap.empty) {
            mount.innerHTML =
              '<p class="text-muted small mb-0">등록된 전자책이 없습니다. 좌측 메뉴 「전자책」에서 먼저 파일을 등록해 주세요.</p>';
            return;
          }
          var rows = [];
          snap.docs.forEach(function (d, idx) {
            var title = (d.data() && d.data().title) || "제목 없음";
            var id = d.id;
            var cid = "courseAebook_" + idx;
            var checked = sel[id] ? " checked" : "";
            rows.push(
              '<div class="form-check mb-2">' +
                '<input class="form-check-input" type="checkbox" id="' +
                cid +
                '" data-attached-ebook-id="' +
                escHtmlAttr(id) +
                '"' +
                checked +
                ">" +
                '<label class="form-check-label" for="' +
                cid +
                '">' +
                escHtmlAttr(title) +
                "</label>" +
                "</div>"
            );
          });
          mount.innerHTML = rows.join("");
        })
        .catch(function (err) {
          console.error(err);
          mount.innerHTML =
            '<p class="text-danger small mb-0">전자책 목록을 불러오지 못했습니다.</p>';
        });
    }

    var EBOOK_STORAGE_PREFIX = "ebooks";

    function buildNewEbookRowElement() {
      var div = document.createElement("div");
      div.className = "cp-new-ebook-row border rounded p-2 mb-2 bg-white";
      div.innerHTML =
        '<div class="row g-2 align-items-end">' +
        '<div class="col-md-5"><label class="form-label small mb-0">전자책 제목</label>' +
        '<input type="text" class="form-control form-control-sm cp-new-ebook-title" placeholder="예: 실습 자료 PDF"></div>' +
        '<div class="col-md-4"><label class="form-label small mb-0">파일</label>' +
        '<input type="file" class="form-control form-control-sm cp-new-ebook-file" accept=".pdf,.epub,.doc,.docx"></div>' +
        '<div class="col-md-3"><label class="form-label small mb-0">저자 표시</label>' +
        '<input type="text" class="form-control form-control-sm cp-new-ebook-author" placeholder="비우면 강사명"></div></div>' +
        '<button type="button" class="btn btn-sm btn-outline-danger mt-2 cp-remove-new-ebook">이 행 삭제</button>';
      div.querySelector(".cp-remove-new-ebook").addEventListener("click", function () {
        div.remove();
      });
      return div;
    }

    function initNewEbookRows() {
      var mount = document.getElementById("courseNewEbooksMount");
      if (!mount) return;
      mount.innerHTML =
        '<p class="text-muted small mb-2">PDF·EPUB·DOC 등을 선택하면, 강의 저장 시 전자책으로 등록되고 <strong>이 강의에 자동 연결</strong>됩니다.</p>' +
        '<div id="courseNewEbooksRowsInner"></div>' +
        '<button type="button" class="btn btn-sm btn-primary mt-1" id="btnCourseAddEbookRow">' +
        '<i class="fa fa-plus"></i> 전자책 업로드 행 추가</button>';
      var inner = document.getElementById("courseNewEbooksRowsInner");
      if (!inner) return;
      inner.appendChild(buildNewEbookRowElement());
      var btnAdd = document.getElementById("btnCourseAddEbookRow");
      if (btnAdd) {
        btnAdd.addEventListener("click", function () {
          inner.appendChild(buildNewEbookRowElement());
        });
      }
    }

    function collectNewEbookRowsPayload() {
      var inner = document.getElementById("courseNewEbooksRowsInner");
      if (!inner) return [];
      var out = [];
      inner.querySelectorAll(".cp-new-ebook-row").forEach(function (row) {
        var titleInp = row.querySelector(".cp-new-ebook-title");
        var fileInp = row.querySelector(".cp-new-ebook-file");
        var authInp = row.querySelector(".cp-new-ebook-author");
        var file = fileInp && fileInp.files && fileInp.files[0] ? fileInp.files[0] : null;
        if (!file) return;
        var rawTitle = titleInp && titleInp.value.trim() ? titleInp.value.trim() : "";
        var title = rawTitle || file.name.replace(/\.[^.]+$/, "") || "전자책";
        var authorName = authInp && authInp.value.trim() ? authInp.value.trim() : "";
        out.push({ title: title, file: file, authorName: authorName });
      });
      return out;
    }

    /**
     * @param {string} courseInstructor
     * @returns {Promise<string[]>} 새 ebooks 문서 id 목록
     */
    function uploadNewEbooksCreateDocs(courseInstructor) {
      var rows = collectNewEbookRowsPayload();
      if (!rows.length) return Promise.resolve([]);

      function uploadOne(item) {
        var ebookRefId = uniqueId();
        var path =
          EBOOK_STORAGE_PREFIX + "/" + ebookRefId + "/ebook" + getExtension(item.file.name);
        return uploadFile(item.file, path).then(function (url) {
          var authorName = item.authorName || courseInstructor || "강의";
          return db.collection("ebooks").get().then(function (snap) {
            return db.collection("ebooks").add({
              title: item.title,
              authorName: authorName,
              authorImageUrl: "",
              coverImageUrl: "",
              ebookFileUrl: url,
              priceOriginal: 0,
              priceSale: 0,
              intro: "",
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              order: snap.size,
              refId: ebookRefId,
              fromCourseBundle: true
            });
          }).then(function (docRef) {
            return docRef.id;
          });
        });
      }

      return rows.reduce(function (chain, item) {
        return chain.then(function (ids) {
          return uploadOne(item).then(function (id) {
            ids.push(id);
            return ids;
          });
        });
      }, Promise.resolve([]));
    }

    function mergeCourseAttachedEbookIds(checkboxIds, newIds) {
      var seen = {};
      var out = [];
      (checkboxIds || []).concat(newIds || []).forEach(function (id) {
        if (id && !seen[id]) {
          seen[id] = true;
          out.push(id);
        }
      });
      return out;
    }

    function fillCourseForm(d) {
      if (!d) return;
      var el = function (id) {
        return document.getElementById(id);
      };
      if (el("courseTitle")) el("courseTitle").value = d.courseTitle || "";
      if (el("courseInstructor")) el("courseInstructor").value = d.courseInstructor || "";
      if (el("coursePriceOriginal")) el("coursePriceOriginal").value = d.priceOriginal !== undefined ? d.priceOriginal : "";
      if (el("coursePriceSale")) el("coursePriceSale").value = d.priceSale !== undefined ? d.priceSale : "";
      if (courseDescEditor && courseDescEditor.setHTML) {
        courseDescEditor.setHTML(d.courseDesc || "");
      }
      if (el("courseCategory")) el("courseCategory").value = d.courseCategory || "";
    }

    function processLectures(part, pi, refId, rawLectures) {
      var lectures = [];
      var i = 0;
      function nextLec() {
        if (i >= rawLectures.length) return Promise.resolve(lectures);
        var lec = rawLectures[i];
        var li = i;
        i++;
        if (lec.file) {
          var path =
            STORAGE_PREFIX +
            "/" +
            refId +
            "/parts/p" +
            pi +
            "_l" +
            li +
            "/video" +
            getExtension(lec.file.name);
          return uploadFile(lec.file, path).then(function (url) {
            lectures.push({
              title: lec.title || "강의 " + (li + 1),
              durationMin: lec.durationMin || 0,
              videoStorageUrl: url,
              videoExternalUrl: "",
              order: li
            });
            return nextLec();
          });
        }
        var ext = lec.externalUrl || lec.existingExternalUrl || "";
        var stor = lec.existingStorageUrl || "";
        if (!ext && !stor) {
          return Promise.reject(new Error("모든 강의에 영상 파일, URL, 또는 기존 영상이 있어야 합니다."));
        }
        lectures.push({
          title: lec.title || "강의 " + (li + 1),
          durationMin: lec.durationMin || 0,
          videoStorageUrl: lec.externalUrl ? "" : stor,
          videoExternalUrl: lec.externalUrl || lec.existingExternalUrl || "",
          order: li
        });
        return nextLec();
      }
      return nextLec();
    }

    function buildPartsArray(refId, payload) {
      var partsOut = [];
      var pi = 0;
      function nextPart() {
        if (pi >= payload.parts.length) return Promise.resolve(partsOut);
        var part = payload.parts[pi];
        var curPi = pi;
        pi++;
        return processLectures(part, curPi, refId, part.lectures).then(function (lectures) {
          partsOut.push({
            partTitle: part.partTitle,
            order: curPi,
            lectures: lectures
          });
          return nextPart();
        });
      }
      return nextPart();
    }

    function legacyFromParts(partsOut) {
      var totalMin = 0;
      var firstUrl = "";
      var firstStorage = "";
      var firstExt = "";
      partsOut.forEach(function (p) {
        (p.lectures || []).forEach(function (l) {
          totalMin += l.durationMin || 0;
          if (!firstUrl) {
            firstStorage = l.videoStorageUrl || "";
            firstExt = l.videoExternalUrl || "";
            firstUrl = firstStorage || firstExt;
          }
        });
      });
      return {
        duration: totalMin,
        videoStorageUrl: firstStorage,
        videoExternalUrl: firstExt,
        videoUrl: firstUrl
      };
    }

    function loadCourseForEdit() {
      if (!editCourseId) {
        if (typeof CoursePartsAdmin !== "undefined" && CoursePartsAdmin.mount) {
          CoursePartsAdmin.mount("coursePartsMount");
        }
        return renderAttachedEbookPicker([]).then(function () {
          initNewEbookRows();
        });
      }
      return db
        .collection("courses")
        .doc(editCourseId)
        .get()
        .then(function (doc) {
          if (!doc.exists) {
            showMessage("강의를 찾을 수 없습니다.", true);
            return renderAttachedEbookPicker([]).then(function () {
              initNewEbookRows();
            });
          }
          currentCourseDoc = doc.data();
          fillCourseForm(currentCourseDoc);
          if (typeof CoursePartsAdmin !== "undefined" && CoursePartsAdmin.loadFromCourse) {
            CoursePartsAdmin.loadFromCourse(currentCourseDoc);
          }
          if (btnSubmit) btnSubmit.textContent = "강의 수정";
          var ae = (currentCourseDoc && currentCourseDoc.attachedEbookIds) || [];
          return renderAttachedEbookPicker(Array.isArray(ae) ? ae : []).then(function () {
            initNewEbookRows();
          });
        })
        .catch(function (err) {
          console.error(err);
          showMessage("강의 불러오기 실패: " + (err.message || err), true);
          return renderAttachedEbookPicker([]).then(function () {
            initNewEbookRows();
          });
        });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var courseTitle = document.getElementById("courseTitle") && document.getElementById("courseTitle").value
        ? document.getElementById("courseTitle").value.trim()
        : "";
      var courseInstructor =
        document.getElementById("courseInstructor") && document.getElementById("courseInstructor").value
          ? document.getElementById("courseInstructor").value.trim()
          : "";
      var courseDesc = courseDescEditor && courseDescEditor.getHTML ? (courseDescEditor.getHTML() || "").trim() : "";
      var courseCategory =
        (document.getElementById("courseCategory") && document.getElementById("courseCategory").value) || "";
      var priceOriginal =
        parseInt(
          (document.getElementById("coursePriceOriginal") && document.getElementById("coursePriceOriginal").value) || "0",
          10
        ) || 0;
      var priceSale =
        parseInt(
          (document.getElementById("coursePriceSale") && document.getElementById("coursePriceSale").value) || "0",
          10
        ) || 0;

      var instructorImageFile =
        document.getElementById("courseInstructorImage") && document.getElementById("courseInstructorImage").files[0];
      var coverImageFile = document.getElementById("courseCoverImage") && document.getElementById("courseCoverImage").files[0];

      if (!courseTitle) {
        showMessage("강의 제목은 필수입니다.", true);
        return;
      }
      if (!courseInstructor) {
        showMessage("강사명은 필수입니다.", true);
        return;
      }
      var priceSaleEl = document.getElementById("coursePriceSale");
      var priceSaleVal = priceSaleEl ? (priceSaleEl.value || "").trim() : "";
      if (priceSaleVal === "" || priceSaleVal === null) {
        showMessage("할인 후 가격은 필수입니다.", true);
        return;
      }

      if (typeof CoursePartsAdmin === "undefined" || !CoursePartsAdmin.collectForUpload) {
        showMessage("강의 구성 UI를 불러올 수 없습니다.", true);
        return;
      }
      var rawPayload = CoursePartsAdmin.collectForUpload();
      if (!rawPayload.parts || !rawPayload.parts.length) {
        showMessage("최소 1개의 파트가 필요합니다.", true);
        return;
      }

      btnSubmit.disabled = true;
      showMessage(editCourseId ? "수정 중..." : "업로드 및 저장 중...", false);

      var refId =
        editCourseId && currentCourseDoc && currentCourseDoc.refId ? currentCourseDoc.refId : uniqueId();
      var basePath = STORAGE_PREFIX + "/" + refId;

      Promise.all([
        instructorImageFile
          ? uploadFile(instructorImageFile, basePath + "/instructor" + getExtension(instructorImageFile.name))
          : Promise.resolve(""),
        coverImageFile ? uploadFile(coverImageFile, basePath + "/cover" + getExtension(coverImageFile.name)) : Promise.resolve("")
      ])
        .then(function (urls) {
          var instructorImageUrl = urls[0] || (currentCourseDoc && currentCourseDoc.instructorImageUrl) || "";
          var coverImageUrl = urls[1] || (currentCourseDoc && currentCourseDoc.coverImageUrl) || "";
          return uploadNewEbooksCreateDocs(courseInstructor).then(function (newEbookIds) {
            return buildPartsArray(refId, rawPayload).then(function (partsOut) {
              var leg = legacyFromParts(partsOut);
              var mergedEbookIds = mergeCourseAttachedEbookIds(collectAttachedEbookIds(), newEbookIds);
              var data = {
                courseTitle: courseTitle,
                courseInstructor: courseInstructor,
                instructorImageUrl: instructorImageUrl,
                coverImageUrl: coverImageUrl,
                priceOriginal: priceOriginal,
                priceSale: priceSale,
                courseDesc: courseDesc,
                courseCategory: courseCategory,
                parts: partsOut,
                videoStorageUrl: leg.videoStorageUrl,
                videoExternalUrl: leg.videoExternalUrl,
                videoUrl: leg.videoUrl,
                duration: leg.duration,
                attachedEbookIds: mergedEbookIds,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                refId: refId
              };
              if (!editCourseId) data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
              if (editCourseId) return db.collection("courses").doc(editCourseId).update(data);
              return db.collection("courses").add(data);
            });
          });
        })
        .then(function () {
          showMessage(editCourseId ? "강의가 수정되었습니다." : "강의가 등록되었습니다.", false);
          if (!editCourseId) {
            form.reset();
            if (courseDescEditor && courseDescEditor.setHTML) courseDescEditor.setHTML("");
            if (typeof CoursePartsAdmin !== "undefined" && CoursePartsAdmin.mount) {
              CoursePartsAdmin.mount("coursePartsMount");
            }
            return renderAttachedEbookPicker([]).then(function () {
              initNewEbookRows();
            });
          }
          if (editCourseId) {
            return db
              .collection("courses")
              .doc(editCourseId)
              .get()
              .then(function (doc) {
                if (doc.exists) currentCourseDoc = doc.data();
                var ae = (currentCourseDoc && currentCourseDoc.attachedEbookIds) || [];
                return renderAttachedEbookPicker(Array.isArray(ae) ? ae : []);
              })
              .then(function () {
                initNewEbookRows();
              });
          }
        })
        .catch(function (err) {
          console.error(err);
          showMessage("등록 실패: " + (err.message || err), true);
        })
        .finally(function () {
          btnSubmit.disabled = false;
        });
    });

    var btnCancel = document.getElementById("btnCourseCancel");
    if (btnCancel) {
      btnCancel.addEventListener("click", function () {
        form.reset();
        if (courseDescEditor && courseDescEditor.setHTML) courseDescEditor.setHTML("");
        if (msgEl) msgEl.classList.add("d-none");
        if (typeof CoursePartsAdmin !== "undefined" && CoursePartsAdmin.mount) {
          CoursePartsAdmin.mount("coursePartsMount");
        }
        var restoreIds =
          editCourseId && currentCourseDoc && Array.isArray(currentCourseDoc.attachedEbookIds)
            ? currentCourseDoc.attachedEbookIds
            : [];
        renderAttachedEbookPicker(restoreIds).then(function () {
          initNewEbookRows();
        });
      });
    }

    loadCourseForEdit();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runWhenReady);
  } else {
    runWhenReady();
  }
})();
