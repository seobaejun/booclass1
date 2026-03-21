/**
 * 온라인 강의 플레이어 — Firestore courses, parts[] 또는 단일 videoUrl(레거시)
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

  var params = new URLSearchParams(window.location.search);
  var courseId = params.get("id");
  if (!courseId) {
    document.getElementById("coursePlayerRoot").innerHTML =
      '<div class="cp-error-box">강의 id가 없습니다.</div>';
    return;
  }

  if (typeof firebase === "undefined") return;
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  var auth = firebase.auth();
  var db = firebase.firestore();

  function esc(s) {
    if (s == null) return "";
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function formatDurationMin(m) {
    var n = parseInt(m, 10);
    if (isNaN(n) || n <= 0) return "—";
    if (n < 60) return n + "분";
    var h = Math.floor(n / 60);
    var mm = n % 60;
    return h + "시간 " + mm + "분";
  }

  function formatTimeSec(sec) {
    sec = Math.floor(sec || 0);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function flattenCurriculum(course) {
    var rows = [];
    if (course.parts && Array.isArray(course.parts) && course.parts.length) {
      course.parts.forEach(function (part, pi) {
        var ptitle = part.partTitle || "Part " + (pi + 1);
        var lectures = Array.isArray(part.lectures) ? part.lectures : [];
        lectures.forEach(function (lec, li) {
          rows.push({
            partIndex: pi,
            lectureIndex: li,
            partTitle: ptitle,
            lectureTitle: lec.title || "강의 " + (li + 1),
            durationMin: lec.durationMin != null ? lec.durationMin : lec.duration || 0,
            videoStorageUrl: lec.videoStorageUrl || "",
            videoExternalUrl: lec.videoExternalUrl || "",
            videoUrl: lec.videoUrl || "",
            key: "p" + pi + "_l" + li
          });
        });
      });
      return rows;
    }
    var vu =
      course.videoStorageUrl ||
      course.videoExternalUrl ||
      course.videoUrl ||
      "";
    if (vu) {
      rows.push({
        partIndex: 0,
        lectureIndex: 0,
        partTitle: "강의",
        lectureTitle: course.courseTitle || "1강",
        durationMin: course.duration || 0,
        videoStorageUrl: course.videoStorageUrl || "",
        videoExternalUrl: course.videoExternalUrl || "",
        videoUrl: vu,
        key: "legacy"
      });
    }
    return rows;
  }

  function resolvePlayUrl(row) {
    return row.videoStorageUrl || row.videoExternalUrl || row.videoUrl || "";
  }

  function hasCourseAccess(memberData, cid, courseData) {
    if (courseData && courseData.isFree === true) return true;
    var items = (memberData && memberData.enrolledCourseItems) || [];
    return items.some(function (it) {
      return it && (it.key === "course:" + cid || it.itemId === cid);
    });
  }

  function mergeFreeCatalogAccess(db, cid) {
    return db
      .collection("courses")
      .where("isFree", "==", true)
      .get()
      .then(function (snap) {
        return snap.docs.some(function (d) {
          return d.id === cid;
        });
      });
  }

  var videoEl = document.getElementById("cpVideo");
  var titleEl = document.getElementById("cpPageTitle");
  var statEl = document.getElementById("cpStats");
  var curriculumEl = document.getElementById("cpCurriculum");
  var ebookPanelEl = document.getElementById("cpEbookDownloads");
  var rootEl = document.getElementById("coursePlayerRoot");
  var shellEl = document.getElementById("cpVideoShell");
  var controlsEl = document.getElementById("cpControls");
  var cpBtnPlay = document.getElementById("cpBtnPlay");
  var cpProgress = document.getElementById("cpProgress");
  var cpTimeCurrent = document.getElementById("cpTimeCurrent");
  var cpTimeTotal = document.getElementById("cpTimeTotal");
  var cpVolume = document.getElementById("cpVolume");
  var cpBtnMute = document.getElementById("cpBtnMute");
  var cpPlaybackRate = document.getElementById("cpPlaybackRate");
  var cpBtnFullscreen = document.getElementById("cpBtnFullscreen");

  var flatList = [];
  var currentIdx = 0;
  var totalDurationSec = 0;
  var isSeeking = false;

  function setControlsEnabled(enabled) {
    if (controlsEl) controlsEl.classList.toggle("cp-controls--disabled", !enabled);
    if (cpProgress) cpProgress.disabled = !enabled;
  }

  function syncVolumeSlider() {
    if (!videoEl || !cpVolume) return;
    cpVolume.value = videoEl.muted ? 0 : videoEl.volume;
  }

  function updateMuteIcons() {
    if (!videoEl) return;
    var hi = document.getElementById("cpIconVolHigh");
    var mu = document.getElementById("cpIconVolMute");
    if (!hi || !mu) return;
    if (videoEl.muted || videoEl.volume === 0) {
      hi.setAttribute("hidden", "");
      mu.removeAttribute("hidden");
    } else {
      mu.setAttribute("hidden", "");
      hi.removeAttribute("hidden");
    }
  }

  function updatePlayButtonState() {
    if (!videoEl || !cpBtnPlay) return;
    cpBtnPlay.classList.toggle("is-playing", !videoEl.paused);
  }

  function updateCustomTimes() {
    if (!videoEl || !cpTimeCurrent || !cpTimeTotal) return;
    cpTimeCurrent.textContent = formatTimeSec(videoEl.currentTime || 0);
    var d = videoEl.duration;
    cpTimeTotal.textContent = isFinite(d) && d > 0 ? formatTimeSec(d) : "0:00";
  }

  function updateProgressBarFromVideo() {
    if (!videoEl || !cpProgress || isSeeking) return;
    var d = videoEl.duration;
    if (!isFinite(d) || d <= 0) return;
    cpProgress.value = (videoEl.currentTime / d) * 100;
  }

  function onVideoTimeUpdate() {
    updateProgressLabel();
    updateCustomTimes();
    updateProgressBarFromVideo();
  }

  function setVideoUrl(url) {
    if (!videoEl) return;
    if (!url) {
      videoEl.removeAttribute("src");
      var ph0 = videoEl.parentElement && videoEl.parentElement.querySelector(".cp-video-placeholder");
      if (ph0) ph0.classList.remove("is-hidden");
      setControlsEnabled(false);
      if (cpTimeCurrent) cpTimeCurrent.textContent = "0:00";
      if (cpTimeTotal) cpTimeTotal.textContent = "0:00";
      if (cpProgress) cpProgress.value = 0;
      updatePlayButtonState();
      return;
    }
    var ph = videoEl.parentElement.querySelector(".cp-video-placeholder");
    if (ph) ph.classList.add("is-hidden");
    setControlsEnabled(true);
    if (cpPlaybackRate) {
      var rr = parseFloat(cpPlaybackRate.value);
      videoEl.playbackRate = isNaN(rr) ? 1 : rr;
    }
    videoEl.src = url;
    videoEl.play().catch(function () {});
    updatePlayButtonState();
  }

  function updateProgressLabel() {
    if (!statEl || !videoEl) return;
    var cur = videoEl.currentTime || 0;
    var dur = videoEl.duration;
    if (!isFinite(dur) || dur <= 0) {
      statEl.textContent =
        "재생 " + formatTimeSec(cur) + " · 목차에서 강의를 선택하세요";
      return;
    }
    var watched = Math.min(100, Math.round((cur / dur) * 1000) / 10);
    statEl.textContent =
      "이 강의 진행 " +
      watched +
      "% · " +
      formatTimeSec(cur) +
      " / " +
      formatTimeSec(dur);
  }

  function renderSidebar() {
    if (!curriculumEl) return;
    if (!flatList.length) {
      curriculumEl.innerHTML =
        '<p class="px-3 text-muted small">등록된 강의 영상이 없습니다.</p>';
      return;
    }
    var byPart = {};
    flatList.forEach(function (row, idx) {
      var pk = row.partTitle;
      if (!byPart[pk]) byPart[pk] = [];
      byPart[pk].push({ row: row, idx: idx });
    });
    var partKeys = Object.keys(byPart);
    var html = [];
    partKeys.forEach(function (pk, pi) {
      var items = byPart[pk];
      var totalMin = items.reduce(function (a, x) {
        return a + (parseInt(x.row.durationMin, 10) || 0);
      }, 0);
      html.push(
        '<div class="cp-part" data-part-index="' +
          pi +
          '">' +
          '<div class="cp-part-head" role="button" tabindex="0">' +
          '<span class="cp-part-num">' +
          (pi + 1) +
          "</span>" +
          '<div class="flex-grow-1 min-w-0">' +
          esc(pk) +
          '<div class="cp-part-meta">총 ' +
          formatDurationMin(totalMin) +
          " · " +
          items.length +
          "강</div></div>" +
          "</div>" +
          '<div class="cp-lecture-list">'
      );
      items.forEach(function (x) {
        var active = x.idx === currentIdx ? " active" : "";
        html.push(
          '<div class="cp-lecture-item' +
            active +
            '" data-idx="' +
            x.idx +
            '">' +
            '<span class="dot"></span>' +
            '<span class="flex-grow-1 min-w-0">' +
            esc(x.row.lectureTitle) +
            "</span>" +
            '<span class="cp-lecture-duration">' +
            (x.row.durationMin ? x.row.durationMin + "분" : "—") +
            "</span></div>"
        );
      });
      html.push("</div></div>");
    });
    curriculumEl.innerHTML = html.join("");

    curriculumEl.querySelectorAll(".cp-lecture-item").forEach(function (el) {
      el.addEventListener("click", function () {
        var i = parseInt(el.getAttribute("data-idx"), 10);
        if (!isNaN(i)) playIndex(i);
      });
    });
  }

  function playIndex(idx) {
    if (idx < 0 || idx >= flatList.length) return;
    currentIdx = idx;
    var row = flatList[idx];
    var url = resolvePlayUrl(row);
    setVideoUrl(url);
    renderSidebar();
  }

  function wireCustomControls() {
    if (!videoEl) return;

    setControlsEnabled(false);

    if (cpBtnPlay) {
      cpBtnPlay.addEventListener("click", function () {
        if (!videoEl.src) return;
        if (videoEl.paused) {
          videoEl.play().catch(function () {});
        } else {
          videoEl.pause();
        }
      });
    }

    if (cpProgress) {
      function seekFromRange() {
        var d = videoEl.duration;
        if (!isFinite(d) || d <= 0) return;
        videoEl.currentTime = (parseFloat(cpProgress.value) / 100) * d;
      }
      cpProgress.addEventListener("mousedown", function () {
        isSeeking = true;
      });
      cpProgress.addEventListener("touchstart", function () {
        isSeeking = true;
      }, { passive: true });
      cpProgress.addEventListener("input", seekFromRange);
      cpProgress.addEventListener("change", function () {
        seekFromRange();
        isSeeking = false;
      });
      ["mouseup", "touchend"].forEach(function (ev) {
        cpProgress.addEventListener(
          ev,
          function () {
            isSeeking = false;
          },
          { passive: true }
        );
      });
    }

    if (cpVolume) {
      cpVolume.addEventListener("input", function () {
        var v = parseFloat(cpVolume.value);
        videoEl.volume = v;
        videoEl.muted = v === 0;
        syncVolumeSlider();
        updateMuteIcons();
      });
    }

    if (cpBtnMute) {
      cpBtnMute.addEventListener("click", function () {
        if (!videoEl.src) return;
        videoEl.muted = !videoEl.muted;
        if (!videoEl.muted && videoEl.volume === 0) {
          videoEl.volume = 0.5;
        }
        syncVolumeSlider();
        updateMuteIcons();
      });
    }

    if (cpPlaybackRate) {
      cpPlaybackRate.addEventListener("change", function () {
        var r = parseFloat(cpPlaybackRate.value);
        videoEl.playbackRate = isNaN(r) ? 1 : r;
      });
    }

    if (cpBtnFullscreen && shellEl) {
      cpBtnFullscreen.addEventListener("click", function () {
        var doc = document;
        var isFs = doc.fullscreenElement || doc.webkitFullscreenElement;
        if (!isFs) {
          var req = shellEl.requestFullscreen || shellEl.webkitRequestFullscreen;
          if (req) req.call(shellEl).catch(function () {});
        } else {
          var exit = doc.exitFullscreen || doc.webkitExitFullscreen;
          if (exit) exit.call(doc).catch(function () {});
        }
      });
    }

    videoEl.addEventListener("timeupdate", onVideoTimeUpdate);
    videoEl.addEventListener("loadedmetadata", function () {
      onVideoTimeUpdate();
      updatePlayButtonState();
    });
    videoEl.addEventListener("play", updatePlayButtonState);
    videoEl.addEventListener("pause", updatePlayButtonState);
    videoEl.addEventListener("ended", function () {
      updatePlayButtonState();
      if (cpProgress) cpProgress.value = 100;
    });

    syncVolumeSlider();
    updateMuteIcons();
  }

  function wireTabs() {
    document.querySelectorAll(".cp-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        var target = tab.getAttribute("data-tab");
        document.querySelectorAll(".cp-tab").forEach(function (t) {
          t.classList.toggle("active", t === tab);
        });
        document.querySelectorAll(".cp-tab-panel").forEach(function (p) {
          p.classList.toggle("active", p.getAttribute("data-panel") === target);
        });
      });
    });
  }

  /**
   * 강의 문서의 attachedEbookIds 로 ebooks 컬렉션에서 메타·다운로드 URL 조회
   * @param {object} course
   * @returns {Promise<Array<{ id: string, title: string, fileUrl: string }>>}
   */
  function fetchAttachedEbooks(course) {
    var ids = course && course.attachedEbookIds;
    if (!Array.isArray(ids) || !ids.length) {
      return Promise.resolve([]);
    }
    return Promise.all(
      ids.map(function (eid) {
        if (!eid) return Promise.resolve(null);
        return db
          .collection("ebooks")
          .doc(eid)
          .get()
          .then(function (doc) {
            if (!doc.exists) return null;
            var d = doc.data() || {};
            return {
              id: doc.id,
              title: d.title || "전자책",
              fileUrl: d.ebookFileUrl || ""
            };
          });
      })
    ).then(function (rows) {
      return rows.filter(Boolean);
    });
  }

  function renderEbookPanel(items) {
    if (!ebookPanelEl) return;
    if (!items.length) {
      ebookPanelEl.innerHTML =
        '<p class="px-3 text-muted small">이 강의에 연결된 전자책이 없습니다. 관리자에서 강의 등록 시 전자책을 선택할 수 있습니다.</p>';
      return;
    }
    var html = items.map(function (it) {
      if (it.fileUrl) {
        return (
          '<div class="cp-ebook-row">' +
          '<span class="cp-ebook-title">' +
          esc(it.title) +
          '</span><a class="cp-ebook-btn" href="' +
          esc(it.fileUrl) +
          '" target="_blank" rel="noopener noreferrer">다운로드</a></div>'
        );
      }
      return (
        '<div class="cp-ebook-row">' +
        '<span class="cp-ebook-title">' +
        esc(it.title) +
        '</span><span class="cp-ebook-missing small text-muted">파일 없음</span></div>'
      );
    });
    ebookPanelEl.innerHTML = html.join("");
  }

  auth.onAuthStateChanged(function (user) {
    if (!user) {
      window.location.href =
        "login.html?next=" + encodeURIComponent(window.location.href);
      return;
    }
    Promise.all([
      db.collection("courses").doc(courseId).get(),
      db.collection("member").doc(user.uid).get(),
      mergeFreeCatalogAccess(db, courseId)
    ])
      .then(function (results) {
        var doc = results[0];
        var memberDoc = results[1];
        var isFreeCatalog = results[2];
        if (!doc.exists) {
          rootEl.innerHTML =
            '<div class="cp-error-box">강의를 찾을 수 없습니다.</div>';
          return;
        }
        var course = doc.data();
        var memberData = memberDoc.exists ? memberDoc.data() : {};
        var ok =
          hasCourseAccess(memberData, courseId, course) || isFreeCatalog;
        if (!ok) {
          rootEl.innerHTML =
            '<div class="cp-error-box">수강 권한이 없습니다. 마이페이지에서 구매코드를 등록했는지 확인해 주세요.</div>';
          return;
        }
        if (titleEl) titleEl.textContent = course.courseTitle || "강의";
        flatList = flattenCurriculum(course);
        flatList.forEach(function (r) {
          totalDurationSec += (parseInt(r.durationMin, 10) || 0) * 60;
        });
        wireCustomControls();
        wireTabs();
        renderSidebar();
        if (flatList.length) playIndex(0);
        else if (statEl) statEl.textContent = "등록된 영상이 없습니다.";
        fetchAttachedEbooks(course).then(renderEbookPanel);
      })
      .catch(function (err) {
        console.error(err);
        rootEl.innerHTML =
          '<div class="cp-error-box">불러오기에 실패했습니다.</div>';
      });
  });
})();
