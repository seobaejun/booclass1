/**
 * Firebase Storage 업로드 메타: 브라우저가 직접 URL을 열 때도 파일로 받게 함 (텍스트/PDF 인라인 표시 완화)
 */
(function (global) {
  var MAX_FILENAME_LEN = 180;

  function sanitizeAsciiFilename(name) {
    var s = String(name || "download")
      .replace(/[\\/:*?"<>|]/g, "_")
      .trim();
    var ascii = s.replace(/[^\x20-\x7E]/g, "_");
    return ascii || "download";
  }

  function truncateFilename(name) {
    var s = String(name || "");
    if (s.length <= MAX_FILENAME_LEN) return s;
    var ext = "";
    var dot = s.lastIndexOf(".");
    if (dot > 0) {
      ext = s.slice(dot);
      s = s.slice(0, dot);
    }
    return s.slice(0, MAX_FILENAME_LEN - ext.length - 3) + "..." + ext;
  }

  /**
   * @param {string} originalFilename
   * @returns {string} Storage metadata.contentDisposition
   */
  function buildContentDisposition(originalFilename) {
    var raw = truncateFilename(String(originalFilename || "download").trim() || "download");
    var ascii = sanitizeAsciiFilename(raw);
    return (
      'attachment; filename="' +
      ascii.replace(/\\/g, "\\\\").replace(/"/g, '\\"') +
      '"; filename*=UTF-8\'\'' +
      encodeURIComponent(raw)
    );
  }

  /**
   * 전자책·강의 자료 파일 경로만 attachment (표지/저자/영상은 제외)
   * @param {string} storagePath
   * @returns {boolean}
   */
  function isDownloadAttachmentPath(storagePath) {
    if (!storagePath || typeof storagePath !== "string") return false;
    if (storagePath.indexOf("/files/") !== -1) return true;
    if (/\/ebook\.[^/]+$/.test(storagePath)) return true;
    return false;
  }

  global.BoostStorageAttachment = {
    buildContentDisposition: buildContentDisposition,
    isDownloadAttachmentPath: isDownloadAttachmentPath
  };
})(typeof window !== "undefined" ? window : this);
