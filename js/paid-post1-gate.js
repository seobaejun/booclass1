/**
 * 유료 게시판「번호 1」글 열람: 회원 유형과 무관하게 비밀번호 필요.
 * 클라이언트 검증만 제공하므로 공개 정보보호용이며, 민감한 경우 서버/규칙 보강 권장.
 */
(function (global) {
  var PAID_POST1_SESSION_KEY = 'boostclass_paid_post1_unlocked_v1';
  var PAID_POST1_PASSWORD = '@zxcv7979';

  function isUnlocked() {
    try {
      return sessionStorage.getItem(PAID_POST1_SESSION_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function unlock() {
    try {
      sessionStorage.setItem(PAID_POST1_SESSION_KEY, '1');
    } catch (e) {}
  }

  function verifyPassword(rawInput) {
    if (rawInput == null) return false;
    return String(rawInput) === PAID_POST1_PASSWORD;
  }

  /**
   * DOM에 #paid-post1-gate 가 있을 때 오버레이 표시 후 성공 시 onUnlock 호출
   */
  function showGate(onUnlock) {
    var gate = document.getElementById('paid-post1-gate');
    var detailCard = document.getElementById('board-detail');
    var input = document.getElementById('paid-post1-input');
    var errEl = document.getElementById('paid-post1-error');
    var btn = document.getElementById('paid-post1-submit');

    if (!gate || typeof onUnlock !== 'function') {
      onUnlock();
      return;
    }

    gate.classList.remove('d-none');
    gate.setAttribute('aria-hidden', 'false');
    if (detailCard) detailCard.setAttribute('aria-hidden', 'true');

    function clearError() {
      if (errEl) {
        errEl.textContent = '';
        errEl.classList.add('d-none');
      }
    }

    function submit() {
      clearError();
      if (!input) return;
      if (verifyPassword(input.value)) {
        unlock();
        gate.classList.add('d-none');
        gate.setAttribute('aria-hidden', 'true');
        if (detailCard) detailCard.setAttribute('aria-hidden', 'false');
        onUnlock();
      } else if (errEl) {
        errEl.textContent = '비밀번호가 올바르지 않습니다.';
        errEl.classList.remove('d-none');
      }
    }

    if (btn) btn.onclick = submit;
    if (input) {
      input.onkeydown = function (e) {
        if (e.key === 'Enter') submit();
      };
      input.focus();
    }
  }

  global.PaidPost1Gate = {
    isUnlocked: isUnlocked,
    unlock: unlock,
    verifyPassword: verifyPassword,
    showGate: showGate
  };
})(typeof window !== 'undefined' ? window : this);
