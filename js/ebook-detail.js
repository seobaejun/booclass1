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

  db.collection("ebooks")
    .doc(id)
    .get()
    .then(function (doc) {
      if (!doc.exists) return;
      var d = doc.data();
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
        var externalPurchaseUrl = PURCHASE_URL_BY_EBOOK_ID[id];
        if (externalPurchaseUrl) {
          purchaseLink.href = externalPurchaseUrl;
          purchaseLink.target = "_blank";
          purchaseLink.rel = "noopener noreferrer";
        }
      }

      document.title = "부스트클래스 - " + title;
    })
    .catch(function () {});
})();
