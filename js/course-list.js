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
      docs.sort(function (a, b) { return getCreatedTime(b) - getCreatedTime(a); });

      docs.forEach(function (doc) {
        var d = doc.data();
        var id = doc.id;
        var title = d.courseTitle || "강의";
        var desc = plainTextFromHtml(d.courseDesc || "");
        var instructor = d.courseInstructor || "강사";
        var instructorImg = d.instructorImageUrl || "image/dummy-img-600x700.jpg";
        var coverImg = d.coverImageUrl || "image/6.jpg";
        var priceOriginal = typeof d.priceOriginal === "number" ? d.priceOriginal : 0;
        var priceSale = typeof d.priceSale === "number" ? d.priceSale : 0;
        var hasDiscount = priceOriginal > priceSale && priceOriginal > 0;
        var priceText = hasDiscount
          ? '<span class="text-decoration-line-through text-secondary me-1">' + formatPrice(priceOriginal) + "</span> " + formatPrice(priceSale)
          : formatPrice(priceSale);
        var detailUrl = "course-detail.html?id=" + encodeURIComponent(id);

        var col = document.createElement("div");
        col.className = "col";
        col.innerHTML =
          '<div class="card course-card">' +
          '  <div class="card-media">' +
          '    <a href="' + escapeHtml(detailUrl) + '"><img src="' + escapeHtml(coverImg) + '" alt="' + escapeHtml(title) + '" onerror="this.src=\'image/6.jpg\'"></a>' +
          "  </div>" +
          '  <div class="card-body">' +
          '    <div class="card-title-wrap">' +
          '      <h5 class="card-title"><a href="' + escapeHtml(detailUrl) + '">' + escapeHtml(title) + "</a></h5>" +
          '      <p class="card-desc">' + escapeHtml(desc.slice(0, 80)) + (desc.length > 80 ? "…" : "") + "</p>" +
          "    </div>" +
          '    <div class="author-row">' +
          '      <div class="avatar"><img src="' + escapeHtml(instructorImg) + '" alt="" onerror="this.src=\'image/dummy-img-600x700.jpg\'"></div>' +
          '      <span class="author-name">' + escapeHtml(instructor) + "</span>" +
          "    </div>" +
          '    <div class="meta-row">' +
          '      <span class="price">' + priceText + "</span>" +
          "    </div>" +
          '    <div class="mt-3">' +
          '      <a href="' + escapeHtml(detailUrl) + '" class="btn btn-accent rounded-3 w-100">수강하기</a>' +
          "    </div>" +
          '    <div class="d-flex gap-2 mt-2">' +
          '      <button type="button" class="btn btn-sm btn-outline-light flex-fill bc-wish-course" data-id="' +
          escapeHtml(id) +
          '" data-title="' +
          escapeHtml(title) +
          '" data-cover="' +
          escapeHtml(coverImg) +
          '">찜</button>' +
          '      <button type="button" class="btn btn-sm btn-outline-light flex-fill bc-cart-course" data-id="' +
          escapeHtml(id) +
          '" data-title="' +
          escapeHtml(title) +
          '" data-cover="' +
          escapeHtml(coverImg) +
          '">장바구니</button>' +
          "    </div>" +
          "  </div>" +
          "</div>";
        grid.appendChild(col);
      });

      grid.addEventListener("click", function (ev) {
        var wishBtn = ev.target.closest(".bc-wish-course");
        var cartBtn = ev.target.closest(".bc-cart-course");
        if (!wishBtn && !cartBtn) return;
        ev.preventDefault();
        ev.stopPropagation();
        if (typeof BoostWishCart === "undefined") return;
        var u = BoostWishCart.requireLogin();
        if (!u) {
          window.location.href = "login.html?next=" + encodeURIComponent(window.location.href);
          return;
        }
        var btn = wishBtn || cartBtn;
        var itemId = btn.getAttribute("data-id");
        var itemTitle = btn.getAttribute("data-title") || "";
        var cover = btn.getAttribute("data-cover") || "";
        var detailUrl = "course-detail.html?id=" + encodeURIComponent(itemId);
        var metaLine = "수강기간 : 평생 소장";
        var purchaseUrl =
          typeof BoostWishCart !== "undefined" && BoostWishCart.resolvePurchaseUrl
            ? BoostWishCart.resolvePurchaseUrl("course", itemId, detailUrl, null)
            : detailUrl;
        var payload = {
          type: "course",
          itemId: itemId,
          title: itemTitle,
          metaLine: metaLine,
          detailUrl: detailUrl,
          purchaseUrl: purchaseUrl,
          thumbUrl: cover
        };
        var p = wishBtn
          ? BoostWishCart.addWishlist(u.uid, payload)
          : BoostWishCart.addCart(u.uid, payload);
        p.then(function (r) {
          if (r && r.duplicate) {
            window.alert(wishBtn ? "이미 찜한 강의입니다." : "이미 장바구니에 있습니다.");
          } else {
            window.alert(wishBtn ? "찜 목록에 추가했습니다." : "장바구니에 담았습니다.");
          }
        }).catch(function () {
          window.alert("저장에 실패했습니다.");
        });
      });
    })
    .catch(function (err) {
      if (placeholder) placeholder.remove();
      grid.innerHTML = '<div class="col-12 text-center py-5 text-danger">목록을 불러올 수 없습니다.</div>';
      console.error(err);
    });
})();
