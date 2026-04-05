/**
 * Firebase Storage → 다운로드
 *
 * - getBlob(SDK) 미사용 — 전체를 메모리에 올리는 방식이라 느려질 수 있음.
 * - 일반·텍스트 공통: 텍스트 확장자만 fetch(CORS)로 받아 파일 저장 시도 → 실패 시 <a download> 한 번.
 * - iframe 미사용 (이중 다운로드 방지).
 */
(function (global) {
  global.BoostFileDownloadHelp =
    "텍스트가 웹에만 보이면 Storage CORS·파일 재업로드(attachment)를 확인하세요.\n" +
    "docs/ebook-download-solution.md 참고.";

  global.BoostFileDownloadUsedTabFallback = false;

  var lastDownloadAt = 0;
  var lastDownloadUrl = "";
  var DEBOUNCE_MS = 2000;

  var TEXT_FETCH_PATTERN = /\.(txt|md|csv|log|json|xml|rtf|tsv|tab)$/i;
  var MAX_TEXT_FETCH_BYTES = 25 * 1024 * 1024;

  function sanitizeFilename(name) {
    if (!name || typeof name !== "string") return "download";
    var s = name.replace(/[\\/:*?"<>|]/g, "_").trim();
    return s || "download";
  }

  function filenameFromStorageUrl(url) {
    try {
      var m = String(url).match(/\/o\/([^?]+)/);
      if (!m) return "";
      var path = decodeURIComponent(m[1].replace(/%2F/g, "/"));
      var last = path.split("/").pop();
      if (last) return sanitizeFilename(last);
    } catch (e) {}
    return "";
  }

  function extensionFromFilename(name) {
    if (!name || name.indexOf(".") === -1) return "";
    return name.slice(name.lastIndexOf("."));
  }

  function resolveDisplayFilename(fileUrl, preferredTitle) {
    var fromUrl = filenameFromStorageUrl(fileUrl);
    var ext = extensionFromFilename(fromUrl);
    var finalName;
    if (preferredTitle && String(preferredTitle).trim()) {
      var safe = sanitizeFilename(preferredTitle.trim());
      if (safe.indexOf(".") !== -1) {
        finalName = safe;
      } else {
        finalName = safe + (ext || "");
      }
    } else {
      finalName = fromUrl || "download" + (ext || "");
    }
    if (!finalName || finalName === ext) finalName = "download" + (ext || ".bin");
    return finalName;
  }

  function isFirebaseStorageHttpsUrl(url) {
    return /^https:\/\/(firebasestorage\.googleapis\.com|[^.]+\.firebasestorage\.app)\//i.test(
      String(url || "")
    );
  }

  function saveBlobAsFile(blob, fileName) {
    var asBinary = new Blob([blob], { type: "application/octet-stream" });
    var blobUrl = URL.createObjectURL(asBinary);
    var a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    a.style.display = "none";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(function () {
      URL.revokeObjectURL(blobUrl);
    }, 2500);
  }

  function isTextLikeFileName(fileName) {
    return TEXT_FETCH_PATTERN.test(fileName);
  }

  /** 텍스트류만: fetch로 받아 저장(CORS 필요). getBlob 미사용. */
  function tryFetchTextLikeBlob(fileUrl, fileName) {
    if (!isTextLikeFileName(fileName)) {
      return Promise.resolve(false);
    }
    return fetch(fileUrl, { mode: "cors", credentials: "omit", cache: "no-store" })
      .then(function (res) {
        if (!res.ok) return null;
        var lenHdr = res.headers.get("Content-Length");
        if (lenHdr) {
          var n = parseInt(lenHdr, 10);
          if (n > MAX_TEXT_FETCH_BYTES) return null;
        }
        return res.blob();
      })
      .then(function (blob) {
        if (!blob) return false;
        if (blob.size > MAX_TEXT_FETCH_BYTES) return false;
        saveBlobAsFile(blob, fileName);
        return true;
      })
      .catch(function () {
        return false;
      });
  }

  function triggerAnchorDownloadOnce(fileUrl, fileName) {
    var a = document.createElement("a");
    a.href = fileUrl;
    a.setAttribute("download", fileName);
    a.rel = "noopener noreferrer";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function openDownloadUrlInNewTab(fileUrl) {
    global.BoostFileDownloadUsedTabFallback = true;
    var w = window.open(fileUrl, "_blank", "noopener,noreferrer");
    if (!w) {
      window.location.href = fileUrl;
    }
  }

  function scheduleEnd(options, resolve) {
    window.setTimeout(function () {
      if (options && typeof options.onEnd === "function") {
        try {
          options.onEnd();
        } catch (eEnd) {}
      }
      resolve();
    }, 400);
  }

  function downloadFromUrl(fileUrl, preferredTitle, options) {
    var opts = options && typeof options === "object" ? options : null;
    global.BoostFileDownloadUsedTabFallback = false;

    if (!fileUrl) {
      return Promise.reject(new Error("URL이 없습니다."));
    }
    if (!isFirebaseStorageHttpsUrl(fileUrl)) {
      return Promise.reject(new Error("Firebase Storage URL이 아닙니다."));
    }

    var fileName = resolveDisplayFilename(fileUrl, preferredTitle);
    var now = Date.now();
    if (fileUrl === lastDownloadUrl && now - lastDownloadAt < DEBOUNCE_MS) {
      return Promise.resolve();
    }
    lastDownloadUrl = fileUrl;
    lastDownloadAt = now;

    if (opts && typeof opts.onStart === "function") {
      try {
        opts.onStart();
      } catch (eStart) {}
    }

    return tryFetchTextLikeBlob(fileUrl, fileName).then(function (handledByFetch) {
      if (handledByFetch) {
        return new Promise(function (resolve) {
          scheduleEnd(opts, resolve);
        });
      }
      try {
        triggerAnchorDownloadOnce(fileUrl, fileName);
      } catch (err) {
        console.warn("BoostFileDownload: anchor 실패 → 새 탭", err);
        openDownloadUrlInNewTab(fileUrl);
      }
      return new Promise(function (resolve) {
        scheduleEnd(opts, resolve);
      });
    });
  }

  function preloadModularSdkNoop() {
    return true;
  }

  global.BoostFileDownload = {
    downloadFromUrl: downloadFromUrl,
    filenameFromStorageUrl: filenameFromStorageUrl,
    preloadModularSdk: preloadModularSdkNoop
  };
})(typeof window !== "undefined" ? window : this);
