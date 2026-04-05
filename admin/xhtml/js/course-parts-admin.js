/**
 * 강의 등록: 파트 · 강의(영상) 다중 구성 UI
 */
(function (global) {
  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  var innerEl = null;

  function lectureRowHtml(lec) {
    lec = lec || {};
    var st = lec.videoStorageUrl || "";
    var ex = lec.videoExternalUrl || "";
    var hint = st || ex ? '<div class="small text-success mt-1">기존 영상 등록됨 (교체하려면 파일 또는 URL 입력)</div>' : "";
    return (
      '<div class="border rounded p-2 mb-2 cp-lecture-block bg-white">' +
      '<div class="row g-2 align-items-end">' +
      '<div class="col-md-5"><label class="form-label small mb-0">강의 제목</label>' +
      '<input type="text" class="form-control form-control-sm cp-lec-title" value="' +
      esc(lec.title) +
      '" placeholder="예: Ch 1. 학습 목표"></div>' +
      '<div class="col-md-2"><label class="form-label small mb-0">시간(분)</label>' +
      '<input type="number" class="form-control form-control-sm cp-lec-duration" min="0" value="' +
      (lec.durationMin != null ? esc(String(lec.durationMin)) : "") +
      '" placeholder="0"></div>' +
      '<div class="col-md-5"><label class="form-label small mb-0">영상 파일</label>' +
      '<input type="file" class="form-control form-control-sm cp-lec-file" accept="video/mp4,video/webm,video/ogg"></div>' +
      '</div>' +
      '<div class="mt-2">' +
      '<label class="form-label small mb-0">또는 외부 URL (직접 재생 가능한 링크)</label>' +
      '<input type="url" class="form-control form-control-sm cp-lec-url" value="' +
      esc(ex) +
      '" placeholder="https://...mp4 또는 스트리밍 URL">' +
      "</div>" +
      hint +
      '<input type="hidden" class="cp-lec-existing-storage" value="' +
      esc(st) +
      '">' +
      '<input type="hidden" class="cp-lec-existing-external" value="' +
      esc(ex) +
      '">' +
      "</div>"
    );
  }

  function partBlockHtml(part) {
    part = part || {};
    var title = part.partTitle != null ? part.partTitle : "";
    var lectures = Array.isArray(part.lectures) && part.lectures.length ? part.lectures : [{}];
    var lecHtml = lectures.map(lectureRowHtml).join("");
    return (
      '<div class="cp-part-block border rounded p-3 mb-3 bg-light">' +
      '<div class="d-flex justify-content-between align-items-center mb-2">' +
      '<label class="form-label mb-0 fw-semibold">파트 제목</label>' +
      '<button type="button" class="btn btn-sm btn-outline-danger cp-remove-part">파트 삭제</button>' +
      "</div>" +
      '<input type="text" class="form-control form-control-sm cp-part-title mb-3" value="' +
      esc(title) +
      '" placeholder="예: Part 1. 프로젝트 소개">' +
      '<div class="cp-lectures">' +
      lecHtml +
      "</div>" +
      '<button type="button" class="btn btn-sm btn-outline-secondary cp-add-lecture">+ 이 파트에 강의 추가</button>' +
      "</div>"
    );
  }

  function bindPartEvents(partEl) {
    partEl.querySelector(".cp-remove-part").addEventListener("click", function () {
      if (innerEl.querySelectorAll(".cp-part-block").length <= 1) {
        window.alert("최소 1개의 파트가 필요합니다.");
        return;
      }
      partEl.remove();
    });
    partEl.querySelector(".cp-add-lecture").addEventListener("click", function () {
      var wrap = partEl.querySelector(".cp-lectures");
      var div = document.createElement("div");
      div.innerHTML = lectureRowHtml({});
      wrap.appendChild(div.firstElementChild);
    });
  }

  function addPart(partData) {
    var wrap = document.createElement("div");
    wrap.innerHTML = partBlockHtml(partData);
    var el = wrap.firstElementChild;
    innerEl.appendChild(el);
    bindPartEvents(el);
  }

  global.CoursePartsAdmin = {
    mount: function (containerId) {
      innerEl = document.getElementById(containerId);
      if (!innerEl) return;
      innerEl.innerHTML =
        '<div id="cpPartsInner"></div>' +
        '<button type="button" class="btn btn-sm btn-primary mt-1" id="cpBtnAddPart"><i class="fa fa-plus"></i> 파트 추가</button>';
      innerEl = document.getElementById("cpPartsInner");
      document.getElementById("cpBtnAddPart").addEventListener("click", function () {
        addPart({ partTitle: "", lectures: [{}] });
      });
      addPart({ partTitle: "Part 1", lectures: [{ title: "1강", durationMin: 0 }] });
    },

    loadFromCourse: function (course) {
      var container = document.getElementById("coursePartsMount");
      if (!container) return;
      container.innerHTML =
        '<div id="cpPartsInner"></div>' +
        '<button type="button" class="btn btn-sm btn-primary mt-1" id="cpBtnAddPart"><i class="fa fa-plus"></i> 파트 추가</button>';
      innerEl = document.getElementById("cpPartsInner");
      document.getElementById("cpBtnAddPart").addEventListener("click", function () {
        addPart({ partTitle: "", lectures: [{}] });
      });

      if (course.parts && Array.isArray(course.parts) && course.parts.length) {
        course.parts.forEach(function (p) {
          addPart(p);
        });
      } else {
        addPart({
          partTitle: "강의",
          lectures: [
            {
              title: "1강",
              durationMin: course.duration || 0,
              videoStorageUrl: course.videoStorageUrl || "",
              videoExternalUrl: course.videoExternalUrl || course.videoUrl || "",
              videoUrl: course.videoUrl || ""
            }
          ]
        });
      }
    },

    /**
     * @returns {{ parts: Array<{ partTitle: string, lectures: Array<{ title: string, durationMin: number, file: File|null, externalUrl: string, existingStorageUrl: string, existingExternalUrl: string }> }> }}
     */
    collectForUpload: function () {
      if (!innerEl) return { parts: [] };
      var parts = [];
      innerEl.querySelectorAll(".cp-part-block").forEach(function (block) {
        var ptitle =
          (block.querySelector(".cp-part-title") && block.querySelector(".cp-part-title").value.trim()) ||
          "Part";
        var lectures = [];
        block.querySelectorAll(".cp-lecture-block").forEach(function (row) {
          var titleInp = row.querySelector(".cp-lec-title");
          var durInp = row.querySelector(".cp-lec-duration");
          var fileInp = row.querySelector(".cp-lec-file");
          var urlInp = row.querySelector(".cp-lec-url");
          var exSt = row.querySelector(".cp-lec-existing-storage");
          var exEx = row.querySelector(".cp-lec-existing-external");
          lectures.push({
            title: titleInp ? titleInp.value.trim() : "",
            durationMin: durInp ? parseInt(durInp.value, 10) || 0 : 0,
            file: fileInp && fileInp.files && fileInp.files[0] ? fileInp.files[0] : null,
            externalUrl: urlInp ? urlInp.value.trim() : "",
            existingStorageUrl: exSt ? exSt.value.trim() : "",
            existingExternalUrl: exEx ? exEx.value.trim() : ""
          });
        });
        parts.push({ partTitle: ptitle, lectures: lectures });
      });
      return { parts: parts };
    }
  };
})(window);
