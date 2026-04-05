/**
 * 회원 member 문서의 wishlistItems / cartItems 배열 관리 (Firestore)
 * 항목: { key, type, itemId, title, categoryLabel, badgeText, metaLine, detailUrl, purchaseUrl, thumbUrl, addedAt }
 */
(function (global) {
  /** 강의/전자책 문서 id → 외부 결제 페이지(아임웹 등) — 상세 페이지와 동일 맵 유지 */
  var PURCHASE_URL_BY_COURSE_ID = {
    z9zwrkOB5soaMZA18g75: "https://boostmaster.imweb.me/?idx=3"
  };
  var PURCHASE_URL_BY_EBOOK_ID = {
    RHRpfrw7ZHW7QIhLonNk: "https://boostmaster.imweb.me/?idx=9"
  };

  /**
   * 마이페이지·찜/장바구니 저장 시 구매 링크 결정 (저장값 우선, 없으면 id 맵, 없으면 상세 URL)
   * @param {'course'|'ebook'} type
   * @param {string} itemId
   * @param {string} [detailUrl]
   * @param {string} [storedPurchaseUrl] 이미 저장된 purchaseUrl
   */
  function resolvePurchaseUrl(type, itemId, detailUrl, storedPurchaseUrl) {
    if (storedPurchaseUrl && String(storedPurchaseUrl).trim() && storedPurchaseUrl !== "#") {
      return String(storedPurchaseUrl).trim();
    }
    var key = String(itemId);
    if (type === "course" && PURCHASE_URL_BY_COURSE_ID[key]) {
      return PURCHASE_URL_BY_COURSE_ID[key];
    }
    if (type === "ebook" && PURCHASE_URL_BY_EBOOK_ID[key]) {
      return PURCHASE_URL_BY_EBOOK_ID[key];
    }
    return detailUrl || "#";
  }

  function getDb() {
    if (typeof firebase === "undefined" || !firebase.apps || !firebase.apps.length) return null;
    return firebase.firestore();
  }

  function itemKey(type, itemId) {
    return type + ":" + String(itemId);
  }

  function escapeHtml(s) {
    if (s == null) return "";
    var div = document.createElement("div");
    div.textContent = String(s);
    return div.innerHTML;
  }

  /**
   * @param {string} uid
   * @param {'wishlistItems'|'cartItems'} field
   * @param {{ type: 'course'|'ebook', itemId: string, title: string, categoryLabel?: string, metaLine?: string, detailUrl?: string, purchaseUrl?: string, thumbUrl?: string, badgeText?: string }} item
   */
  function addItem(uid, field, item) {
    var db = getDb();
    if (!db || !uid) return Promise.reject(new Error("not-ready"));
    var key = itemKey(item.type, item.itemId);
    var ref = db.collection("member").doc(uid);
    return ref.get().then(function (doc) {
      var data = doc.exists ? doc.data() : {};
      var arr = Array.isArray(data[field]) ? data[field].slice() : [];
      if (arr.some(function (x) { return x && x.key === key; })) {
        return { duplicate: true };
      }
      var categoryLabel = item.categoryLabel || (item.type === "course" ? "강의" : "전자책");
      var badgeText =
        item.badgeText || (field === "wishlistItems" ? "찜" : "장바구니");
      /* 배열 요소에는 serverTimestamp() 사용 불가(Firestore 제한) → 클라이언트 시각 */
      var addedAt =
        firebase.firestore.Timestamp && firebase.firestore.Timestamp.now
          ? firebase.firestore.Timestamp.now()
          : new Date();
      var resolvedPurchaseUrl = resolvePurchaseUrl(
        item.type,
        item.itemId,
        item.detailUrl || "#",
        item.purchaseUrl
      );
      arr.push({
        key: key,
        type: item.type,
        itemId: item.itemId,
        title: item.title || "",
        categoryLabel: categoryLabel,
        badgeText: badgeText,
        metaLine: item.metaLine || "",
        detailUrl: item.detailUrl || "#",
        purchaseUrl: resolvedPurchaseUrl,
        thumbUrl: item.thumbUrl || "",
        addedAt: addedAt
      });
      var payload = {};
      payload[field] = arr;
      return ref.set(payload, { merge: true }).then(function () {
        if (typeof window.BoostNotifications !== "undefined") {
          var productTitle = item.title || "상품";
          var np =
            field === "wishlistItems"
              ? window.BoostNotifications.notifyWishAdded(uid, productTitle)
              : window.BoostNotifications.notifyCartAdded(uid, productTitle);
          return np
            .then(function () {
              return { duplicate: false };
            })
            .catch(function () {
              return { duplicate: false };
            });
        }
        return { duplicate: false };
      });
    });
  }

  function removeItem(uid, field, key) {
    var db = getDb();
    if (!db || !uid || !key) return Promise.reject(new Error("not-ready"));
    var ref = db.collection("member").doc(uid);
    return ref.get().then(function (doc) {
      var data = doc.exists ? doc.data() : {};
      var arr = Array.isArray(data[field]) ? data[field] : [];
      var removed = null;
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] && arr[i].key === key) {
          removed = arr[i];
          break;
        }
      }
      var next = arr.filter(function (x) {
        return x && x.key !== key;
      });
      var payload = {};
      payload[field] = next;
      return ref.set(payload, { merge: true }).then(function () {
        if (!removed || typeof window.BoostNotifications === "undefined") return;
        var productTitle = removed.title || "상품";
        var np =
          field === "wishlistItems"
            ? window.BoostNotifications.notifyWishRemoved(uid, productTitle)
            : window.BoostNotifications.notifyCartRemoved(uid, productTitle);
        return np.catch(function () {});
      });
    });
  }

  function requireLogin() {
    if (typeof firebase === "undefined" || !firebase.auth) return null;
    var u = firebase.auth().currentUser;
    return u || null;
  }

  global.BoostWishCart = {
    itemKey: itemKey,
    escapeHtml: escapeHtml,
    resolvePurchaseUrl: resolvePurchaseUrl,
    addWishlist: function (uid, item) {
      return addItem(uid, "wishlistItems", item);
    },
    addCart: function (uid, item) {
      return addItem(uid, "cartItems", item);
    },
    removeWishlist: function (uid, key) {
      return removeItem(uid, "wishlistItems", key);
    },
    removeCart: function (uid, key) {
      return removeItem(uid, "cartItems", key);
    },
    requireLogin: requireLogin
  };
})(typeof window !== "undefined" ? window : this);
