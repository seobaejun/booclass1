/**
 * 게시판 목록/상세 - data/*.json 또는 추후 관리자 API 연동
 */
var Board = (function () {
  var DATA_URL = { free: 'data/free-board.json', paid: 'data/paid-board.json' };

  var FIRESTORE_COLLECTION = { free: 'diet_free_posts', paid: 'diet_paid_posts' };
  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyCijM7nOf7xYPKevbOsRrrZTA6XwgODeIM",
    authDomain: "boostclass-7d4fd.firebaseapp.com",
    projectId: "boostclass-7d4fd",
    storageBucket: "boostclass-7d4fd.firebasestorage.app",
    messagingSenderId: "774803491487",
    appId: "1:774803491487:web:daada5b95008a14c2730aa"
  };

  function getDataUrl(type) {
    return DATA_URL[type] || DATA_URL.free;
  }

  var PER_PAGE = 15;
  var LOAD_TIMEOUT_MS = 12000;

  function promiseWithTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () {
        reject(new Error('시간 초과'));
      }, ms);
      promise.then(
        function (v) { clearTimeout(t); resolve(v); },
        function (e) { clearTimeout(t); reject(e); }
      );
    });
  }

  function getPageFromUrl() {
    var p = new URLSearchParams(window.location.search).get('page');
    var n = parseInt(p, 10);
    return (n >= 1 && n < 1e5) ? n : 1;
  }

  function getListBaseUrl() {
    var path = window.location.pathname || '';
    var base = path.split('/').pop() || window.location.href.split('/').pop() || 'blog.html';
    return base.split('?')[0];
  }

  function loadList(type, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var listWrap = container.querySelector('[data-board-list]');
    if (!listWrap) listWrap = container;
    var page = getPageFromUrl();
    var baseUrl = getListBaseUrl();
    listWrap.innerHTML = '';

    var hasFirestore = (typeof firebase !== "undefined" && firebase.firestore);
    var loadPromise = hasFirestore ? loadListFromFirestore(type) : loadListFromJson(type);

    loadPromise.then(function (items) {
        if (!items || !items.length) {
          listWrap.innerHTML = '<p class="text-white-50">등록된 글이 없습니다.</p>';
          return;
        }
        var total = items.length;
        var totalPages = Math.ceil(total / PER_PAGE) || 1;
        if (page > totalPages) page = totalPages;
        var start = (page - 1) * PER_PAGE;
        var pageItems = items.slice(start, start + PER_PAGE);
        var html = '<div class="board-list-table">';
        html += '<div class="board-list-header border-bottom border-secondary py-2 text-white-50 small">';
        html += '<span class="board-list-col-no">번호</span><span class="board-list-col-title">제목</span><span class="board-list-col-date">작성일</span>';
        html += '</div>';
        html += '<ul class="list-unstyled mb-0 board-list">';
        pageItems.forEach(function (item, idx) {
          var no = start + idx + 1;
          var detailUrl = 'board-detail.html?type=' + type + '&id=' + encodeURIComponent(item.id);
          html += '<li class="board-list-item border-bottom border-secondary">';
          html += '<a href="' + detailUrl + '" class="board-list-row text-decoration-none text-white py-3">';
          html += '<span class="board-list-col-no">' + no + '</span>';
          html += '<span class="board-list-col-title">' + escapeHtml(item.title) + '</span>';
          html += '<span class="board-list-col-date text-white-50 small">' + escapeHtml(item.createdAt || '') + '</span>';
          html += '</a></li>';
        });
        html += '</ul></div>';
        var PAGINATION_WINDOW = 10;
        var pageStart = 1;
        var pageEnd = totalPages;
        if (totalPages > PAGINATION_WINDOW) {
          pageStart = Math.max(1, page - Math.floor(PAGINATION_WINDOW / 2));
          pageEnd = Math.min(totalPages, pageStart + PAGINATION_WINDOW - 1);
          if (pageEnd - pageStart + 1 < PAGINATION_WINDOW) {
            pageStart = Math.max(1, pageEnd - PAGINATION_WINDOW + 1);
          }
        }
        html += '<nav class="board-pagination mt-4 pt-3 border-top border-secondary" aria-label="페이지">';
        html += '<div class="board-pagination-inner">';
        var prevUrl = page > 1 ? baseUrl + '?page=' + (page - 1) : '#';
        html += '<a href="' + prevUrl + '" class="board-pagination-arrow' + (page <= 1 ? ' is-disabled' : '') + '" aria-label="이전">&#10094;</a>';
        html += '<span class="board-pagination-numbers">';
        for (var i = pageStart; i <= pageEnd; i++) {
          if (i === page) {
            html += '<span class="board-pagination-num is-current" aria-current="page">' + i + '</span>';
          } else {
            html += '<a href="' + baseUrl + '?page=' + i + '" class="board-pagination-num">' + i + '</a>';
          }
        }
        html += '</span>';
        var nextUrl = page < totalPages ? baseUrl + '?page=' + (page + 1) : '#';
        html += '<a href="' + nextUrl + '" class="board-pagination-arrow' + (page >= totalPages ? ' is-disabled' : '') + '" aria-label="다음">&#10095;</a>';
        html += '</div></nav>';
        listWrap.innerHTML = html;
      }).catch(function () {
        listWrap.innerHTML = '<p class="text-white-50">목록을 불러올 수 없습니다. 새로고침 해 주세요.</p>';
      });
  }

  function formatDate(ts) {
    if (!ts) return '';
    if (ts.toDate) {
      var d = ts.toDate();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    return ts;
  }

  /** Firestore 문서에서 본문 문자열 추출 (필드명이 content가 아닐 때 대비) */
  function getBoardBodyText(d) {
    if (!d || typeof d !== 'object') return '';
    var v = d.content;
    if (v == null || v === '') v = d.body;
    if (v == null || v === '') v = d.context;
    if (v == null || v === '') v = d.description;
    if (v == null) return '';
    if (typeof v === 'object' && v !== null) return '';
    return String(v);
  }

  function initFirebaseIfNeeded() {
    if (typeof firebase === "undefined") return false;
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    return true;
  }

  /** 목록 번호와 동일한 순서: 작성일 내림차순(목록 1번 = 정렬 후 첫 항목) */
  function sortItemsByCreatedDesc(items) {
    if (!items || !items.length) return;
    items.sort(function (a, b) {
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }

  function loadListFromJson(type) {
    return fetch(getDataUrl(type)).then(function (res) { return res.json(); }).then(function (items) {
      return items || [];
    });
  }

  /**
   * 유료 게시판 목록에서 표시되는「번호 1」에 해당하는 글의 문서 id.
   * Firestore/JSON 모두 목록과 동일한 정렬을 적용한다.
   */
  function getPaidFirstPostId() {
    var hasFirestore = typeof firebase !== 'undefined' && firebase.firestore;
    var loadPromise = hasFirestore
      ? loadListFromFirestore('paid')
      : loadListFromJson('paid').then(function (items) {
          var list = items || [];
          sortItemsByCreatedDesc(list);
          return list;
        });
    return loadPromise.then(function (items) {
      if (!items || !items.length) return null;
      return items[0].id;
    });
  }

  function loadListFromFirestore(type) {
    if (!initFirebaseIfNeeded()) return Promise.reject(new Error('Firebase not found'));
    var collectionName = FIRESTORE_COLLECTION[type] || FIRESTORE_COLLECTION.free;
    var db = firebase.firestore();

    return db
      .collection(collectionName)
      .get()
      .then(function (snap) {
        var items = [];
        snap.forEach(function (doc) {
          var d = doc.data() || {};
          items.push({
            id: doc.id,
            title: d.title || '',
            content: d.content || '',
            createdAt: formatDate(d.createdAt)
          });
        });
        sortItemsByCreatedDesc(items);
        return items;
      });
  }

  function loadDetail(type, id, titleElId, contentElId) {
    var titleEl = document.getElementById(titleElId);
    var contentEl = document.getElementById(contentElId);
    if (!titleEl || !contentEl) return;
    titleEl.textContent = '';
    contentEl.textContent = '';
    var dateEl = document.getElementById('board-detail-date');
    var hasFirestore = (typeof firebase !== "undefined" && firebase.firestore);
    if (hasFirestore) {
      loadDetailFromFirestore(type, id, titleEl, contentEl, dateEl);
    } else {
      fetch(getDataUrl(type))
        .then(function (res) { return res.json(); })
        .then(function (items) {
          var post = (items || []).find(function (item) { return String(item.id) === String(id); });
          if (!post) {
            titleEl.textContent = '글을 찾을 수 없습니다.';
            contentEl.textContent = '';
            if (dateEl) dateEl.textContent = '';
            return;
          }
          titleEl.textContent = post.title;
          if (dateEl) dateEl.textContent = post.createdAt || '';
          contentEl.textContent = post.content || '';
          contentEl.style.whiteSpace = 'pre-wrap';
        })
        .catch(function () {
          titleEl.textContent = '오류';
          contentEl.textContent = '글을 불러올 수 없습니다.';
          if (dateEl) dateEl.textContent = '';
        });
    }
  }

  function loadDetailFromFirestore(type, id, titleEl, contentEl, dateEl) {
    if (!initFirebaseIfNeeded()) {
      titleEl.textContent = '오류';
      contentEl.textContent = '글을 불러올 수 없습니다.';
      if (dateEl) dateEl.textContent = '';
      return;
    }
    var collectionName = FIRESTORE_COLLECTION[type] || FIRESTORE_COLLECTION.free;
    var db = firebase.firestore();
    db
      .collection(collectionName)
      .doc(id)
      .get()
      .then(function (doc) {
        try {
          if (!doc.exists) {
            titleEl.textContent = '글을 찾을 수 없습니다.';
            contentEl.textContent = '';
            if (dateEl) dateEl.textContent = '';
            return;
          }

          var d = doc.data() || {};
          titleEl.textContent = d.title || '';
          if (dateEl) dateEl.textContent = formatDate(d.createdAt);
          var rawBody = getBoardBodyText(d);
          if (rawBody.indexOf('<') !== -1 && rawBody.indexOf('>') !== -1) {
            contentEl.innerHTML = '<div class="board-content board-content-html">' + rawBody + '</div>';
            contentEl.style.whiteSpace = '';
            contentEl.style.color = 'rgba(255,255,255,0.92)';
          } else {
            contentEl.textContent = rawBody;
            contentEl.style.whiteSpace = 'pre-wrap';
            contentEl.style.color = 'rgba(255,255,255,0.92)';
          }
        } catch (e) {
          console.error(e);
          contentEl.textContent = '본문 로딩 오류';
        }
      })
      .catch(function () {
        titleEl.textContent = '오류';
        contentEl.textContent = '글을 불러올 수 없습니다.';
        if (dateEl) dateEl.textContent = '';
      });
  }

  function escapeHtml(s) {
    if (!s) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function lineBreaksToHtml(s) {
    return s.replace(/\n/g, '<br>');
  }

  return {
    loadList: loadList,
    loadDetail: loadDetail,
    getPaidFirstPostId: getPaidFirstPostId
  };
})();
