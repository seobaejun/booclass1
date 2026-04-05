/**
 * 브라우저용 확장자 → Content-Type (Firebase Storage put metadata용)
 * npm mime-types와 동일한 목적이며, 번들 없이 정적 페이지에서 사용합니다.
 */
(function (global) {
  var EXT_TO_MIME = {
    pdf: "application/pdf",
    epub: "application/epub+zip",
    txt: "text/plain; charset=utf-8",
    csv: "text/csv; charset=utf-8",
    rtf: "application/rtf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    odt: "application/vnd.oasis.opendocument.text",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xlsm: "application/vnd.ms-excel.sheet.macroEnabled.12",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ods: "application/vnd.oasis.opendocument.spreadsheet",
    odp: "application/vnd.oasis.opendocument.presentation",
    hwp: "application/x-hwp",
    zip: "application/zip",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml"
  };

  function getExtension(filename) {
    if (!filename || typeof filename !== "string") return "";
    var i = filename.lastIndexOf(".");
    return i >= 0 ? filename.slice(i + 1).toLowerCase() : "";
  }

  function getMimeTypeFromFilename(filename) {
    var ext = getExtension(filename);
    return EXT_TO_MIME[ext] || "application/octet-stream";
  }

  global.BoostMimeTypes = {
    getMimeTypeFromFilename: getMimeTypeFromFilename,
    getExtension: getExtension
  };
})(typeof window !== "undefined" ? window : this);
