/**
 * 게시판 목록/상세 - data/*.json 또는 추후 관리자 API 연동
 */
var Board = (function () {
  var DATA_URL = { free: 'data/free-board.json', paid: 'data/paid-board.json' };

  function getDataUrl(type) {
    return DATA_URL[type] || DATA_URL.free;
  }

  var PER_PAGE = 15;

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
    listWrap.innerHTML = '<p class="text-white-50">불러오는 중...</p>';
    fetch(getDataUrl(type))
      .then(function (res) { return res.json(); })
      .then(function (items) {
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
      })
      .catch(function () {
        listWrap.innerHTML = '<p class="text-white-50">목록을 불러올 수 없습니다.</p>';
      });
  }

  function loadDetail(type, id, titleElId, contentElId) {
    var titleEl = document.getElementById(titleElId);
    var contentEl = document.getElementById(contentElId);
    if (!titleEl || !contentEl) return;
    titleEl.textContent = '불러오는 중...';
    contentEl.innerHTML = '';
    var dateEl = document.getElementById('board-detail-date');
    fetch(getDataUrl(type))
      .then(function (res) { return res.json(); })
      .then(function (items) {
        var post = (items || []).find(function (item) { return String(item.id) === String(id); });
        if (!post) {
          titleEl.textContent = '글을 찾을 수 없습니다.';
          contentEl.innerHTML = '<p class="text-white-50"><a href="' + (type === 'paid' ? 'blog-post.html' : 'blog.html') + '">목록으로</a></p>';
          if (dateEl) dateEl.textContent = '';
          return;
        }
        titleEl.textContent = post.title;
        if (dateEl) dateEl.textContent = post.createdAt || '';
        contentEl.innerHTML = '<div class="board-content">' + lineBreaksToHtml(escapeHtml(post.content || '')) + '</div>';
      })
      .catch(function () {
        titleEl.textContent = '오류';
        contentEl.innerHTML = '<p class="text-white-50">글을 불러올 수 없습니다.</p>';
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
    loadDetail: loadDetail
  };
})();
