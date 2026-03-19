/**
 * 관리자 전자책 목록: Firestore ebooks 로드, 수정 링크, 삭제
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
      setTbody("<tr><td colspan=\"6\" class=\"text-center text-danger\">스크립트 오류</td></tr>");
      return;
    }
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();

    var tbody = document.getElementById("ebookListTbody");
    var msgEl = document.getElementById("ebookListMessage");
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

    function deleteEbook(id, title) {
      if (!confirm("다음 전자책을 삭제할까요?\n\n" + title)) return;
      db.collection("ebooks")
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
      setTbody("<tr><td colspan=\"6\" class=\"text-center text-muted py-4\">불러오는 중...</td></tr>");
      if (msgEl) msgEl.classList.add("d-none");

      db.collection("ebooks")
        .get()
        .then(function (snap) {
          if (snap.empty) {
            setTbody("<tr><td colspan=\"6\" class=\"text-center text-muted py-4\">등록된 전자책이 없습니다.</td></tr>");
            return;
          }
          var docs = snap.docs.slice();
          docs.sort(function (a, b) {
            var o1 = a.data().order != null ? a.data().order : 999;
            var o2 = b.data().order != null ? b.data().order : 999;
            return o1 - o2;
          });
          var html = "";
          docs.forEach(function (doc) {
            var d = doc.data();
            var id = doc.id;
            var title = d.title || "-";
            var author = d.authorName || "-";
            var cover = d.coverImageUrl || "";
            var orig = typeof d.priceOriginal === "number" ? d.priceOriginal : 0;
            var sale = typeof d.priceSale === "number" ? d.priceSale : 0;
            var coverImg = cover
              ? "<img src=\"" + escapeAttr(cover) + "\" alt=\"\" style=\"width:48px;height:48px;object-fit:cover;\">"
              : "<span class=\"text-muted\">-</span>";
            html +=
              "<tr>" +
              "<td>" + coverImg + "</td>" +
              "<td>" + escapeAttr(title) + "</td>" +
              "<td>" + escapeAttr(author) + "</td>" +
              "<td>" + formatPrice(orig) + "</td>" +
              "<td>" + formatPrice(sale) + "</td>" +
              "<td class=\"text-end\">" +
              "<a href=\"ebook-upload.html?edit=" + escapeAttr(id) + "\" class=\"btn btn-sm btn-outline-primary me-1\">수정</a>" +
              "<button type=\"button\" class=\"btn btn-sm btn-outline-danger\" data-ebook-id=\"" + escapeAttr(id) + "\" data-ebook-title=\"" + escapeAttr(title) + "\">삭제</button>" +
              "</td></tr>";
          });
          setTbody(html);

          tbody.querySelectorAll("button[data-ebook-id]").forEach(function (btn) {
            btn.addEventListener("click", function () {
              var id = btn.getAttribute("data-ebook-id");
              var title = btn.getAttribute("data-ebook-title") || "";
              deleteEbook(id, title);
            });
          });
        })
        .catch(function (err) {
          setTbody("<tr><td colspan=\"6\" class=\"text-center text-danger\">목록을 불러올 수 없습니다.</td></tr>");
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
