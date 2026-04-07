/**
 * 마이페이지 구매코드 등록 — Firestore courses/ebooks 의 purchaseCode 와 연동
 * 무료(isFree) 콘텐츠는 코드 없이 마이페이지에서 별도 로드
 */
(function (global) {
  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyCijM7nOf7xYPKevbOsRrrZTA6XwgODeIM",
    authDomain: "boostclass-7d4fd.firebaseapp.com",
    projectId: "boostclass-7d4fd",
    storageBucket: "boostclass-7d4fd.firebasestorage.app",
    messagingSenderId: "774803491487",
    appId: "1:774803491487:web:daada5b95008a14c2730aa"
  };

  function getDb() {
    if (typeof firebase === "undefined" || !firebase.apps || !firebase.apps.length) return null;
    return firebase.firestore();
  }

  function ensureApp() {
    if (typeof firebase === "undefined" || !firebase.initializeApp) return null;
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    return firebase.firestore();
  }

  function resolvePurchaseUrl(type, itemId, detailUrl) {
    if (global.BoostWishCart && typeof global.BoostWishCart.resolvePurchaseUrl === "function") {
      return global.BoostWishCart.resolvePurchaseUrl(type, itemId, detailUrl, "");
    }
    return detailUrl || "#";
  }

  function nowTs() {
    return firebase.firestore.Timestamp && firebase.firestore.Timestamp.now
      ? firebase.firestore.Timestamp.now()
      : new Date();
  }

  function hasItemWithKey(arr, key) {
    if (!Array.isArray(arr)) return false;
    return arr.some(function (x) {
      return x && x.key === key;
    });
  }

  /**
   * @param {string} raw
   * @returns {string}
   */
  function normalizePurchaseCode(raw) {
    var s = (raw || "").trim();
    if (s.indexOf("@") === 0) {
      s = s.replace(/^@+/, "");
    }
    return s;
  }

  function redeemKeyForCourse(docId) {
    return "pc:course:" + docId;
  }

  function redeemKeyForEbook(docId) {
    return "pc:ebook:" + docId;
  }

  /**
   * @param {string} docId
   * @param {object} data
   * @param {{ isFree?: boolean }} opts
   */
  function buildCourseItem(docId, data, opts) {
    opts = opts || {};
    var isFree = opts.isFree === true;
    var d = data || {};
    var detailUrl = "course-player.html?id=" + encodeURIComponent(docId);
    var priceSale = d.priceSale != null && d.priceSale !== "" ? Number(d.priceSale) : null;
    var priceOriginal = d.priceOriginal != null && d.priceOriginal !== "" ? Number(d.priceOriginal) : null;
    if (priceSale != null && isNaN(priceSale)) priceSale = null;
    if (priceOriginal != null && isNaN(priceOriginal)) priceOriginal = null;
    return {
      key: "course:" + docId,
      type: "course",
      itemId: docId,
      title: d.courseTitle || "강의",
      categoryLabel: "강의",
      badgeText: isFree ? "무료" : "수강중",
      metaLine: "",
      detailUrl: detailUrl,
      purchaseUrl: resolvePurchaseUrl("course", docId, detailUrl),
      thumbUrl: d.coverImageUrl || "image/6.jpg",
      addedAt: nowTs(),
      isFreeCatalog: isFree,
      priceSale: priceSale,
      priceOriginal: priceOriginal
    };
  }

  /**
   * @param {string} docId
   * @param {object} data
   * @param {{ isFree?: boolean }} opts
   */
  function buildEbookItem(docId, data, opts) {
    opts = opts || {};
    var isFree = opts.isFree === true;
    var d = data || {};
    var detailUrl = "ebook-download.html?id=" + encodeURIComponent(docId);
    var priceSale = d.priceSale != null && d.priceSale !== "" ? Number(d.priceSale) : null;
    var priceOriginal = d.priceOriginal != null && d.priceOriginal !== "" ? Number(d.priceOriginal) : null;
    if (priceSale != null && isNaN(priceSale)) priceSale = null;
    if (priceOriginal != null && isNaN(priceOriginal)) priceOriginal = null;
    return {
      key: "ebook:" + docId,
      type: "ebook",
      itemId: docId,
      title: d.title || "전자책",
      categoryLabel: "전자책",
      badgeText: isFree ? "무료" : "소장",
      metaLine: "",
      detailUrl: detailUrl,
      purchaseUrl: resolvePurchaseUrl("ebook", docId, detailUrl),
      thumbUrl: d.coverImageUrl || "image/5.jpg",
      addedAt: nowTs(),
      isFreeCatalog: isFree,
      priceSale: priceSale,
      priceOriginal: priceOriginal
    };
  }

  /**
   * 무료 강의·전자책 목록 (마이페이지 병합용)
   * @param {firebase.firestore.Firestore|null} db
   * @returns {Promise<{ courseItems: object[], ebookItems: object[] }>}
   */
  function mergeEbookDocsById(docsA, docsB) {
    var map = {};
    (docsA || []).forEach(function (d) {
      if (d && d.id) map[d.id] = d;
    });
    (docsB || []).forEach(function (d) {
      if (d && d.id && !map[d.id]) map[d.id] = d;
    });
    return Object.keys(map).map(function (k) {
      return map[k];
    });
  }

  function fetchFreeCatalog(db) {
    var database = db || getDb() || ensureApp();
    if (!database) {
      return Promise.resolve({ courseItems: [], ebookItems: [] });
    }
    return Promise.all([
      database.collection("courses").where("isFree", "==", true).get(),
      database.collection("ebooks").where("isFree", "==", true).get(),
      database.collection("ebooks").where("priceSale", "==", 0).get()
    ]).then(function (snaps) {
      var courseItems = snaps[0].docs.map(function (d) {
        return buildCourseItem(d.id, d.data(), { isFree: true });
      });
      var ebookDocs = mergeEbookDocsById(snaps[1].docs, snaps[2].docs);
      var ebookItems = ebookDocs.map(function (d) {
        return buildEbookItem(d.id, d.data(), { isFree: true });
      });
      return { courseItems: courseItems, ebookItems: ebookItems };
    });
  }

  /**
   * @param {string} uid
   * @param {string} rawCode
   * @returns {Promise<{ ok: boolean, message?: string }>}
   */
  function redeem(uid, rawCode) {
    var db = getDb() || ensureApp();
    if (!db || !uid) {
      return Promise.resolve({ ok: false, message: "로그인이 필요합니다." });
    }
    var code = normalizePurchaseCode(rawCode);
    if (!code) {
      return Promise.resolve({ ok: false, message: "코드를 입력해 주세요." });
    }

    var coursesQ = db.collection("courses").where("purchaseCode", "==", code).limit(10).get();
    var ebooksQ = db.collection("ebooks").where("purchaseCode", "==", code).limit(10).get();

    return Promise.all([coursesQ, ebooksQ]).then(function (results) {
      var cSnap = results[0];
      var eSnap = results[1];
      var cCount = cSnap.size;
      var eCount = eSnap.size;

      if (cCount === 0 && eCount === 0) {
        return { ok: false, message: "코드가 올바르지 않습니다." };
      }
      if (cCount > 0 && eCount > 0) {
        return {
          ok: false,
          message: "동일 코드가 강의·전자책에 중복 설정되어 있습니다. 관리자에게 문의하세요."
        };
      }

      var isCourse = cCount > 0;
      var doc = isCourse ? cSnap.docs[0] : eSnap.docs[0];
      var docId = doc.id;
      var data = doc.data() || {};

      var ebookSale = data.priceSale != null && data.priceSale !== "" ? Number(data.priceSale) : null;
      if (
        data.isFree === true ||
        (!isCourse && ebookSale != null && !isNaN(ebookSale) && ebookSale === 0)
      ) {
        return {
          ok: false,
          message:
            "무료 강의·전자책은 코드 없이 「내 강의 보기」「내 전자책 보기」에서 바로 확인할 수 있습니다."
        };
      }

      var field = isCourse ? "enrolledCourseItems" : "ownedEbookItems";
      var newItem = isCourse ? buildCourseItem(docId, data, {}) : buildEbookItem(docId, data, {});
      var codeKey = isCourse ? redeemKeyForCourse(docId) : redeemKeyForEbook(docId);

      var ref = db.collection("member").doc(uid);
      return ref.get().then(function (memberDoc) {
        var mdata = memberDoc.exists ? memberDoc.data() : {};
        var courses = Array.isArray(mdata.enrolledCourseItems) ? mdata.enrolledCourseItems.slice() : [];
        var ebooks = Array.isArray(mdata.ownedEbookItems) ? mdata.ownedEbookItems.slice() : [];
        var redeemed = Array.isArray(mdata.redeemedPurchaseCodes) ? mdata.redeemedPurchaseCodes.slice() : [];

        if (redeemed.indexOf(codeKey) !== -1) {
          return { ok: false, message: "이미 사용한 구매코드입니다." };
        }
        if (field === "enrolledCourseItems") {
          if (hasItemWithKey(courses, newItem.key)) {
            return { ok: false, message: "이미 등록된 강의입니다." };
          }
          courses.push(newItem);
        } else {
          if (hasItemWithKey(ebooks, newItem.key)) {
            return { ok: false, message: "이미 등록된 전자책입니다." };
          }
          ebooks.push(newItem);
        }
        redeemed.push(codeKey);

        var currentMt = (mdata.memberType != null ? String(mdata.memberType) : "").trim();
        var preserveStaff = ["관리자", "강사", "코치"].indexOf(currentMt) !== -1;
        var nextMemberType = preserveStaff ? currentMt : "유료회원";

        return ref
          .set(
            {
              enrolledCourseItems: courses,
              ownedEbookItems: ebooks,
              memberType: nextMemberType,
              redeemedPurchaseCodes: redeemed,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            },
            { merge: true }
          )
          .then(function () {
            return {
              ok: true,
              message:
                "등록되었습니다. 유료 회원으로 전환되었으며, 내 강의·전자책에서 확인할 수 있습니다."
            };
          });
      });
    });
  }

  global.BoostPurchaseCode = {
    redeem: redeem,
    fetchFreeCatalog: fetchFreeCatalog,
    normalizePurchaseCode: normalizePurchaseCode,
    buildCourseItem: buildCourseItem,
    buildEbookItem: buildEbookItem
  };
})(typeof window !== "undefined" ? window : this);
