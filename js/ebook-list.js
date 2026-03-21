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

    var col = document.createElement("div");
    col.className = "col";
    col.innerHTML =
      '<div class="card ebook-card">' +
      '  <div class="card-media">' +
      '    <a href="ebook-detail.html?id=' + escapeHtml(id) + '"><img src="' + escapeHtml(coverImg) + '" alt="' + escapeHtml(title) + '" onerror="this.src=\'image/10.jpg\'"></a>' +
      "  </div>" +
      '  <div class="card-body">' +
      '    <div class="card-title-wrap">' +
      '      <h5 class="card-title"><a href="ebook-detail.html?id=' + escapeHtml(id) + '">' + escapeHtml(title) + "</a></h5>" +
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
      '      <a href="ebook-detail.html?id=' + escapeHtml(id) + '" class="btn btn-accent rounded-3 w-100">구매하기</a>' +
      "    </div>" +
      '    <div class="d-flex gap-2 mt-2">' +
      '      <button type="button" class="btn btn-sm btn-outline-light flex-fill bc-wish-ebook" data-id="' +
      escapeHtml(id) +
      '" data-title="' +
      escapeHtml(title) +
      '" data-cover="' +
      escapeHtml(coverImg) +
      '">찜</button>' +
      '      <button type="button" class="btn btn-sm btn-outline-light flex-fill bc-cart-ebook" data-id="' +
      escapeHtml(id) +
      '" data-title="' +
      escapeHtml(title) +
      '" data-cover="' +
      escapeHtml(coverImg) +
      '">장바구니</button>' +
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
      docs.forEach(function (doc) {
        container.insertBefore(renderCard(doc), emptyEl);
      });

      container.addEventListener("click", function (ev) {
        var wishBtn = ev.target.closest(".bc-wish-ebook");
        var cartBtn = ev.target.closest(".bc-cart-ebook");
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
        var detailUrl = "ebook-detail.html?id=" + encodeURIComponent(itemId);
        var metaLine = "구매 후 평생 소장";
        var purchaseUrl =
          typeof BoostWishCart !== "undefined" && BoostWishCart.resolvePurchaseUrl
            ? BoostWishCart.resolvePurchaseUrl("ebook", itemId, detailUrl, null)
            : detailUrl;
        var payload = {
          type: "ebook",
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
            window.alert(wishBtn ? "이미 찜한 전자책입니다." : "이미 장바구니에 있습니다.");
          } else {
            window.alert(wishBtn ? "찜 목록에 추가했습니다." : "장바구니에 담았습니다.");
          }
        }).catch(function () {
          window.alert("저장에 실패했습니다.");
        });
      });
    })
    .catch(function () {
      if (emptyEl) emptyEl.classList.remove("d-none");
    });
})();
