/**
 * 어떤 페이지 URL에 ref / referral / r 이 있으면 sessionStorage에 저장.
 * register.html 의 readPendingReferral() 과 동일 키·형식 — 이후 회원가입 시 복원.
 */
(function () {
  var KEY = "boostclass_pending_referral_v1";
  try {
    var params = new URLSearchParams(window.location.search);
    var code = params.get("ref") || params.get("referral") || params.get("r");
    if (!code) return;
    var trimmed = decodeURIComponent(String(code).replace(/\+/g, " ")).trim();
    if (!trimmed) return;
    sessionStorage.setItem(KEY, JSON.stringify({ code: trimmed, fromUrl: true }));
  } catch (e) {}
})();
