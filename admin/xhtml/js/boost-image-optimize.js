/**
 * 관리자 업로드용: 표지·프로필 이미지를 리사이즈·JPEG 압축 후 Storage 업로드 → 랜딩·목록에서 버퍼링 완화
 */
(function (global) {
  var PRESET_COVER = {
    maxWidth: 920,
    maxHeight: 1320,
    quality: 0.86,
    mime: "image/jpeg"
  };
  var PRESET_AVATAR = {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.84,
    mime: "image/jpeg"
  };

  function isRasterImage(file) {
    if (!file || !file.type) return false;
    return /^image\/(jpeg|pjpeg|png|webp|gif)$/i.test(file.type);
  }

  function loadImageFromFile(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("image-load"));
      };
      img.src = url;
    });
  }

  function toBlob(canvas, mime, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(
        function (blob) {
          if (blob) resolve(blob);
          else reject(new Error("toBlob"));
        },
        mime,
        quality
      );
    });
  }

  /**
   * @param {File|null|undefined} file
   * @param {typeof PRESET_COVER} preset
   * @returns {Promise<File|Blob|null>}
   */
  function resizeImageFile(file, preset) {
    preset = preset || PRESET_COVER;
    if (!file) return Promise.resolve(null);
    if (!isRasterImage(file)) return Promise.resolve(file);
    var maxW = preset.maxWidth || 920;
    var maxH = preset.maxHeight || 1320;
    var quality = preset.quality != null ? preset.quality : 0.86;
    var mime = preset.mime || "image/jpeg";
    return loadImageFromFile(file)
      .then(function (img) {
        var w = img.naturalWidth || img.width;
        var h = img.naturalHeight || img.height;
        if (!w || !h) return file;
        var scale = Math.min(maxW / w, maxH / h, 1);
        var nw = Math.max(1, Math.round(w * scale));
        var nh = Math.max(1, Math.round(h * scale));
        var canvas = document.createElement("canvas");
        canvas.width = nw;
        canvas.height = nh;
        var ctx = canvas.getContext("2d");
        if (mime === "image/jpeg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, nw, nh);
        }
        ctx.drawImage(img, 0, 0, nw, nh);
        return toBlob(canvas, mime, quality).then(function (blob) {
          var base =
            file.name && typeof file.name === "string"
              ? file.name.replace(/\.[^.]+$/, "")
              : "image";
          var outName = base + ".jpg";
          if (typeof File === "function") {
            try {
              return new File([blob], outName, { type: mime, lastModified: Date.now() });
            } catch (e) {
              /* IE 등 */
            }
          }
          return blob;
        });
      })
      .catch(function () {
        return file;
      });
  }

  global.BoostImageOptimize = {
    presetCover: PRESET_COVER,
    presetAvatar: PRESET_AVATAR,
    resizeImageFile: resizeImageFile
  };
})(typeof window !== "undefined" ? window : this);
