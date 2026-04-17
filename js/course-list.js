/**
 * 강의 수강 목록: Firestore courses 컬렉션에서 로드하여 카드 렌더링
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
  var VOD_PRICE_OVERRIDE_BY_COURSE_ID = {
    z9zwrkOB5soaMZA18g75: 230000
  };

  function courseDetailUrlWithRef(id) {
    var base = "course-detail.html?id=" + encodeURIComponent(id);
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

  function getDisplaySalePrice(courseId, rawSalePrice) {
    if (Object.prototype.hasOwnProperty.call(VOD_PRICE_OVERRIDE_BY_COURSE_ID, courseId)) {
      return VOD_PRICE_OVERRIDE_BY_COURSE_ID[courseId];
    }
    return rawSalePrice;
  }

  function escapeHtml(s) {
    if (!s) return "";
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function plainTextFromHtml(html) {
    if (!html) return "";
    var div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
  }

  function getCreatedTime(doc) {
    var ts = doc.data().createdAt;
    if (!ts) return 0;
    if (ts.toMillis) return ts.toMillis();
    if (ts.toDate) return ts.toDate().getTime();
    return 0;
  }

  function getCatalogOrder(d) {
    var v = d && d.catalogOrder;
    if (typeof v === "number" && !isNaN(v)) return v;
    return null;
  }

  var grid = document.getElementById("courseListGrid");
  var placeholder = document.getElementById("courseListPlaceholder");
  if (!grid) return;

  db.collection("courses")
    .get()
    .then(function (snap) {
      if (placeholder) placeholder.remove();
      if (snap.empty) {
        grid.innerHTML = '<div class="col-12 text-center py-5 text-muted">등록된 강의가 없습니다.</div>';
        return;
      }
      var docs = snap.docs.slice();
      docs.sort(function (a, b) {
        var oa = getCatalogOrder(a.data());
        var ob = getCatalogOrder(b.data());
        if (oa != null && ob != null && oa !== ob) return oa - ob;
        if (oa != null && ob == null) return -1;
        if (oa == null && ob != null) return 1;
        return getCreatedTime(b) - getCreatedTime(a);
      });

      docs.forEach(function (doc) {
        var d = doc.data();
        var id = doc.id;
        var title = d.courseTitle || "강의";
        var desc = plainTextFromHtml(d.courseDesc || "");
        var instructor = d.courseInstructor || "강사";
        var instructorImg = d.instructorImageUrl || "image/dummy-img-600x700.jpg";
        var coverImg = d.coverImageUrl || "image/6.jpg";
        var priceOriginal = typeof d.priceOriginal === "number" ? d.priceOriginal : 0;
        var rawPriceSale = typeof d.priceSale === "number" ? d.priceSale : 0;
        var priceSale = getDisplaySalePrice(id, rawPriceSale);
        var hasDiscount = priceOriginal > priceSale && priceOriginal > 0;
        var priceText = hasDiscount
          ? '<span class="text-decoration-line-through text-secondary me-1">' + formatPrice(priceOriginal) + "</span> " + formatPrice(priceSale)
          : formatPrice(priceSale);
        var detailUrl = courseDetailUrlWithRef(id);

        var col = document.createElement("div");
        col.className = "col";
        col.innerHTML =
          '<div class="card course-card">' +
          '  <div class="card-media">' +
          '    <a href="' + escapeHtml(detailUrl) + '"><img src="' + escapeHtml(coverImg) + '" alt="' + escapeHtml(title) + '" width="480" height="480" loading="lazy" decoding="async" onerror="this.src=\'image/6.jpg\'"></a>' +
          "  </div>" +
          '  <div class="card-body">' +
          '    <div class="card-title-wrap">' +
          '      <h5 class="card-title"><a href="' + escapeHtml(detailUrl) + '">' + escapeHtml(title) + "</a></h5>" +
          '      <p class="card-desc">' + escapeHtml(desc.slice(0, 80)) + (desc.length > 80 ? "…" : "") + "</p>" +
          "    </div>" +
          '    <div class="author-row">' +
          '      <div class="avatar"><img src="' + escapeHtml(instructorImg) + '" alt="" width="48" height="48" loading="lazy" decoding="async" onerror="this.src=\'image/dummy-img-600x700.jpg\'"></div>' +
          '      <span class="author-name">' + escapeHtml(instructor) + "</span>" +
          "    </div>" +
          '    <div class="meta-row">' +
          '      <span class="price">' + priceText + "</span>" +
          "    </div>" +
          '    <div class="mt-3">' +
          '      <a href="' + escapeHtml(detailUrl) + '" class="btn btn-accent rounded-3 w-100">수강하기</a>' +
          "    </div>" +
          "  </div>" +
          "</div>";
        grid.appendChild(col);
      });
    })
    .catch(function (err) {
      if (placeholder) placeholder.remove();
      grid.innerHTML = '<div class="col-12 text-center py-5 text-danger">목록을 불러올 수 없습니다.</div>';
      console.error(err);
    });
})();
