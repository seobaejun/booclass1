/**
 * 전자책 상세: URL id로 Firestore 문서 로드 후 제목/저자/가격/소개(HTML) 표시
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
  var auth = firebase.auth();
  var db = firebase.firestore();

  /** 문서 id별 외부 결제(아임웹 등) URL — 구매하기 버튼에 연결 */
  var PURCHASE_URL_BY_EBOOK_ID = {
    RHRpfrw7ZHW7QIhLonNk: "https://boostmaster.imweb.me/?idx=9"
  };

  function formatPrice(n) {
    if (n === 0) return "무료";
    return "₩" + Number(n).toLocaleString();
  }

  var params = new URLSearchParams(window.location.search);
  var id = params.get("id");
  if (!id) return;

  function redirectLoginWithAlert() {
    window.alert("로그인 후 이용 가능합니다. 먼저 로그인해 주세요.");
    var redirectTo =
      window.location.pathname + window.location.search + window.location.hash;
    window.location.href =
      "login.html?redirect=" + encodeURIComponent(redirectTo);
  }

  function ebookDetailUrlWithRefs() {
    var q = new URLSearchParams();
    q.set("id", id);
    var cur = new URLSearchParams(window.location.search);
    ["ref", "referral", "r"].forEach(function (k) {
      var v = cur.get(k);
      if (v) q.set(k, v);
    });
    return "ebook-detail.html?" + q.toString();
  }

  function memberHasOwnedEbook(memb, eid) {
    var items = (memb && memb.ownedEbookItems) || [];
    return items.some(function (it) {
      return it && (it.itemId === eid || it.key === "ebook:" + eid);
    });
  }

  function renderEbookDetail() {
    var uid = auth.currentUser ? auth.currentUser.uid : null;
    return Promise.all([
      db.collection("ebooks").doc(id).get(),
      uid ? db.collection("member").doc(uid).get() : Promise.resolve({ exists: false })
    ]).then(function (snaps) {
      var doc = snaps[0];
      var memberSnap = snaps[1];
      if (!doc.exists) return;
      var d = doc.data();
      var mdata = memberSnap.exists ? memberSnap.data() : {};
      if (d && d.fromCourseBundle === true) {
        window.location.replace("ebook.html");
        return;
      }
      var title = d.title || "전자책";
      var authorName = d.authorName || "저자명";
      var authorImg = d.authorImageUrl || "image/dummy-img-600x700.jpg";
      var coverImg = d.coverImageUrl || "image/10.jpg";
      var priceOriginal = typeof d.priceOriginal === "number" ? d.priceOriginal : 0;
      var priceSale = typeof d.priceSale === "number" ? d.priceSale : 0;
      var intro = d.intro || "";

      var breadcrumb = document.getElementById("ebookBreadcrumb");
      var titleEl = document.getElementById("ebookTitle");
      var authorEl = document.getElementById("ebookAuthor");
      var authorImgEl = document.getElementById("ebookAuthorImage");
      var priceEl = document.getElementById("ebookPrice");
      var coverEl = document.getElementById("ebookCover");
      var descEl = document.getElementById("ebookDesc");

      if (breadcrumb) breadcrumb.textContent = title;
      if (titleEl) titleEl.textContent = title;
      if (authorEl) authorEl.textContent = authorName;
      if (authorImgEl) {
        authorImgEl.src = authorImg;
        authorImgEl.onerror = function () { this.src = "image/dummy-img-600x700.jpg"; };
      }
      if (coverEl) {
        coverEl.src = coverImg;
        coverEl.onerror = function () { this.src = "image/10.jpg"; };
      }

      if (priceEl) {
        if (priceSale === 0) {
          priceEl.textContent = "무료";
        } else if (priceOriginal > priceSale && priceOriginal > 0) {
          priceEl.innerHTML = '<span class="text-decoration-line-through text-secondary me-1">' + formatPrice(priceOriginal) + "</span> " + formatPrice(priceSale);
        } else {
          priceEl.textContent = formatPrice(priceSale);
        }
      }

      if (descEl) {
        descEl.innerHTML = intro || "<p class=\"text-secondary mb-0\">소개 내용이 없습니다.</p>";
      }

      var purchaseLink = document.getElementById("ebookPurchaseLink");
      if (purchaseLink) {
        var canDownloadEbook = d.isFree === true || memberHasOwnedEbook(mdata, id);
        if (canDownloadEbook) {
          purchaseLink.href = "ebook-download.html?id=" + encodeURIComponent(id);
          purchaseLink.removeAttribute("target");
          purchaseLink.rel = "noopener noreferrer";
          var spDl = purchaseLink.querySelector("span");
          if (spDl) spDl.textContent = "전자책 다운로드";
        } else {
          var externalPurchaseUrl = PURCHASE_URL_BY_EBOOK_ID[id];
          if (externalPurchaseUrl) {
            purchaseLink.href = externalPurchaseUrl;
            purchaseLink.target = "_blank";
            purchaseLink.rel = "noopener noreferrer";
          }
          var spBuy = purchaseLink.querySelector("span");
          if (spBuy) spBuy.textContent = "구매하기";
        }
        purchaseLink.addEventListener("click", function (ev) {
          if (auth.currentUser) return;
          ev.preventDefault();
          redirectLoginWithAlert();
        });
      }

      var btnWish = document.getElementById("btnEbookWish");
      var btnCart = document.getElementById("btnEbookCart");
      var detailUrl = "ebook-detail.html?id=" + encodeURIComponent(id);
      var metaLine = "구매 후 평생 소장";
      var purchaseUrlForItem =
        typeof BoostWishCart !== "undefined" && BoostWishCart.resolvePurchaseUrl
          ? BoostWishCart.resolvePurchaseUrl("ebook", id, detailUrl, null)
          : (PURCHASE_URL_BY_EBOOK_ID[id] || detailUrl);
      if (btnWish) {
        btnWish.classList.remove("d-none");
        btnWish.onclick = function () {
          if (typeof BoostWishCart === "undefined") return;
          var u = BoostWishCart.requireLogin();
          if (!u) {
            window.location.href =
              "login.html?redirect=" + encodeURIComponent(window.location.href);
            return;
          }
          BoostWishCart.addWishlist(u.uid, {
            type: "ebook",
            itemId: id,
            title: title,
            metaLine: metaLine,
            detailUrl: detailUrl,
            purchaseUrl: purchaseUrlForItem,
            thumbUrl: coverImg
          })
            .then(function (r) {
              if (r && r.duplicate) window.alert("이미 찜한 전자책입니다.");
              else window.alert("찜 목록에 추가했습니다. 마이페이지에서 확인하세요.");
            })
            .catch(function () {
              window.alert("저장에 실패했습니다.");
            });
        };
      }
      if (btnCart) {
        btnCart.classList.remove("d-none");
        btnCart.onclick = function () {
          if (typeof BoostWishCart === "undefined") return;
          var u = BoostWishCart.requireLogin();
          if (!u) {
            window.location.href =
              "login.html?redirect=" + encodeURIComponent(window.location.href);
            return;
          }
          BoostWishCart.addCart(u.uid, {
            type: "ebook",
            itemId: id,
            title: title,
            metaLine: metaLine,
            detailUrl: detailUrl,
            purchaseUrl: purchaseUrlForItem,
            thumbUrl: coverImg
          })
            .then(function (r) {
              if (r && r.duplicate) window.alert("이미 장바구니에 있습니다.");
              else window.alert("장바구니에 담았습니다.");
            })
            .catch(function () {
              window.alert("저장에 실패했습니다.");
            });
        };
      }

      document.title = "부스트클래스 - " + title;
      })
      .catch(function () {});
  }

  renderEbookDetail();
})();
