/**
 * 관리자 코치·관리자 목록: 코치 + 관리자 멤버타입 표시.
 * 코치: 추천인 코드·링크 = 이메일 @ 앞(소문자). 관리자: 코드·링크 없음.
 * 회원보기(관리자): 추천인 코드 없이 가입한 회원(referralBucket admin 또는 코드 미입력).
 * 총 매출: 대시보드와 동일하게 강의·전자책 priceSale 합(코치·관리자 담당 상품 제외).
 * 행별 레퍼럴 매출: 해당 레퍼럴 회원의 enrolledCourseItems·ownedEbookItems 금액 합(항목 미기재 시 상품 priceSale).
 * 코치·관리자(스태프) 회원의 구매액은 레퍼럴 매출에 포함하지 않음. referralCodeActive=false면 신규 가입에 코드 미반영(회원가입 페이지 검증).
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

  var ROWS_PER_PAGE = 20;
  var TABLE_COLSPAN = 9;
  /** 레퍼럴 회원 하위 패널 페이지당 인원 */
  var REFERRAL_ROWS_PER_PAGE = 20;

  /** 배포 사이트 기준 회원가입 전체 URL (추천인 링크 표시·복사용) */
  var PUBLIC_SITE_ORIGIN = "https://booclass1.vercel.app";
  var PUBLIC_REGISTER_PATH = "/register.html";

  function runWhenReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function escapeHtml(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatCreatedAt(ts) {
    if (!ts || typeof ts.toDate !== "function") return "—";
    try {
      return ts.toDate().toLocaleString("ko-KR");
    } catch (e) {
      return "—";
    }
  }

  function getCreatedMillis(data) {
    var ts = data.createdAt;
    if (ts && ts.toMillis) return ts.toMillis();
    return 0;
  }

  /** 코치로 등록된 멤버 타입 (한글·영문) */
  function isCoachMemberType(memberType) {
    var t = memberType == null ? "" : String(memberType).trim();
    return t === "코치" || t.toLowerCase() === "coach";
  }

  /** 관리자 멤버 타입 (한글·영문) */
  function isAdminMemberType(memberType) {
    var t = memberType == null ? "" : String(memberType).trim();
    return t === "관리자" || t.toLowerCase() === "admin";
  }

  function normNameKey(s) {
    return String(s == null ? "" : s)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function isCoachOrAdminMemberType(mt) {
    var n = mt == null ? "" : String(mt).trim();
    if (n === "코치" || n.toLowerCase() === "coach") return true;
    if (n === "관리자" || n.toLowerCase() === "admin") return true;
    return false;
  }

  /** 레퍼럴 집계·매출에서 제외: 코치·관리자 본인 구매는 매출에 넣지 않음 */
  function isStaffMember(data) {
    if (!data) return false;
    return isCoachMemberType(data.memberType) || isAdminMemberType(data.memberType);
  }

  function filterNonStaffReferralList(list) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      if (!isStaffMember(list[i].data)) out.push(list[i]);
    }
    return out;
  }

  /** 코치 추천 코드 사용 가능 여부(미설정 시 활성) */
  function isCoachReferralCodeActive(data) {
    if (!data) return true;
    return data.referralCodeActive !== false;
  }

  /**
   * 추천인 코드: 이메일 @ 앞(로컬 부분), 소문자.
   * 예: HongGil@Naver.com → honggil
   */
  function coachReferralCodeFromEmail(email) {
    var s = String(email || "").trim().toLowerCase();
    var at = s.indexOf("@");
    if (at < 0) return s;
    return s.slice(0, at);
  }

  function buildReferralRegisterUrl(code) {
    return (
      PUBLIC_SITE_ORIGIN +
      PUBLIC_REGISTER_PATH +
      "?ref=" +
      encodeURIComponent(code || "")
    );
  }

  function normReferralStored(val) {
    return String(val == null ? "" : val).trim().toLowerCase();
  }

  function sortEntries(entries, sortKey) {
    var copy = entries.slice();
    var cmpName = function (a, b) {
      return (a.data.displayName || "").localeCompare(
        b.data.displayName || "",
        "ko"
      );
    };
    var cmpEmail = function (a, b) {
      return (a.data.email || "").localeCompare(b.data.email || "", "ko");
    };
    var cmpCreatedDesc = function (a, b) {
      return getCreatedMillis(b.data) - getCreatedMillis(a.data);
    };
    var cmpCreatedAsc = function (a, b) {
      return getCreatedMillis(a.data) - getCreatedMillis(b.data);
    };

    switch (sortKey) {
      case "created_asc":
        copy.sort(cmpCreatedAsc);
        break;
      case "name_asc":
        copy.sort(cmpName);
        break;
      case "name_desc":
        copy.sort(function (a, b) {
          return -cmpName(a, b);
        });
        break;
      case "email_asc":
        copy.sort(cmpEmail);
        break;
      case "created_desc":
      default:
        copy.sort(cmpCreatedDesc);
    }
    return copy;
  }

  function memberTypeLabel(val) {
    var v = val == null ? "" : String(val).trim();
    if (!v) return "미지정";
    return v;
  }

  function buildCoachAdminNameKeySet(memberRows) {
    var set = {};
    for (var i = 0; i < memberRows.length; i++) {
      var m = memberRows[i];
      if (!isCoachOrAdminMemberType(m.memberType)) continue;
      var k1 = normNameKey(m.displayName);
      var k2 = normNameKey(m.email);
      if (k1) set[k1] = true;
      if (k2) set[k2] = true;
    }
    return set;
  }

  function isExcludedInstructorForRevenue(name, coachAdminKeySet) {
    var k = normNameKey(name);
    if (!k) return false;
    return !!coachAdminKeySet[k];
  }

  function filterDocsForRevenue(courseDocs, ebookDocs, memberRows) {
    var coachAdminKeySet = buildCoachAdminNameKeySet(memberRows);
    var courses = [];
    var i;
    for (i = 0; i < courseDocs.length; i++) {
      var cd = courseDocs[i].data();
      if (isExcludedInstructorForRevenue(cd.courseInstructor, coachAdminKeySet)) {
        continue;
      }
      courses.push(courseDocs[i]);
    }
    var ebooks = [];
    for (i = 0; i < ebookDocs.length; i++) {
      var ed = ebookDocs[i].data();
      if (isExcludedInstructorForRevenue(ed.authorName, coachAdminKeySet)) {
        continue;
      }
      ebooks.push(ebookDocs[i]);
    }
    return { courses: courses, ebooks: ebooks };
  }

  function sumTotalRevenueWon(courseDocs, ebookDocs, memberRows) {
    var filtered = filterDocsForRevenue(courseDocs, ebookDocs, memberRows);
    var sum = 0;
    function addDocs(docs) {
      for (var i = 0; i < docs.length; i++) {
        var d = docs[i].data();
        var n = parseInt(d.priceSale, 10);
        if (!isNaN(n) && n > 0) sum += n;
      }
    }
    addDocs(filtered.courses);
    addDocs(filtered.ebooks);
    return sum;
  }

  function formatWonKorean(n) {
    if (n == null || isNaN(n)) return "0원";
    return Number(n).toLocaleString("ko-KR") + "원";
  }

  function buildMemberRowsForRevenue(allMembersRaw) {
    var out = [];
    for (var i = 0; i < allMembersRaw.length; i++) {
      var e = allMembersRaw[i];
      out.push({
        displayName: e.data.displayName,
        email: e.data.email,
        memberType: e.data.memberType
      });
    }
    return out;
  }

  /** courses/ebooks 문서 id → priceSale(원) — 회원 라이브러리 항목 가격 보강용 */
  function buildProductPriceMaps(courseDocs, ebookDocs) {
    var c = {};
    var e = {};
    var i;
    for (i = 0; i < courseDocs.length; i++) {
      var d = courseDocs[i].data();
      var n = parseInt(d.priceSale, 10);
      if (!isNaN(n) && n >= 0) c[courseDocs[i].id] = n;
    }
    for (i = 0; i < ebookDocs.length; i++) {
      var d2 = ebookDocs[i].data();
      var n2 = parseInt(d2.priceSale, 10);
      if (!isNaN(n2) && n2 >= 0) e[ebookDocs[i].id] = n2;
    }
    return { course: c, ebook: e };
  }

  /** 회원 문서의 등록 강의·전자책 기준 매출 합(항목에 가격 없으면 상품표 가격 사용) */
  function revenueFromMemberLibrary(mdata, priceMaps) {
    if (isStaffMember(mdata)) return 0;
    var sum = 0;
    var cMap = priceMaps.course;
    var eMap = priceMaps.ebook;
    function walk(items, type) {
      var arr = Array.isArray(items) ? items : [];
      for (var i = 0; i < arr.length; i++) {
        var it = arr[i];
        if (!it || !it.itemId) continue;
        var ps =
          it.priceSale != null && it.priceSale !== ""
            ? Number(it.priceSale)
            : null;
        if (ps == null || isNaN(ps)) {
          ps = type === "course" ? cMap[it.itemId] : eMap[it.itemId];
        }
        if (ps != null && !isNaN(ps) && ps > 0) sum += ps;
      }
    }
    walk(mdata.enrolledCourseItems, "course");
    walk(mdata.ownedEbookItems, "ebook");
    return sum;
  }

  function sumRevenueForReferredList(list, priceMaps) {
    var s = 0;
    for (var i = 0; i < list.length; i++) {
      s += revenueFromMemberLibrary(list[i].data, priceMaps);
    }
    return s;
  }

  runWhenReady(function () {
    var tbody = document.getElementById("memberListTbody");
    var msgEl = document.getElementById("memberListMessage");
    var btnPrev = document.getElementById("memberPagePrev");
    var btnNext = document.getElementById("memberPageNext");
    var pageInfoEl = document.getElementById("memberPageInfo");
    var searchInput = document.getElementById("memberSearchInput");
    var sortSelect = document.getElementById("memberSortSelect");
    var elKpiMembers = document.getElementById("coachListStatTotalMembers");
    var elKpiRevenue = document.getElementById("coachListStatTotalRevenue");

    if (!tbody) return;

    /** 전체 member (레퍼럴 집계용) */
    var allMembersRaw = [];
    /** 마지막으로 불러온 상품 문서 — 총 매출 KPI·코치별 매출 */
    var lastCourseDocs = null;
    var lastEbookDocs = null;
    var productPriceMaps = { course: {}, ebook: {} };
    var coachEntries = [];
    var coachEntriesSorted = [];
    var referralDuplicateCount = {};
    var currentPage = 1;
    var searchQuery = "";
    var sortKey = "created_desc";
    /** 코치별 레퍼럴 목록 하위 페이지 (1부터) */
    var referralSubPageByCoach = {};
    var expandedCoachUid = null;

    function showError(text) {
      if (!msgEl) return;
      msgEl.textContent = text;
      msgEl.className = "alert alert-danger mb-3";
      msgEl.classList.remove("d-none");
    }

    function hideMessage() {
      if (msgEl) msgEl.classList.add("d-none");
    }

    function entryMatchesSearch(entry) {
      var q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      var d = entry.data;
      var name = (d.displayName || "").toLowerCase();
      var email = (d.email || "").toLowerCase();
      var code = coachReferralCodeFromEmail(d.email);
      var kind = entry.kind === "admin" ? "관리자" : "코치";
      return (
        name.indexOf(q) >= 0 ||
        email.indexOf(q) >= 0 ||
        code.indexOf(q) >= 0 ||
        kind.indexOf(q) >= 0
      );
    }

    function rebuildCoachList() {
      var combined = [];
      var dup = {};
      for (var i = 0; i < allMembersRaw.length; i++) {
        var e = allMembersRaw[i];
        var mt = e.data.memberType;
        if (isCoachMemberType(mt)) {
          combined.push({ id: e.id, data: e.data, kind: "coach" });
          var c = coachReferralCodeFromEmail(e.data.email);
          if (c) dup[c] = (dup[c] || 0) + 1;
        } else if (isAdminMemberType(mt)) {
          combined.push({ id: e.id, data: e.data, kind: "admin" });
        }
      }
      referralDuplicateCount = dup;
      coachEntries = combined;
    }

    function updateCoachListKpi() {
      if (elKpiMembers) elKpiMembers.textContent = String(allMembersRaw.length);
      if (!elKpiRevenue) return;
      if (!lastCourseDocs || !lastEbookDocs) {
        elKpiRevenue.textContent = "—";
        return;
      }
      var memberRows = buildMemberRowsForRevenue(allMembersRaw);
      var won = sumTotalRevenueWon(lastCourseDocs, lastEbookDocs, memberRows);
      elKpiRevenue.textContent = formatWonKorean(won);
    }

    function applyFilterAndSort() {
      var filtered = coachEntries.filter(entryMatchesSearch);
      coachEntriesSorted = sortEntries(filtered, sortKey);
    }

    function getTotalPages() {
      var n = coachEntriesSorted.length;
      if (n === 0) return 1;
      return Math.ceil(n / ROWS_PER_PAGE);
    }

    function clampCurrentPage() {
      var tp = getTotalPages();
      if (currentPage < 1) currentPage = 1;
      if (currentPage > tp) currentPage = tp;
    }

    function updatePaginationUI() {
      if (!btnPrev || !btnNext || !pageInfoEl) return;
      var total = coachEntriesSorted.length;
      var totalPages = getTotalPages();
      clampCurrentPage();
      pageInfoEl.textContent = currentPage + " / " + totalPages;
      btnPrev.disabled = currentPage <= 1 || total === 0;
      btnNext.disabled = currentPage >= totalPages || total === 0;
    }

    function findReferralsByCode(code) {
      var want = normReferralStored(code);
      if (!want) return [];
      var out = [];
      for (var i = 0; i < allMembersRaw.length; i++) {
        var e = allMembersRaw[i];
        var rc = e.data.referralCode;
        if (rc == null || String(rc).trim() === "") continue;
        if (normReferralStored(rc) === want) out.push(e);
      }
      out.sort(function (a, b) {
        return getCreatedMillis(b.data) - getCreatedMillis(a.data);
      });
      return filterNonStaffReferralList(out);
    }

    /** 추천인 코드 없이 가입(사이트/관리자 귀속). 스태프 제외 */
    function findMembersAdminReferral() {
      var out = [];
      for (var i = 0; i < allMembersRaw.length; i++) {
        var e = allMembersRaw[i];
        var rc = e.data.referralCode;
        if (rc != null && String(rc).trim() !== "") continue;
        if (isStaffMember(e.data)) continue;
        out.push(e);
      }
      out.sort(function (a, b) {
        return getCreatedMillis(b.data) - getCreatedMillis(a.data);
      });
      return out;
    }

    function findReferralContentHost(uid) {
      var nodes = tbody.querySelectorAll(".referral-detail-content");
      for (var k = 0; k < nodes.length; k++) {
        if (nodes[k].getAttribute("data-referral-content-for") === uid) {
          return nodes[k];
        }
      }
      return null;
    }

    function paintReferralSubPanel(uid, code, coachName, page, rowKind) {
      var host = findReferralContentHost(uid);
      if (!host) return;
      var list =
        rowKind === "admin"
          ? findMembersAdminReferral()
          : findReferralsByCode(code);
      var total = list.length;
      var totalSubPages = Math.max(1, Math.ceil(total / REFERRAL_ROWS_PER_PAGE));
      if (page < 1) page = 1;
      if (page > totalSubPages) page = totalSubPages;
      referralSubPageByCoach[uid] = page;

      var start = (page - 1) * REFERRAL_ROWS_PER_PAGE;
      var slice = list.slice(start, start + REFERRAL_ROWS_PER_PAGE);
      var tableRows = [];
      for (var j = 0; j < slice.length; j++) {
        var e = slice[j];
        var md = e.data;
        tableRows.push(
          "<tr>" +
            "<td>" +
            escapeHtml(md.displayName || "") +
            "</td>" +
            "<td>" +
            escapeHtml(md.email || "") +
            "</td>" +
            "<td>" +
            escapeHtml(memberTypeLabel(md.memberType)) +
            "</td>" +
            "<td>" +
            escapeHtml(formatCreatedAt(md.createdAt)) +
            "</td>" +
            "</tr>"
        );
      }
      if (slice.length === 0) {
        tableRows.push(
          '<tr><td colspan="4" class="text-center text-muted py-3">해당 코드로 가입한 회원이 없습니다.</td></tr>'
        );
      }

      var subPrevDisabled = page <= 1 ? " disabled" : "";
      var subNextDisabled = page >= totalSubPages ? " disabled" : "";

      var titleLine =
        rowKind === "admin"
          ? "추천인 코드 없이 가입한 회원(관리자 귀속) · 총 " +
            total +
            "명" +
            (coachName ? " · 관리자: " + escapeHtml(coachName) : "")
          : "추천인 코드 「" +
            escapeHtml(code || "—") +
            "」로 가입한 회원 · 총 " +
            total +
            "명" +
            (coachName ? " · 코치: " + escapeHtml(coachName) : "");

      host.innerHTML =
        '<p class="small text-muted mb-2">' +
        titleLine +
        "</p>" +
        '<div class="table-responsive">' +
        '<table class="table table-sm table-bordered align-middle mb-0 bg-white">' +
        "<thead><tr><th>이름</th><th>이메일</th><th>멤버타입</th><th>가입일</th></tr></thead>" +
        "<tbody>" +
        tableRows.join("") +
        "</tbody></table></div>" +
        '<div class="d-flex justify-content-center align-items-center flex-wrap gap-2 pt-3 border-top mt-3" role="navigation" aria-label="레퍼럴 목록 페이지">' +
        '<button type="button" class="btn btn-sm btn-outline-primary btn-referral-sub-prev"' +
        subPrevDisabled +
        ' data-coach-uid="' +
        escapeHtml(uid) +
        '">이전</button>' +
        '<span class="text-muted small px-2">' +
        page +
        " / " +
        totalSubPages +
        "</span>" +
        '<button type="button" class="btn btn-sm btn-outline-primary btn-referral-sub-next"' +
        subNextDisabled +
        ' data-coach-uid="' +
        escapeHtml(uid) +
        '">다음</button>' +
        "</div>";
    }

    function renderMemberTable() {
      var total = coachEntriesSorted.length;
      clampCurrentPage();

      if (total === 0) {
        var emptyMsg =
          coachEntries.length === 0
            ? '멤버타입이 "코치" 또는 "관리자"인 회원이 없습니다. 수강생 목록에서 멤버타입을 지정해 주세요.'
            : "검색 결과가 없습니다.";
        tbody.innerHTML =
          '<tr><td colspan="' +
          TABLE_COLSPAN +
          '" class="text-center text-muted py-4">' +
          escapeHtml(emptyMsg) +
          "</td></tr>";
        updatePaginationUI();
        return;
      }

      var start = (currentPage - 1) * ROWS_PER_PAGE;
      var slice = coachEntriesSorted.slice(start, start + ROWS_PER_PAGE);
      var rows = [];
      for (var i = 0; i < slice.length; i++) {
        var entry = slice[i];
        var uid = entry.id;
        var d = entry.data;
        var rowKind = entry.kind === "admin" ? "admin" : "coach";
        var name = d.displayName || "";
        var email = d.email || "";
        var code = coachReferralCodeFromEmail(email);
        var dupN = code ? referralDuplicateCount[code] || 0 : 0;
        var dupBadge =
          rowKind === "coach" && dupN > 1
            ? ' <span class="badge bg-warning text-dark">동일 코드 ' +
              dupN +
              "명</span>"
            : "";
        var linkUrl = buildReferralRegisterUrl(code);
        var seq = start + i + 1;
        var codeAttr = rowKind === "admin" ? "" : code;
        var isRefActive = rowKind === "coach" && isCoachReferralCodeActive(d);
        var refList =
          rowKind === "admin"
            ? findMembersAdminReferral()
            : findReferralsByCode(code);
        var refCount = refList.length;
        var refRev = sumRevenueForReferredList(refList, productPriceMaps);
        var refCountCell =
          '<td class="text-end text-nowrap coach-col-ref-count">' +
          refCount +
          '<span class="text-muted small">명</span></td>';
        var refRevCell =
          '<td class="text-end text-nowrap small coach-col-ref-rev">' +
          escapeHtml(formatWonKorean(refRev)) +
          "</td>";
        var toggleCell =
          rowKind === "admin"
            ? '<td class="text-center text-muted coach-col-toggle">—</td>'
            : '<td class="text-center coach-col-toggle">' +
              '<button type="button" class="btn btn-sm py-0 px-2 btn-toggle-referral-code' +
              (isRefActive ? " btn-success" : " btn-outline-secondary") +
              '" data-coach-uid="' +
              escapeHtml(uid) +
              '" data-active="' +
              (isRefActive ? "1" : "0") +
              '" title="ON일 때만 신규 가입에 추천 코드·링크가 반영됩니다.">' +
              (isRefActive ? "ON" : "OFF") +
              "</button></td>";
        var codeCell;
        var linkCell;
        if (rowKind === "admin") {
          codeCell = '<td class="text-muted">—</td>';
          linkCell = '<td class="text-muted">—</td>';
        } else if (!isRefActive) {
          codeCell =
            '<td class="text-muted"><code class="small text-decoration-line-through">' +
            escapeHtml(code || "—") +
            "</code>" +
            dupBadge +
            ' <span class="badge bg-secondary">비활성</span></td>';
          linkCell =
            '<td class="small text-break text-muted"><span class="text-decoration-line-through">' +
            escapeHtml(linkUrl) +
            '</span> <span class="small">(신규 미적용)</span></td>';
        } else {
          codeCell =
            "<td><code class=\"small\">" +
            escapeHtml(code || "—") +
            "</code>" +
            dupBadge +
            "</td>";
          linkCell =
            '<td class="small text-break">' +
            '<a href="' +
            escapeHtml(linkUrl) +
            '" target="_blank" rel="noopener">' +
            escapeHtml(linkUrl) +
            "</a> " +
            '<button type="button" class="btn btn-sm btn-outline-secondary py-0 btn-copy-referral-link" data-copy="' +
            escapeHtml(linkUrl) +
            '">복사</button>' +
            "</td>";
        }
        rows.push(
          '<tr data-coach-uid="' +
            escapeHtml(uid) +
            '" data-referral-code="' +
            escapeHtml(codeAttr) +
            '" data-row-kind="' +
            rowKind +
            '">' +
            '<td class="text-center">' +
            seq +
            "</td>" +
            "<td>" +
            escapeHtml(name) +
            "</td>" +
            "<td>" +
            escapeHtml(email) +
            "</td>" +
            codeCell +
            linkCell +
            refCountCell +
            refRevCell +
            toggleCell +
            '<td class="text-end">' +
            '<button type="button" class="btn btn-sm btn-primary btn-view-referrals">회원보기</button>' +
            "</td>" +
            "</tr>" +
            '<tr class="coach-referral-detail d-none" data-detail-for="' +
            escapeHtml(uid) +
            '">' +
            '<td colspan="' +
            TABLE_COLSPAN +
            '" class="p-0 bg-light">' +
            '<div class="coach-referral-detail-inner px-3 py-3">' +
            '<div class="referral-detail-content" data-referral-content-for="' +
            escapeHtml(uid) +
            '"></div>' +
            "</div></td></tr>"
        );
      }
      tbody.innerHTML = rows.join("");
      expandedCoachUid = null;
      referralSubPageByCoach = {};
      updatePaginationUI();
    }

    function setLoadingRow() {
      tbody.innerHTML =
        '<tr><td colspan="' +
        TABLE_COLSPAN +
        '" class="text-center text-muted py-4">불러오는 중…</td></tr>';
    }

    function refreshListFromServer() {
      hideMessage();
      currentPage = 1;
      setLoadingRow();
      if (btnPrev) btnPrev.disabled = true;
      if (btnNext) btnNext.disabled = true;
      if (pageInfoEl) pageInfoEl.textContent = "…";

      Promise.all([
        db.collection("member").get(),
        db.collection("courses").get(),
        db.collection("ebooks").get()
      ])
        .then(function (results) {
          var memberSnap = results[0];
          var courseSnap = results[1];
          var ebookSnap = results[2];
          lastCourseDocs = courseSnap.docs;
          lastEbookDocs = ebookSnap.docs;
          productPriceMaps = buildProductPriceMaps(
            lastCourseDocs,
            lastEbookDocs
          );
          if (memberSnap.empty) {
            allMembersRaw = [];
          } else {
            allMembersRaw = memberSnap.docs.map(function (d) {
              return { id: d.id, data: d.data() };
            });
          }
          searchQuery = searchInput ? searchInput.value : "";
          sortKey = sortSelect ? sortSelect.value : "created_desc";
          rebuildCoachList();
          applyFilterAndSort();
          currentPage = 1;
          updateCoachListKpi();
          renderMemberTable();
        })
        .catch(function (err) {
          console.error(err);
          allMembersRaw = [];
          lastCourseDocs = null;
          lastEbookDocs = null;
          productPriceMaps = { course: {}, ebook: {} };
          coachEntries = [];
          coachEntriesSorted = [];
          if (elKpiMembers) elKpiMembers.textContent = "—";
          if (elKpiRevenue) elKpiRevenue.textContent = "—";
          showError(
            "목록을 불러오지 못했습니다: " + (err.message || String(err))
          );
          tbody.innerHTML =
            '<tr><td colspan="' +
            TABLE_COLSPAN +
            '" class="text-center text-danger">불러오기 실패 (Firestore 규칙·네트워크 확인)</td></tr>';
          updatePaginationUI();
        });
    }

    tbody.addEventListener("click", function (ev) {
      var toggleRefBtn = ev.target.closest(".btn-toggle-referral-code");
      if (toggleRefBtn && !toggleRefBtn.disabled) {
        var uidToggle = toggleRefBtn.getAttribute("data-coach-uid");
        if (!uidToggle) return;
        var curOn = toggleRefBtn.getAttribute("data-active") === "1";
        var nextOn = !curOn;
        toggleRefBtn.disabled = true;
        db.collection("member")
          .doc(uidToggle)
          .update({ referralCodeActive: nextOn })
          .then(function () {
            for (var ti = 0; ti < allMembersRaw.length; ti++) {
              if (allMembersRaw[ti].id === uidToggle) {
                allMembersRaw[ti].data.referralCodeActive = nextOn;
                break;
              }
            }
            rebuildCoachList();
            applyFilterAndSort();
            renderMemberTable();
            hideMessage();
          })
          .catch(function (err) {
            console.error(err);
            showError(
              "추천 활성 설정 저장 실패: " + (err.message || String(err))
            );
          })
          .finally(function () {
            toggleRefBtn.disabled = false;
          });
        return;
      }

      var copyBtn = ev.target.closest(".btn-copy-referral-link");
      if (copyBtn && copyBtn.getAttribute("data-copy")) {
        var text = copyBtn.getAttribute("data-copy");
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(
            function () {
              copyBtn.textContent = "복사됨";
              setTimeout(function () {
                copyBtn.textContent = "복사";
              }, 1500);
            },
            function () {
              window.prompt("링크를 복사하세요:", text);
            }
          );
        } else {
          window.prompt("링크를 복사하세요:", text);
        }
        return;
      }

      var subPrev = ev.target.closest(".btn-referral-sub-prev");
      if (subPrev && !subPrev.disabled) {
        var uidP = subPrev.getAttribute("data-coach-uid");
        if (!uidP) return;
        var trP = tbody.querySelector('tr[data-coach-uid="' + uidP + '"]');
        if (!trP) return;
        var codeP = trP.getAttribute("data-referral-code") || "";
        var rowKindP = trP.getAttribute("data-row-kind") || "coach";
        var nameP = trP.querySelector("td:nth-child(2)");
        var coachNameP = nameP ? nameP.textContent.trim() : "";
        var curP = referralSubPageByCoach[uidP] || 1;
        paintReferralSubPanel(uidP, codeP, coachNameP, curP - 1, rowKindP);
        return;
      }

      var subNext = ev.target.closest(".btn-referral-sub-next");
      if (subNext && !subNext.disabled) {
        var uidN = subNext.getAttribute("data-coach-uid");
        if (!uidN) return;
        var trN = tbody.querySelector('tr[data-coach-uid="' + uidN + '"]');
        if (!trN) return;
        var codeN = trN.getAttribute("data-referral-code") || "";
        var rowKindN = trN.getAttribute("data-row-kind") || "coach";
        var nameN = trN.querySelector("td:nth-child(2)");
        var coachNameN = nameN ? nameN.textContent.trim() : "";
        var curN = referralSubPageByCoach[uidN] || 1;
        paintReferralSubPanel(uidN, codeN, coachNameN, curN + 1, rowKindN);
        return;
      }

      var viewBtn = ev.target.closest(".btn-view-referrals");
      if (viewBtn) {
        var tr = viewBtn.closest("tr[data-coach-uid]");
        if (!tr) return;
        var uid = tr.getAttribute("data-coach-uid");
        if (!uid) return;
        var code = tr.getAttribute("data-referral-code") || "";
        var nameCell = tr.querySelector("td:nth-child(2)");
        var coachName = nameCell ? nameCell.textContent.trim() : "";
        var detailTr = tbody.querySelector('tr[data-detail-for="' + uid + '"]');
        if (!detailTr) return;

        if (!detailTr.classList.contains("d-none")) {
          detailTr.classList.add("d-none");
          expandedCoachUid = null;
          return;
        }

        var allDetail = tbody.querySelectorAll("tr[data-detail-for]");
        for (var di = 0; di < allDetail.length; di++) {
          allDetail[di].classList.add("d-none");
        }
        detailTr.classList.remove("d-none");
        expandedCoachUid = uid;
        var startPage = referralSubPageByCoach[uid] || 1;
        var rowKindV = tr.getAttribute("data-row-kind") || "coach";
        paintReferralSubPanel(uid, code, coachName, startPage, rowKindV);
      }
    });

    if (btnPrev) {
      btnPrev.addEventListener("click", function () {
        if (currentPage <= 1) return;
        currentPage -= 1;
        hideMessage();
        renderMemberTable();
      });
    }
    if (btnNext) {
      btnNext.addEventListener("click", function () {
        if (currentPage >= getTotalPages()) return;
        currentPage += 1;
        hideMessage();
        renderMemberTable();
      });
    }

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        searchQuery = searchInput.value;
        currentPage = 1;
        hideMessage();
        applyFilterAndSort();
        renderMemberTable();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener("change", function () {
        sortKey = sortSelect.value;
        currentPage = 1;
        hideMessage();
        applyFilterAndSort();
        renderMemberTable();
      });
    }

    if (typeof firebase === "undefined") {
      showError("Firebase를 불러올 수 없습니다.");
      tbody.innerHTML =
        '<tr><td colspan="' +
        TABLE_COLSPAN +
        '" class="text-center text-danger">Firebase SDK 오류</td></tr>';
      updatePaginationUI();
      return;
    }

    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();

    refreshListFromServer();
  });
})();
