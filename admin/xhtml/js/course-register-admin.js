/**
 * 강의 등록: 전자책 항목 순서 참고 — 강의 제목, 강사명, 강사 이미지, 표지 이미지, 할인 전/후 가격, 설명, 카테고리, 강의 영상.
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

    var editCourseId = (new URLSearchParams(window.location.search)).get("edit") || "";
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
        ref.put(file).then(function () {
          return ref.getDownloadURL();
        }).then(resolve).catch(reject);
      });
    }

    function getExtension(filename) {
      if (!filename) return "";
      var i = filename.lastIndexOf(".");
      return i >= 0 ? filename.slice(i) : "";
    }

    function fillCourseForm(d) {
      if (!d) return;
      var el = function (id) { return document.getElementById(id); };
      if (el("courseTitle")) el("courseTitle").value = d.courseTitle || "";
      if (el("courseInstructor")) el("courseInstructor").value = d.courseInstructor || "";
      if (el("coursePriceOriginal")) el("coursePriceOriginal").value = d.priceOriginal !== undefined ? d.priceOriginal : "";
      if (el("coursePriceSale")) el("coursePriceSale").value = d.priceSale !== undefined ? d.priceSale : "";
      if (courseDescEditor && courseDescEditor.setHTML) {
        courseDescEditor.setHTML(d.courseDesc || "");
      }
      if (el("courseCategory")) el("courseCategory").value = d.courseCategory || "";
      if (el("videoUrl")) el("videoUrl").value = d.videoExternalUrl || d.videoUrl || "";
      if (el("courseDuration")) el("courseDuration").value = d.duration !== undefined ? d.duration : "";
    }

    function loadCourseForEdit() {
      if (!editCourseId) return Promise.resolve();
      return db.collection("courses").doc(editCourseId).get().then(function (doc) {
        if (!doc.exists) {
          showMessage("강의를 찾을 수 없습니다.", true);
          return;
        }
        currentCourseDoc = doc.data();
        fillCourseForm(currentCourseDoc);
        if (btnSubmit) btnSubmit.textContent = "강의 수정";
      }).catch(function (err) {
        console.error(err);
        showMessage("강의 불러오기 실패: " + (err.message || err), true);
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var courseTitle = (document.getElementById("courseTitle") && document.getElementById("courseTitle").value) ? document.getElementById("courseTitle").value.trim() : "";
      var courseInstructor = (document.getElementById("courseInstructor") && document.getElementById("courseInstructor").value) ? document.getElementById("courseInstructor").value.trim() : "";
      var courseDesc = courseDescEditor && courseDescEditor.getHTML
        ? (courseDescEditor.getHTML() || "").trim()
        : "";
      var courseCategory = (document.getElementById("courseCategory") && document.getElementById("courseCategory").value) || "";
      var priceOriginal = parseInt((document.getElementById("coursePriceOriginal") && document.getElementById("coursePriceOriginal").value) || "0", 10) || 0;
      var priceSale = parseInt((document.getElementById("coursePriceSale") && document.getElementById("coursePriceSale").value) || "0", 10) || 0;
      var videoUrlInput = (document.getElementById("videoUrl") && document.getElementById("videoUrl").value) ? document.getElementById("videoUrl").value.trim() : "";
      var duration = parseInt((document.getElementById("courseDuration") && document.getElementById("courseDuration").value) || "0", 10) || 0;

      var instructorImageFile = document.getElementById("courseInstructorImage") && document.getElementById("courseInstructorImage").files[0];
      var coverImageFile = document.getElementById("courseCoverImage") && document.getElementById("courseCoverImage").files[0];
      var videoFile = document.getElementById("videoUpload") && document.getElementById("videoUpload").files[0];

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

      btnSubmit.disabled = true;
      showMessage(editCourseId ? "수정 중..." : "업로드 및 저장 중...", false);

      var refId = (editCourseId && currentCourseDoc && currentCourseDoc.refId) ? currentCourseDoc.refId : uniqueId();
      var basePath = STORAGE_PREFIX + "/" + refId;

      Promise.all([
        instructorImageFile ? uploadFile(instructorImageFile, basePath + "/instructor" + getExtension(instructorImageFile.name)) : Promise.resolve(""),
        coverImageFile ? uploadFile(coverImageFile, basePath + "/cover" + getExtension(coverImageFile.name)) : Promise.resolve(""),
        videoFile ? uploadFile(videoFile, basePath + "/video" + getExtension(videoFile.name)) : Promise.resolve("")
      ]).then(function (urls) {
        var instructorImageUrl = urls[0] || (currentCourseDoc && currentCourseDoc.instructorImageUrl) || "";
        var coverImageUrl = urls[1] || (currentCourseDoc && currentCourseDoc.coverImageUrl) || "";
        var videoStorageUrl = urls[2] || (currentCourseDoc && currentCourseDoc.videoStorageUrl) || "";
        var videoFinalUrl = videoStorageUrl || videoUrlInput || (currentCourseDoc && currentCourseDoc.videoUrl) || "";
        var data = {
          courseTitle: courseTitle,
          courseInstructor: courseInstructor,
          instructorImageUrl: instructorImageUrl,
          coverImageUrl: coverImageUrl,
          priceOriginal: priceOriginal,
          priceSale: priceSale,
          courseDesc: courseDesc,
          courseCategory: courseCategory,
          videoStorageUrl: videoStorageUrl || "",
          videoExternalUrl: videoUrlInput || "",
          videoUrl: videoFinalUrl,
          duration: duration,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          refId: refId
        };
        if (!editCourseId) data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        if (editCourseId) return db.collection("courses").doc(editCourseId).update(data);
        return db.collection("courses").add(data);
      }).then(function () {
        showMessage(editCourseId ? "강의가 수정되었습니다." : "강의가 등록되었습니다.", false);
        if (!editCourseId) {
          form.reset();
          if (courseDescEditor && courseDescEditor.setHTML) courseDescEditor.setHTML("");
        }
      }).catch(function (err) {
        console.error(err);
        showMessage("등록 실패: " + (err.message || err), true);
      }).finally(function () {
        btnSubmit.disabled = false;
      });
    });

    var btnCancel = document.getElementById("btnCourseCancel");
    if (btnCancel) {
      btnCancel.addEventListener("click", function () {
        form.reset();
        if (courseDescEditor && courseDescEditor.setHTML) courseDescEditor.setHTML("");
        if (msgEl) msgEl.classList.add("d-none");
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
