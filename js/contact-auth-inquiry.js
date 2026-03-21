/**
 * Contact Us(#contact) 폼: 로그인한 회원만 Firestore inquiries로 전송
 * submit-form.js에서 window.boostContactSubmit 을 호출합니다.
 */
(function () {
  function getField(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el && el.value != null ? String(el.value).trim() : "";
  }

  function getSelectText(form, name) {
    var el = form.querySelector('select[name="' + name + '"]');
    if (!el || el.selectedIndex < 0) return "";
    var t = el.options[el.selectedIndex].text || "";
    return String(t).trim();
  }

  function setSubmitLoading(form, loading) {
    var btn = form.querySelector(".submit_appointment");
    if (!btn) return;
    var span = btn.querySelector("span");
    if (loading) {
      btn.disabled = true;
      if (span) span.textContent = "전송 중…";
    } else {
      btn.disabled = false;
      if (span) span.textContent = "등록하기";
    }
  }

  function updateLoginHint() {
    var hint = document.getElementById("contactLoginHint");
    if (!hint || typeof firebase === "undefined" || !firebase.auth) return;
    firebase.auth().onAuthStateChanged(function (user) {
      if (user) {
        hint.classList.add("d-none");
      } else {
        hint.classList.remove("d-none");
      }
    });
  }

  window.boostContactSubmit = function (formEl) {
    if (typeof firebase === "undefined" || !firebase.apps || !firebase.apps.length) {
      window.alert("문의 시스템을 불러올 수 없습니다. 페이지를 새로고침 후 다시 시도해 주세요.");
      return;
    }
    if (typeof BoostInquiry === "undefined" || !BoostInquiry.createInquiry) {
      window.alert("문의 모듈을 불러올 수 없습니다. 페이지를 새로고침 후 다시 시도해 주세요.");
      return;
    }
    var user = firebase.auth().currentUser;
    if (!user) {
      window.alert("로그인 후 문의하실 수 있습니다.\n로그인 페이지로 이동합니다.");
      var next = window.location.pathname + window.location.search + (window.location.hash || "");
      window.location.href = "login.html?next=" + encodeURIComponent(next || "index.html");
      return;
    }
    if (!formEl.checkValidity()) {
      formEl.classList.add("was-validated");
      return;
    }
    var name = getField(formEl, "name");
    var email = getField(formEl, "email");
    var phone = getField(formEl, "phone");
    var message = getField(formEl, "message");
    if (!message) {
      window.alert("메시지를 입력해 주세요.");
      return;
    }
    var bootLabel = getSelectText(formEl, "bootcamp");
    var locLabel = getSelectText(formEl, "location");
    var meta = [];
    if (bootLabel && bootLabel.indexOf("선택") === -1) meta.push("프로그램: " + bootLabel);
    if (locLabel && locLabel.indexOf("선택") === -1) meta.push("장소: " + locLabel);
    var subject = meta.length ? meta.join(" · ") : "Contact Us 문의";
    var fullMessage =
      (meta.length ? "[" + meta.join(" | ") + "]\n\n" : "") + message;

    setSubmitLoading(formEl, true);
    BoostInquiry.createInquiry(user.uid, {
      subject: subject,
      message: fullMessage,
      userEmail: email || user.email || "",
      userName: name || user.displayName || "",
      userPhone: phone
    })
      .then(function () {
        formEl.reset();
        formEl.classList.remove("was-validated");
        window.alert("문의가 접수되었습니다. 답변은 마이페이지에서 확인하실 수 있습니다.");
      })
      .catch(function () {
        window.alert("전송에 실패했습니다. 네트워크와 로그인 상태를 확인해 주세요.");
      })
      .finally(function () {
        setSubmitLoading(formEl, false);
      });
  };

  function injectHint() {
    var section = document.getElementById("contact");
    if (!section) return;
    var wrap = section.querySelector(".text-center.mb-5");
    if (!wrap || document.getElementById("contactLoginHint")) return;
    var p = document.createElement("p");
    p.id = "contactLoginHint";
    p.className = "text-warning small mb-0 d-none";
    p.textContent = "문의를 남기려면 로그인이 필요합니다.";
    wrap.appendChild(p);
    updateLoginHint();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectHint);
  } else {
    injectHint();
  }
})();
