/**
 * 관리자 수강생 목록: Firestore member, 검색·정렬·페이징·등록·저장·삭제.
 * 수강생 등록은 보조 Firebase 앱으로 Auth 계정을 만들어 관리자 세션이 끊기지 않게 함.
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

  var SECONDARY_AUTH_APP_NAME = "AdminMemberCreate";

  var ROWS_PER_PAGE = 20;
  var TABLE_COLSPAN = 7;

  var MEMBER_TYPE_UNSET = "";
  var MEMBER_TYPE_OPTIONS = [
    { value: MEMBER_TYPE_UNSET, label: "미지정" },
    { value: "유료회원", label: "유료회원" },
    { value: "무료회원", label: "무료회원" },
    { value: "강사", label: "강사" },
    { value: "코치", label: "코치" },
    { value: "관리자", label: "관리자" }
  ];

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

  function normPhone(s) {
    return String(s || "").replace(/[-\s]/g, "").toLowerCase();
  }

  function buildTypeSelect(current) {
    var cur = current == null ? "" : String(current);
    var parts = [];
    for (var i = 0; i < MEMBER_TYPE_OPTIONS.length; i++) {
      var o = MEMBER_TYPE_OPTIONS[i];
      var sel = o.value === cur ? " selected" : "";
      parts.push(
        '<option value="' +
          escapeHtml(o.value) +
          '"' +
          sel +
          ">" +
          escapeHtml(o.label) +
          "</option>"
      );
    }
    return (
      '<select class="form-select form-select-sm member-type-select boostclass-native-select" aria-label="멤버타입">' +
      parts.join("") +
      "</select>"
    );
  }

  function fillModalMemberTypeSelect(selectEl) {
    if (!selectEl) return;
    var html = [];
    for (var i = 0; i < MEMBER_TYPE_OPTIONS.length; i++) {
      var o = MEMBER_TYPE_OPTIONS[i];
      html.push(
        '<option value="' +
          escapeHtml(o.value) +
          '">' +
          escapeHtml(o.label) +
          "</option>"
      );
    }
    selectEl.innerHTML = html.join("");
  }

  function getSecondaryAuth() {
    try {
      return firebase.app(SECONDARY_AUTH_APP_NAME).auth();
    } catch (e) {
      return firebase.initializeApp(firebaseConfig, SECONDARY_AUTH_APP_NAME).auth();
    }
  }

  function authRegisterErrorMessage(code) {
    var map = {
      "auth/email-already-in-use": "이미 사용 중인 이메일입니다.",
      "auth/invalid-email": "올바른 이메일이 아닙니다.",
      "auth/weak-password": "비밀번호는 6자 이상이어야 합니다.",
      "auth/operation-not-allowed": "이메일 가입이 비활성화되어 있습니다."
    };
    return map[code] || code || "등록 중 오류가 발생했습니다.";
  }

  function sortEntries(entries, sortKey) {
    var copy = entries.slice();
    var cmpName = function (a, b) {
      var na = (a.data.displayName || "").localeCompare(
        b.data.displayName || "",
        "ko"
      );
      return na;
    };
    var cmpEmail = function (a, b) {
      return (a.data.email || "").localeCompare(b.data.email || "", "ko");
    };
    var cmpPhone = function (a, b) {
      return normPhone(a.data.phone).localeCompare(normPhone(b.data.phone), "ko");
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
      case "phone_asc":
        copy.sort(cmpPhone);
        break;
      case "created_desc":
      default:
        copy.sort(cmpCreatedDesc);
    }
    return copy;
  }

  runWhenReady(function () {
    var tbody = document.getElementById("memberListTbody");
    var msgEl = document.getElementById("memberListMessage");
    var btnPrev = document.getElementById("memberPagePrev");
    var btnNext = document.getElementById("memberPageNext");
    var pageInfoEl = document.getElementById("memberPageInfo");
    var searchInput = document.getElementById("memberSearchInput");
    var sortSelect = document.getElementById("memberSortSelect");
    var adminForm = document.getElementById("adminRegisterForm");
    var adminErr = document.getElementById("adminRegisterError");
    var btnAdminSubmit = document.getElementById("btnAdminRegisterSubmit");
    var modalMemberType = document.getElementById("adminRegisterMemberType");

    if (!tbody) return;

    fillModalMemberTypeSelect(modalMemberType);

    var memberDocsAll = [];
    var memberDocsSorted = [];
    var currentPage = 1;
    var searchQuery = "";
    var sortKey = "created_desc";

    function showError(text) {
      if (!msgEl) return;
      msgEl.textContent = text;
      msgEl.className = "alert alert-danger mb-3";
      msgEl.classList.remove("d-none");
    }

    function hideMessage() {
      if (msgEl) msgEl.classList.add("d-none");
    }

    function showAdminRegisterError(text) {
      if (!adminErr) return;
      adminErr.textContent = text;
      adminErr.classList.remove("d-none");
    }

    function hideAdminRegisterError() {
      if (adminErr) adminErr.classList.add("d-none");
    }

    function entryMatchesSearch(entry) {
      var q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      var d = entry.data;
      var name = (d.displayName || "").toLowerCase();
      var email = (d.email || "").toLowerCase();
      var phone = normPhone(d.phone);
      var qn = normPhone(q);
      return (
        name.indexOf(q) >= 0 ||
        email.indexOf(q) >= 0 ||
        (qn.length > 0 && phone.indexOf(qn) >= 0)
      );
    }

    function applyFilterAndSort() {
      var filtered = memberDocsAll.filter(entryMatchesSearch);
      memberDocsSorted = sortEntries(filtered, sortKey);
    }

    function getTotalPages() {
      var n = memberDocsSorted.length;
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
      var total = memberDocsSorted.length;
      var totalPages = getTotalPages();
      clampCurrentPage();
      pageInfoEl.textContent = currentPage + " / " + totalPages;
      btnPrev.disabled = currentPage <= 1 || total === 0;
      btnNext.disabled = currentPage >= totalPages || total === 0;
    }

    function renderMemberTable() {
      var total = memberDocsSorted.length;
      clampCurrentPage();

      if (total === 0) {
        var emptyMsg = memberDocsAll.length === 0
          ? "등록된 회원이 없습니다."
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
      var slice = memberDocsSorted.slice(start, start + ROWS_PER_PAGE);
      var rows = [];
      for (var i = 0; i < slice.length; i++) {
        var entry = slice[i];
        var uid = entry.id;
        var d = entry.data;
        var name = d.displayName || "";
        var email = d.email || "";
        var phone = d.phone || "";
        var mtype = d.memberType != null ? d.memberType : "";
        var seq = start + i + 1;
        rows.push(
          '<tr data-member-uid="' +
            escapeHtml(uid) +
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
            "<td>" +
            escapeHtml(phone) +
            "</td>" +
            "<td>" +
            buildTypeSelect(mtype) +
            "</td>" +
            "<td>" +
            escapeHtml(formatCreatedAt(d.createdAt)) +
            "</td>" +
            '<td class="text-end text-nowrap">' +
            '<button type="button" class="btn btn-sm btn-primary btn-save-member-type me-1">저장</button>' +
            '<button type="button" class="btn btn-sm btn-outline-danger btn-delete-member">삭제</button>' +
            "</td>" +
            "</tr>"
        );
      }
      tbody.innerHTML = rows.join("");
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

      db.collection("member")
        .get()
        .then(function (snap) {
          if (snap.empty) {
            memberDocsAll = [];
          } else {
            memberDocsAll = snap.docs.map(function (d) {
              return { id: d.id, data: d.data() };
            });
          }
          searchQuery = searchInput ? searchInput.value : "";
          sortKey = sortSelect ? sortSelect.value : "created_desc";
          applyFilterAndSort();
          currentPage = 1;
          renderMemberTable();
        })
        .catch(function (err) {
          console.error(err);
          memberDocsAll = [];
          memberDocsSorted = [];
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

    function saveMemberType(uid, memberType, btn) {
      btn.disabled = true;
      hideMessage();
      db.collection("member")
        .doc(uid)
        .update({
          memberType: memberType,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(function () {
          for (var i = 0; i < memberDocsAll.length; i++) {
            if (memberDocsAll[i].id === uid) {
              memberDocsAll[i].data.memberType = memberType;
              break;
            }
          }
          applyFilterAndSort();
          clampCurrentPage();
          renderMemberTable();
          btn.disabled = false;
        })
        .catch(function (err) {
          console.error(err);
          showError("저장 실패: " + (err.message || String(err)));
          btn.disabled = false;
        });
    }

    function deleteMember(uid, displayName, btn) {
      var label = displayName ? '"' + displayName + '"' : "해당 회원";
      if (
        !confirm(
          label +
            "의 회원 정보(Firestore)를 삭제할까요?\n\n※ 로그인 계정(Firebase Auth)은 자동으로 지워지지 않습니다."
        )
      ) {
        return;
      }
      btn.disabled = true;
      hideMessage();
      db.collection("member")
        .doc(uid)
        .delete()
        .then(function () {
          memberDocsAll = memberDocsAll.filter(function (e) {
            return e.id !== uid;
          });
          applyFilterAndSort();
          clampCurrentPage();
          renderMemberTable();
        })
        .catch(function (err) {
          console.error(err);
          showError("삭제 실패: " + (err.message || String(err)));
          btn.disabled = false;
        });
    }

    tbody.addEventListener("click", function (ev) {
      var saveBtn = ev.target.closest(".btn-save-member-type");
      if (saveBtn) {
        var tr = saveBtn.closest("tr[data-member-uid]");
        if (!tr) return;
        var uid = tr.getAttribute("data-member-uid");
        var sel = tr.querySelector(".member-type-select");
        if (!uid || !sel) return;
        saveMemberType(uid, sel.value, saveBtn);
        return;
      }

      var delBtn = ev.target.closest(".btn-delete-member");
      if (delBtn) {
        var tr2 = delBtn.closest("tr[data-member-uid]");
        if (!tr2) return;
        var uid2 = tr2.getAttribute("data-member-uid");
        if (!uid2) return;
        var nameCell = tr2.querySelector("td:nth-child(2)");
        var displayName = nameCell ? nameCell.textContent.trim() : "";
        deleteMember(uid2, displayName, delBtn);
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

    if (adminForm && btnAdminSubmit) {
      adminForm.addEventListener("submit", function (e) {
        e.preventDefault();
        hideAdminRegisterError();

        var nameEl = document.getElementById("adminRegisterDisplayName");
        var phoneEl = document.getElementById("adminRegisterPhone");
        var emailEl = document.getElementById("adminRegisterEmail");
        var pwEl = document.getElementById("adminRegisterPassword");
        var pw2El = document.getElementById("adminRegisterPasswordConfirm");
        var typeEl = document.getElementById("adminRegisterMemberType");

        var displayName = nameEl ? nameEl.value.trim() : "";
        var phone = phoneEl ? phoneEl.value.trim() : "";
        var email = emailEl ? emailEl.value.trim() : "";
        var password = pwEl ? pwEl.value : "";
        var password2 = pw2El ? pw2El.value : "";
        var memberType = typeEl ? typeEl.value : "";

        if (!displayName) {
          showAdminRegisterError("이름을 입력해 주세요.");
          return;
        }
        if (!phone) {
          showAdminRegisterError("전화번호를 입력해 주세요.");
          return;
        }
        if (!email || !password) {
          showAdminRegisterError("이메일과 비밀번호를 입력해 주세요.");
          return;
        }
        if (password.length < 6) {
          showAdminRegisterError("비밀번호는 6자 이상이어야 합니다.");
          return;
        }
        if (password !== password2) {
          showAdminRegisterError("비밀번호가 일치하지 않습니다.");
          return;
        }

        var secondaryAuth = getSecondaryAuth();
        btnAdminSubmit.disabled = true;
        btnAdminSubmit.textContent = "등록 중…";

        secondaryAuth
          .createUserWithEmailAndPassword(email, password)
          .then(function (cred) {
            return cred.user
              .updateProfile({ displayName: displayName })
              .then(function () {
                return cred.user;
              });
          })
          .then(function (user) {
            return db
              .collection("member")
              .doc(user.uid)
              .set({
                email: email,
                displayName: displayName,
                phone: phone,
                memberType: memberType || "",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
              })
              .then(function () {
                return user.uid;
              });
          })
          .then(function () {
            secondaryAuth.signOut();
            adminForm.reset();
            hideAdminRegisterError();
            var modalEl = document.getElementById("exampleModal");
            if (modalEl && typeof bootstrap !== "undefined" && bootstrap.Modal) {
              var ModalCtor = bootstrap.Modal;
              if (typeof ModalCtor.getOrCreateInstance === "function") {
                ModalCtor.getOrCreateInstance(modalEl).hide();
              } else {
                var inst = ModalCtor.getInstance(modalEl);
                if (inst) inst.hide();
              }
            }
            refreshListFromServer();
          })
          .catch(function (err) {
            console.error(err);
            var code = err && err.code ? err.code : "";
            if (code.indexOf("permission-denied") >= 0) {
              showAdminRegisterError(
                "Firestore 저장 권한이 없습니다. 보안 규칙을 확인해 주세요."
              );
            } else if (code.indexOf("auth/") === 0) {
              showAdminRegisterError(authRegisterErrorMessage(code));
            } else {
              showAdminRegisterError(err.message || String(err));
            }
          })
          .finally(function () {
            btnAdminSubmit.disabled = false;
            btnAdminSubmit.textContent = "등록";
          });
      });
    }

    refreshListFromServer();
  });
})();
