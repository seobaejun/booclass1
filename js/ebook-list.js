/**
 * 전자책 목록: Firestore ebooks 컬렉션에서 로드하여 카드 렌더링
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

  if (typeof firebase === "undefined") return;
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  var db = firebase.firestore();

  function ebookDetailUrlWithRef(id) {
    var base = "ebook-detail.html?id=" + encodeURIComponent(id);
    var listParams = new URLSearchParams(window.location.search);
    var extra = new URLSearchParams();
    ["ref", "referral", "r"].forEach(function (k) {
      var v = listParams.get(k);
      if (v) extra.set(k, v);
    });
    var q = extra.toString();
    return q ? base + "&" + q : base;
  }

  function formatPrice(n) {
    if (n === 0) return "무료";
    return "₩" + Number(n).toLocaleString();
  }

  function escapeHtml(s) {
    if (!s) return "";
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function renderCard(doc) {
    var d = doc.data();
    var id = doc.id;
    var title = d.title || "";
    var authorName = d.authorName || "저자명";
    var authorImg = d.authorImageUrl || "image/dummy-img-600x700.jpg";
    var coverImg = d.coverImageUrl || "image/10.jpg";
    var priceOriginal = typeof d.priceOriginal === "number" ? d.priceOriginal : 0;
    var priceSale = typeof d.priceSale === "number" ? d.priceSale : 0;
    var priceText = formatPrice(priceSale);
    var hasDiscount = priceOriginal > priceSale && priceOriginal > 0;

    var priceHtml = priceText;
    if (hasDiscount) {
      priceHtml = '<span class="text-decoration-line-through text-secondary me-1">' + formatPrice(priceOriginal) + "</span> " + priceText;
    }

    var detailHref = ebookDetailUrlWithRef(id);
    var col = document.createElement("div");
    col.className = "col";
    col.innerHTML =
      '<div class="card ebook-card">' +
      '  <div class="card-media">' +
      '    <a href="' + escapeHtml(detailHref) + '"><img src="' + escapeHtml(coverImg) + '" alt="' + escapeHtml(title) + '" onerror="this.src=\'image/10.jpg\'"></a>' +
      "  </div>" +
      '  <div class="card-body">' +
      '    <div class="card-title-wrap">' +
      '      <h5 class="card-title"><a href="' + escapeHtml(detailHref) + '">' + escapeHtml(title) + "</a></h5>" +
      '      <p class="card-desc">' + escapeHtml((d.intro || "").replace(/<[^>]+>/g, "").slice(0, 60)) + "</p>" +
      "    </div>" +
      '    <div class="author-row">' +
      '      <div class="avatar"><img src="' + escapeHtml(authorImg) + '" alt="" onerror="this.src=\'image/dummy-img-600x700.jpg\'"></div>' +
      '      <span class="author-name">' + escapeHtml(authorName) + "</span>" +
      "    </div>" +
      '    <div class="meta-row">' +
      '      <span class="price">' + priceHtml + "</span>" +
      "    </div>" +
      '    <div class="mt-3">' +
      '      <a href="' + escapeHtml(detailHref) + '" class="btn btn-accent rounded-3 w-100">구매하기</a>' +
      "    </div>" +
      "  </div>" +
      "</div>";
    return col;
  }

  var container = document.getElementById("ebookListContainer");
  var emptyEl = document.getElementById("ebookListEmpty");
  if (!container) return;

  db.collection("ebooks")
    .get()
    .then(function (snap) {
      if (snap.empty) {
        if (emptyEl) emptyEl.classList.remove("d-none");
        return;
      }
      var docs = snap.docs.slice();
      docs.sort(function (a, b) {
        var o1 = a.data().order != null ? a.data().order : 999;
        var o2 = b.data().order != null ? b.data().order : 999;
        return o1 - o2;
      });
      var visibleCount = 0;
      docs.forEach(function (doc) {
        var d = doc.data();
        if (d && d.fromCourseBundle === true) return;
        visibleCount++;
        container.insertBefore(renderCard(doc), emptyEl);
      });
      if (visibleCount === 0 && emptyEl) {
        emptyEl.classList.remove("d-none");
      }
    })
    .catch(function () {
      if (emptyEl) emptyEl.classList.remove("d-none");
    });
})();
