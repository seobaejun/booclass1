/**
 * 대시보드: Firestore member / courses / ebooks 기반 KPI, 수강생·매출 차트, 최근 가입자 목록.
 * 매출 차트는 강의·전자책 등록 시점의 priceSale 합(만원)을 사용하며,
 * 담당 강사/저자명이 회원 중 코치·관리자와 일치하는 상품은 집계에서 제외합니다.
 */
(function () {
  var MEMBER_COLLECTION = "member";
  var RECENT_MEMBER_LIMIT = 15;
  var CHART_READY_POLL_MS = 100;
  var CHART_READY_MAX_TRIES = 100;

  var firebaseConfig = {
    apiKey: "AIzaSyCijM7nOf7xYPKevbOsRrrZTA6XwgODeIM",
    authDomain: "boostclass-7d4fd.firebaseapp.com",
    projectId: "boostclass-7d4fd",
    storageBucket: "boostclass-7d4fd.firebasestorage.app",
    messagingSenderId: "774803491487",
    appId: "1:774803491487:web:daada5b95008a14c2730aa"
  };

  function escapeHtml(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normType(t) {
    return String(t == null ? "" : t).trim();
  }

  function isCoachType(t) {
    var n = normType(t);
    return n === "코치" || n.toLowerCase() === "coach";
  }

  function isCoachOrAdminMemberType(t) {
    var n = normType(t);
    if (n === "코치" || n.toLowerCase() === "coach") return true;
    if (n === "관리자" || n.toLowerCase() === "admin") return true;
    return false;
  }

  function normNameKey(s) {
    return String(s == null ? "" : s)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
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

  function isPaidMemberType(t) {
    return normType(t) === "유료회원";
  }

  function isFreeMemberType(t) {
    var n = normType(t);
    return n === "무료회원" || n === "";
  }

  function memberTypeLabel(t) {
    var n = normType(t);
    if (n === "") return "미지정";
    if (n === "유료회원") return "유료회원";
    if (n === "무료회원") return "무료회원";
    if (n === "코치" || n.toLowerCase() === "coach") return "코치";
    if (n === "강사") return "강사";
    if (n === "관리자" || n === "admin") return "관리자";
    return n;
  }

  function getMillisFromField(ts) {
    if (!ts) return 0;
    try {
      if (typeof ts.toMillis === "function") return ts.toMillis();
      if (typeof ts.toDate === "function") return ts.toDate().getTime();
    } catch (e) {}
    return 0;
  }

  function formatJoinDate(ts) {
    if (!ts || typeof ts.toDate !== "function") return "—";
    try {
      return ts.toDate().toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });
    } catch (e) {
      return "—";
    }
  }

  function startOfWeekMonday(date) {
    var d = new Date(date.getTime());
    var day = d.getDay();
    var diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function addDays(d, n) {
    var x = new Date(d.getTime());
    x.setDate(x.getDate() + n);
    return x;
  }

  function priceToManWon(priceSale) {
    var n = parseInt(priceSale, 10);
    if (isNaN(n) || n < 0) return 0;
    return Math.round(n / 10000);
  }

  function collectProductSalesByMonth(docs) {
    var map = {};
    for (var i = 0; i < docs.length; i++) {
      var d = docs[i].data();
      var ms = getMillisFromField(d.createdAt);
      if (!ms) continue;
      var day = new Date(ms);
      var key = day.getFullYear() * 100 + (day.getMonth() + 1);
      var p = priceToManWon(d.priceSale);
      map[key] = (map[key] || 0) + p;
    }
    return map;
  }

  function collectProductSalesByYear(docs) {
    var map = {};
    for (var i = 0; i < docs.length; i++) {
      var d = docs[i].data();
      var ms = getMillisFromField(d.createdAt);
      if (!ms) continue;
      var y = new Date(ms).getFullYear();
      var p = priceToManWon(d.priceSale);
      map[y] = (map[y] || 0) + p;
    }
    return map;
  }

  function cumulativeSeries(arr) {
    var out = [];
    var sum = 0;
    for (var i = 0; i < arr.length; i++) {
      sum += arr[i];
      out.push(sum);
    }
    return out;
  }

  function goalLineFromColumn(column) {
    var max = 0;
    for (var i = 0; i < column.length; i++) {
      if (column[i] > max) max = column[i];
    }
    var g = Math.max(1, Math.round(max * 0.65));
    return column.map(function () {
      return g;
    });
  }

  function mergeDaySalesMan(courseDocs, ebookDocs) {
    var map = {};
    function addDocs(docs) {
      for (var i = 0; i < docs.length; i++) {
        var d = docs[i].data();
        var ms = getMillisFromField(d.createdAt);
        if (!ms) continue;
        var day = new Date(ms);
        day.setHours(0, 0, 0, 0);
        var key = day.getTime();
        map[key] = (map[key] || 0) + priceToManWon(d.priceSale);
      }
    }
    addDocs(courseDocs);
    addDocs(ebookDocs);
    return map;
  }

  function buildRevenuePayload(courseDocs, ebookDocs) {
    var now = new Date();
    var dayMap = mergeDaySalesMan(courseDocs, ebookDocs);
    var weekLabels = [];
    var weekColumn = [];
    for (var w = 6; w >= 0; w--) {
      var day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - w);
      day.setHours(0, 0, 0, 0);
      weekLabels.push(["일", "월", "화", "수", "목", "금", "토"][day.getDay()]);
      weekColumn.push(dayMap[day.getTime()] || 0);
    }

    var monthLabels = [];
    var monthColumn = [];
    for (var m = 11; m >= 0; m--) {
      var dt = new Date(now.getFullYear(), now.getMonth() - m, 1);
      monthLabels.push(dt.getMonth() + 1 + "월");
      var key = dt.getFullYear() * 100 + (dt.getMonth() + 1);
      var mc = collectProductSalesByMonth(courseDocs);
      var me = collectProductSalesByMonth(ebookDocs);
      monthColumn.push((mc[key] || 0) + (me[key] || 0));
    }

    var yearLabels = [];
    var yearColumn = [];
    var startY = now.getFullYear() - 4;
    var yc = collectProductSalesByYear(courseDocs);
    var ye = collectProductSalesByYear(ebookDocs);
    for (var y = startY; y <= startY + 4; y++) {
      yearLabels.push(String(y));
      yearColumn.push((yc[y] || 0) + (ye[y] || 0));
    }

    var allColumn = monthColumn.slice();
    var allLabels = monthLabels.slice();

    function pack(column, labels) {
      var cum = cumulativeSeries(column);
      var goal = goalLineFromColumn(column);
      return {
        column: column,
        area: cum,
        line: goal,
        labels: labels
      };
    }

    return {
      week: pack(weekColumn, weekLabels),
      month: pack(monthColumn, monthLabels),
      year: pack(yearColumn, yearLabels),
      all: pack(allColumn, allLabels)
    };
  }

  function countSignupsPerWeek(members, weekStartMonday) {
    var start = weekStartMonday.getTime();
    var end = addDays(weekStartMonday, 7).getTime();
    var c = 0;
    for (var i = 0; i < members.length; i++) {
      var ms = members[i].createdMs;
      if (ms >= start && ms < end) c++;
    }
    return c;
  }

  function buildWeeklySignupSeries(members) {
    var now = new Date();
    var thisWeekStart = startOfWeekMonday(now);
    var seriesRecent = [];
    var seriesPrior = [];
    for (var i = 5; i >= 0; i--) {
      var ws = addDays(thisWeekStart, -7 * i);
      seriesRecent.push(countSignupsPerWeek(members, ws));
    }
    for (var j = 5; j >= 0; j--) {
      var ws2 = addDays(thisWeekStart, -7 * (j + 6));
      seriesPrior.push(countSignupsPerWeek(members, ws2));
    }
    return { recent: seriesRecent, prior: seriesPrior };
  }

  function thisAndLastWeekSignups(members) {
    var now = new Date();
    var thisWeekStart = startOfWeekMonday(now);
    var lastWeekStart = addDays(thisWeekStart, -7);
    return {
      thisWeek: countSignupsPerWeek(members, thisWeekStart),
      lastWeek: countSignupsPerWeek(members, lastWeekStart)
    };
  }

  function applyMarketChart(members) {
    var chart = window.boostDashboardMarketChart;
    if (!chart || !chart.updateSeries) return;
    var w = buildWeeklySignupSeries(members);
    chart.updateSeries([
      { name: "이번 주", data: w.recent },
      { name: "지난 주", data: w.prior }
    ]);
    var hl = thisAndLastWeekSignups(members);
    var elThis = document.getElementById("dashboardStudentSeriesThis");
    var elLast = document.getElementById("dashboardStudentSeriesLast");
    if (elThis) elThis.textContent = String(hl.thisWeek);
    if (elLast) elLast.textContent = String(hl.lastWeek);
  }

  function applyRevenueChart(mode, payload) {
    var chart = window.boostDashboardRevenueChart;
    if (!chart || !chart.updateSeries) return;
    var p = payload[mode] || payload.week;
    chart.updateOptions({
      xaxis: { categories: p.labels }
    });
    chart.updateSeries([
      { name: "월별 매출", type: "column", data: p.column },
      { name: "누적 매출", type: "area", data: p.area },
      { name: "목표 대비", type: "line", data: p.line }
    ]);
  }

  function bindRevenueTabs(payload) {
    if (typeof jQuery === "undefined") return;
    jQuery(".mix-chart-tab .nav-link").off("click.boostLive");
    jQuery(".mix-chart-tab .nav-link").on("click.boostLive", function () {
      var seriesType = jQuery(this).attr("data-series");
      if (!seriesType || !payload[seriesType]) return;
      setTimeout(function () {
        applyRevenueChart(seriesType, payload);
      }, 0);
    });
  }

  function renderRecentMembers(membersSorted, totalCount) {
    var container = document.getElementById("RecentActivityContent");
    var totalEl = document.getElementById("dashboardRecentTotalMembers");
    if (totalEl) totalEl.textContent = String(totalCount);
    if (!container) return;
    var parts = [];
    for (var i = 0; i < membersSorted.length && i < RECENT_MEMBER_LIMIT; i++) {
      var m = membersSorted[i];
      var num = i + 1;
      var name = m.displayName || m.email || "(이름 없음)";
      parts.push(
        '<div class="d-flex align-items-center py-2 border-bottom dashboard-recent-member-row">' +
          '<span class="text-muted me-3 flex-shrink-0" style="min-width:1.5rem">' +
          num +
          "</span>" +
          '<div class="user-info flex-grow-1 min-w-0">' +
          '<h6 class="name mb-0 text-truncate">' +
          escapeHtml(name) +
          "</h6>" +
          '<span class="fs-12 text-muted">' +
          escapeHtml(m.joinDateStr) +
          "</span>" +
          "</div>" +
          '<span class="badge bg-light text-dark border flex-shrink-0 ms-2">' +
          escapeHtml(m.typeLabel) +
          "</span>" +
          "</div>"
      );
    }
    if (parts.length === 0) {
      container.innerHTML =
        '<p class="text-muted text-center py-4 mb-0">가입한 회원이 없습니다.</p>';
      return;
    }
    container.innerHTML = parts.join("");
  }

  function run() {
    if (typeof firebase === "undefined") return;
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    var db = firebase.firestore();

    Promise.all([
      db.collection(MEMBER_COLLECTION).get(),
      db.collection("courses").get(),
      db.collection("ebooks").get()
    ])
      .then(function (results) {
        var memberSnap = results[0];
        var courseSnap = results[1];
        var ebookSnap = results[2];

        var coach = 0;
        var free = 0;
        var paid = 0;
        var total = memberSnap.size;

        var memberRows = [];
        memberSnap.forEach(function (doc) {
          var data = doc.data();
          var mt = data.memberType;
          if (isCoachType(mt)) coach++;
          else if (isPaidMemberType(mt)) paid++;
          else if (isFreeMemberType(mt)) free++;

          var cms = getMillisFromField(data.createdAt);
          memberRows.push({
            id: doc.id,
            displayName: data.displayName,
            email: data.email,
            memberType: mt,
            typeLabel: memberTypeLabel(mt),
            createdMs: cms,
            createdAt: data.createdAt,
            joinDateStr: formatJoinDate(data.createdAt)
          });
        });

        memberRows.sort(function (a, b) {
          return b.createdMs - a.createdMs;
        });

        var elCoach = document.getElementById("dashboardStatCoach");
        var elFree = document.getElementById("dashboardStatFree");
        var elPaid = document.getElementById("dashboardStatPaid");
        var elTotal = document.getElementById("dashboardStatTotal");
        if (elCoach) elCoach.textContent = String(coach);
        if (elFree) elFree.textContent = String(free);
        if (elPaid) elPaid.textContent = String(paid);
        if (elTotal) elTotal.textContent = String(total);

        renderRecentMembers(memberRows, total);

        var revenueDocs = filterDocsForRevenue(
          courseSnap.docs,
          ebookSnap.docs,
          memberRows
        );
        var revenuePayload = buildRevenuePayload(
          revenueDocs.courses,
          revenueDocs.ebooks
        );
        applyChartsWhenReady(memberRows, revenuePayload);
      })
      .catch(function (err) {
        console.error("[dashboard-live-data]", err);
        var container = document.getElementById("RecentActivityContent");
        if (container) {
          container.innerHTML =
            '<p class="text-danger small mb-0">데이터를 불러오지 못했습니다. 콘솔을 확인해 주세요.</p>';
        }
      });
  }

  function applyChartsWhenReady(memberRows, revenuePayload) {
    function tryApply() {
      if (
        window.boostDashboardMarketChart &&
        window.boostDashboardRevenueChart
      ) {
        applyMarketChart(memberRows);
        applyRevenueChart("week", revenuePayload);
        bindRevenueTabs(revenuePayload);
        return true;
      }
      return false;
    }
    if (tryApply()) return;
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (tryApply() || tries >= CHART_READY_MAX_TRIES) {
        clearInterval(iv);
        if (tries >= CHART_READY_MAX_TRIES && !window.boostDashboardMarketChart) {
          console.warn(
            "[dashboard-live-data] Apex 차트가 아직 없습니다. dashboard-1.js 로드·지연을 확인하세요."
          );
        }
      }
    }, CHART_READY_POLL_MS);
  }

  function schedule() {
    run();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule);
  } else {
    schedule();
  }
})();
