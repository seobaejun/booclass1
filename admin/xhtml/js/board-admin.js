/**
 * 관리자 게시판(무료/유료): Firestore CRUD + Toast UI Editor(이미지 Storage 업로드)
 *
 * 전제:
 * - 각 페이지에서 window.BOARD_COLLECTION 값을 주입해야 함 (예: 'diet_free_posts')
 * - boardListMessage, boardListTbody, boardEditorTitleInput, boardContentEditor(div), boardSubmitBtn, boardCancelBtn
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

  function escapeHtml(s) {
    if (s == null) return "";
    var div = document.createElement("div");
    div.textContent = String(s);
    return div.innerHTML;
  }

  function formatDate(ts) {
    if (!ts) return "-";
    if (ts.toDate) {
      var d = ts.toDate();
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }
    return "-";
  }

  function runWhenReady() {
    var collection = window.BOARD_COLLECTION || "";
    if (!collection) return;

    var listMsgEl = document.getElementById("boardListMessage");
    var tbody = document.getElementById("boardListTbody");
    if (!tbody) return;

    var titleInput = document.getElementById("boardEditorTitleInput");
    var submitBtn = document.getElementById("boardSubmitBtn");
    var cancelBtn = document.getElementById("boardCancelBtn");
    if (!titleInput || !submitBtn || !cancelBtn) return;

    var richEditor = null;
    var mode = "create";
    var editId = new URLSearchParams(window.location.search).get("edit") || "";
    var pageBase = window.location.pathname;

    if (typeof firebase === "undefined") return;
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();
    var storage = firebase.storage();

    try {
      if (typeof RichEditorAdmin !== "undefined" && document.getElementById("boardContentEditor")) {
        richEditor = RichEditorAdmin.create({
          containerId: "boardContentEditor",
          height: "400px",
          storage: storage,
          storagePathPrefix: "board/editor-images"
        });
      }
    } catch (e) {
      console.warn("게시판 에디터 초기화 실패:", e);
    }

    function setListMessage(text, isError) {
      if (!listMsgEl) return;
      listMsgEl.textContent = text || "";
      if (!text) {
        listMsgEl.classList.add("d-none");
        return;
      }
      listMsgEl.className = "alert " + (isError ? "alert-danger" : "alert-info") + " mb-3";
      listMsgEl.classList.remove("d-none");
    }

    function hideListMessage() {
      if (!listMsgEl) return;
      listMsgEl.classList.add("d-none");
    }

    function clearEditor() {
      titleInput.value = "";
      if (richEditor && richEditor.setHTML) richEditor.setHTML("");
    }

    function getEditorData() {
      if (richEditor && richEditor.getHTML) return richEditor.getHTML() || "";
      return "";
    }

    function setMode(nextMode, nextEditId) {
      mode = nextMode;
      editId = nextEditId || "";
      submitBtn.textContent = mode === "edit" ? "수정" : "등록";
    }

    function loadEditorIfNeeded() {
      if (!editId) {
        setMode("create", "");
        clearEditor();
        return Promise.resolve();
      }

      return db
        .collection(collection)
        .doc(editId)
        .get()
        .then(function (doc) {
          if (!doc.exists) {
            setListMessage("글을 찾을 수 없습니다.", true);
            setMode("create", "");
            clearEditor();
            return;
          }
          var d = doc.data() || {};
          var titleText = d.title || "";
          var bodyText = (d.content != null && d.content !== "") ? String(d.content) : (d.body || d.context || d.description || "");
          setMode("edit", editId);
          setTimeout(function () {
            if (titleInput) titleInput.value = titleText;
            if (richEditor && richEditor.setHTML) richEditor.setHTML(bodyText);
          }, 0);
        })
        .catch(function (err) {
          console.error(err);
          setListMessage("불러오기에 실패했습니다.", true);
        });
    }

    function loadList() {
      hideListMessage();
      setListMessage("", false);
      tbody.innerHTML = "";

      return db
        .collection(collection)
        .get()
        .then(function (snap) {
          if (snap.empty) {
            tbody.innerHTML =
              '<tr><td colspan="3" class="text-center text-muted py-4">등록된 글이 없습니다.</td></tr>';
            return;
          }

          var docs = snap.docs.slice();
          docs.sort(function (a, b) {
            var ta = a.data().createdAt;
            var tb = b.data().createdAt;
            var getTime = function (ts) {
              if (!ts) return 0;
              if (ts.toMillis) return ts.toMillis();
              if (ts.toDate) return ts.toDate().getTime();
              return 0;
            };
            return getTime(tb) - getTime(ta);
          });

          var html = "";
          docs.forEach(function (doc) {
            var d = doc.data() || {};
            var id = doc.id;
            var title = d.title || "-";
            var createdAt = formatDate(d.createdAt);

            html +=
              "<tr>" +
              "  <td>" + escapeHtml(title) + "</td>" +
              "  <td class='text-muted small'>" + escapeHtml(createdAt) + "</td>" +
              "  <td class='text-end'>" +
              "    <div class='d-flex gap-1 justify-content-end flex-wrap'>" +
              "      <button type='button' class='btn btn-sm btn-outline-primary board-edit-btn' data-id='" + escapeHtml(id) + "'>수정</button>" +
              "      <button type='button' class='btn btn-sm btn-outline-danger board-delete-btn' data-id='" + escapeHtml(id) + "'>삭제</button>" +
              "    </div>" +
              "  </td>" +
              "</tr>";
          });
          tbody.innerHTML = html;

          tbody.querySelectorAll(".board-edit-btn").forEach(function (btn) {
            btn.addEventListener("click", function () {
              var id = btn.getAttribute("data-id") || "";
              window.location.href = pageBase + "?edit=" + encodeURIComponent(id);
            });
          });

          tbody.querySelectorAll(".board-delete-btn").forEach(function (btn) {
            btn.addEventListener("click", function () {
              var id = btn.getAttribute("data-id") || "";
              if (!id) return;
              if (!confirm("이 글을 삭제할까요?")) return;
              db.collection(collection)
                .doc(id)
                .delete()
                .then(function () {
                  setListMessage("삭제되었습니다.");
                  if (editId && editId === id) {
                    setMode("create", "");
                    clearEditor();
                  }
                  loadList();
                })
                .catch(function (err) {
                  console.error(err);
                  setListMessage("삭제 실패: " + (err.message || err), true);
                });
            });
          });
        })
        .catch(function (err) {
          console.error(err);
          setListMessage("목록을 불러올 수 없습니다.", true);
        });
    }

    submitBtn.addEventListener("click", function () {
      var title = (titleInput.value || "").trim();
      var content = getEditorData();

      if (!title) {
        setListMessage("제목을 입력해 주세요.", true);
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "처리 중...";

      var payload = {
        title: title,
        content: content,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      var actionPromise = Promise.resolve();
      if (mode === "edit" && editId) {
        actionPromise = db.collection(collection).doc(editId).update(payload);
      } else {
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        actionPromise = db.collection(collection).add(payload).then(function (ref) {
          // 생성 모드로 전환
          setMode("create", "");
          clearEditor();
        });
      }

      actionPromise
        .then(function () {
          setListMessage(mode === "edit" ? "수정되었습니다." : "등록되었습니다.");
          loadList();
        })
        .catch(function (err) {
          console.error(err);
          setListMessage("저장 실패: " + (err.message || err), true);
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = mode === "edit" ? "수정" : "등록";
        });
    });

    cancelBtn.addEventListener("click", function () {
      if (mode === "edit") {
        window.location.href = pageBase;
      } else {
        clearEditor();
      }
    });

    loadEditorIfNeeded().then(function () {
      loadList();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runWhenReady);
  } else {
    runWhenReady();
  }
})();

