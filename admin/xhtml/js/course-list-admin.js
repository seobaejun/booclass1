/**
 * 관리자 강의 영상 목록: Firestore courses 로드, 수정 링크, 삭제
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

  function run() {
    if (typeof firebase === "undefined") {
      setMessage("Firebase를 불러올 수 없습니다.", true);
      setTbody("<tr><td colspan=\"7\" class=\"text-center text-danger\">스크립트 오류</td></tr>");
      return;
    }
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();

    var tbody = document.getElementById("courseListTbody");
    var msgEl = document.getElementById("courseListMessage");
    if (!tbody) return;

    function setMessage(text, isError) {
      if (!msgEl) return;
      msgEl.textContent = text;
      msgEl.className = "alert " + (isError ? "alert-danger" : "alert-info") + " mb-3";
      msgEl.classList.remove("d-none");
    }

    function setTbody(html) {
      tbody.innerHTML = html;
    }

    function formatPrice(n) {
      if (n === 0) return "무료";
      return "₩" + Number(n).toLocaleString();
    }

    function escapeAttr(s) {
      if (!s) return "";
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    function deleteCourse(id, title) {
      if (!confirm("다음 강의를 삭제할까요?\n\n" + title)) return;
      db.collection("courses")
        .doc(id)
        .delete()
        .then(function () {
          setMessage("삭제되었습니다.");
          loadList();
        })
        .catch(function (err) {
          setMessage("삭제 실패: " + (err.message || err), true);
        });
    }

    function loadList() {
      setTbody("<tr><td colspan=\"7\" class=\"text-center text-muted py-4\">불러오는 중...</td></tr>");
      if (msgEl) msgEl.classList.add("d-none");

      db.collection("courses")
        .get()
        .then(function (snap) {
          if (snap.empty) {
            setTbody("<tr><td colspan=\"7\" class=\"text-center text-muted py-4\">등록된 강의가 없습니다.</td></tr>");
            return;
          }
          var docs = snap.docs.slice();
          docs.sort(function (a, b) {
            var getTime = function (doc) {
              var ts = doc.data().createdAt;
              if (!ts) return 0;
              if (ts.toMillis) return ts.toMillis();
              if (ts.toDate) return ts.toDate().getTime();
              return 0;
            };
            return getTime(b) - getTime(a);
          });
          var html = "";
          docs.forEach(function (doc) {
            var d = doc.data();
            var id = doc.id;
            var title = d.courseTitle || "-";
            var instructor = d.courseInstructor || "-";
            var cover = d.coverImageUrl || "";
            var orig = typeof d.priceOriginal === "number" ? d.priceOriginal : 0;
            var sale = typeof d.priceSale === "number" ? d.priceSale : 0;
            var videoUrl = d.videoUrl || "";
            var coverImg = cover
              ? "<img src=\"" + escapeAttr(cover) + "\" alt=\"\" style=\"width:48px;height:48px;object-fit:cover;\">"
              : "<span class=\"text-muted\">-</span>";
            var videoCell = videoUrl
              ? "<a href=\"" + escapeAttr(videoUrl) + "\" target=\"_blank\" rel=\"noopener\" class=\"btn btn-sm btn-outline-secondary\">보기</a>"
              : "<span class=\"text-muted\">-</span>";
            html +=
              "<tr>" +
              "<td>" + coverImg + "</td>" +
              "<td>" + escapeAttr(title) + "</td>" +
              "<td>" + escapeAttr(instructor) + "</td>" +
              "<td>" + formatPrice(orig) + "</td>" +
              "<td>" + formatPrice(sale) + "</td>" +
              "<td>" + videoCell + "</td>" +
              "<td class=\"text-end\">" +
              "<a href=\"course-video.html?edit=" + escapeAttr(id) + "\" class=\"btn btn-sm btn-outline-primary me-1\">수정</a>" +
              "<button type=\"button\" class=\"btn btn-sm btn-outline-danger\" data-course-id=\"" + escapeAttr(id) + "\" data-course-title=\"" + escapeAttr(title) + "\">삭제</button>" +
              "</td></tr>";
          });
          setTbody(html);

          tbody.querySelectorAll("button[data-course-id]").forEach(function (btn) {
            btn.addEventListener("click", function () {
              var id = btn.getAttribute("data-course-id");
              var title = btn.getAttribute("data-course-title") || "";
              deleteCourse(id, title);
            });
          });
        })
        .catch(function (err) {
          setTbody("<tr><td colspan=\"7\" class=\"text-center text-danger\">목록을 불러올 수 없습니다.</td></tr>");
          setMessage("오류: " + (err.message || err), true);
        });
    }

    loadList();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
