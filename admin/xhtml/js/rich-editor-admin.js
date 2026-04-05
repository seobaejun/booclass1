/**
 * Toast UI Editor (WYSIWYG) + Firebase Storage 이미지 업로드
 * 전자책 소개 / 강의 설명 / 게시판 본문 등 공통 사용
 */
(function (global) {
  "use strict";

  var DEFAULT_HEIGHT = "360px";

  function getEditorClass() {
    if (global.toastui && global.toastui.Editor) return global.toastui.Editor;
    if (global.Editor) return global.Editor;
    return null;
  }

  /**
   * @param {Object} options
   * @param {string} options.containerId - 비어 있는 div id (에디터가 여기에 마운트됨)
   * @param {string} [options.height]
   * @param {string} [options.initialValue] HTML 문자열
   * @param {firebase.storage.Storage} options.storage - firebase.storage()
   * @param {string} [options.storagePathPrefix] Storage 경로 접두사
   */
  function mountTextareaFallback(container, initialValue, height) {
    container.innerHTML = "";
    var note = document.createElement("p");
    note.className = "rich-editor-fallback-note";
    note.style.cssText =
      "margin:0 0 8px 0;padding:8px;background:#fff3cd;border:1px solid #ffc107;border-radius:4px;font-size:13px;";
    note.textContent =
      "리치 에디터 스크립트를 불러오지 못했습니다. 네트워크·CDN 차단 여부를 확인한 뒤 새로고침하세요. 아래에서 HTML을 직접 입력할 수 있습니다.";
    var ta = document.createElement("textarea");
    ta.className = "rich-editor-fallback-textarea";
    ta.value = initialValue || "";
    ta.style.cssText =
      "width:100%;box-sizing:border-box;min-height:" +
      (height || DEFAULT_HEIGHT) +
      ";font-family:monospace;font-size:14px;padding:10px;";
    container.appendChild(note);
    container.appendChild(ta);
    return ta;
  }

  function create(options) {
    var Editor = getEditorClass();
    var container = document.getElementById(options.containerId);
    if (!container) {
      console.error("RichEditorAdmin: 컨테이너를 찾을 수 없습니다.", options.containerId);
      return null;
    }
    if (!Editor) {
      console.error(
        "RichEditorAdmin: toastui.Editor가 없습니다. toastui-editor-all 번들 CDN 로드를 확인하세요."
      );
      var ta = mountTextareaFallback(
        container,
        options.initialValue || "",
        options.height || DEFAULT_HEIGHT
      );
      return {
        getHTML: function () {
          return ta.value || "";
        },
        setHTML: function (html) {
          ta.value = html || "";
        },
        destroy: function () {
          container.innerHTML = "";
        }
      };
    }

    var storage = options.storage;
    var pathPrefix = options.storagePathPrefix || "editor-images";

    var editor = new Editor({
      el: container,
      height: options.height || DEFAULT_HEIGHT,
      initialEditType: "wysiwyg",
      previewStyle: "vertical",
      initialValue: options.initialValue || "",
      toolbarItems: [
        ["heading", "bold", "italic", "strike"],
        ["hr", "quote"],
        ["ul", "ol", "task", "indent", "outdent"],
        ["table", "image", "link"],
        ["code", "codeblock"]
      ],
      hooks: {
        addImageBlobHook: function (blob, callback) {
          if (!storage || !blob) {
            if (typeof callback === "function") callback("", "");
            return;
          }
          var ext = ".png";
          if (blob.type && blob.type.indexOf("jpeg") !== -1) ext = ".jpg";
          else if (blob.type && blob.type.indexOf("webp") !== -1) ext = ".webp";
          else if (blob.type && blob.type.indexOf("gif") !== -1) ext = ".gif";
          var path =
            pathPrefix +
            "/" +
            Date.now() +
            "_" +
            Math.random().toString(36).slice(2, 10) +
            ext;
          var ref = storage.ref(path);
          ref
            .put(blob)
            .then(function () {
              return ref.getDownloadURL();
            })
            .then(function (url) {
              if (typeof callback === "function") callback(url, "image");
            })
            .catch(function (err) {
              console.error("이미지 업로드 실패:", err);
              if (typeof callback === "function") callback("", "");
            });
        }
      }
    });

    return {
      getHTML: function () {
        return editor.getHTML();
      },
      setHTML: function (html) {
        editor.setHTML(html || "");
      },
      destroy: function () {
        if (editor && typeof editor.destroy === "function") editor.destroy();
      }
    };
  }

  global.RichEditorAdmin = { create: create };
})(window);
