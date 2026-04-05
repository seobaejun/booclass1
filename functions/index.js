/**
 * Firestore 트리거 → 솔라피 SMS
 * 환경 변수(권장: Firebase Console → Functions → 환경 구성):
 *   SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER (발신번호 등록)
 *   ADMIN_SMS_PHONE (관리자 수신, 기본 01036736942)
 */
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { SolapiMessageService } = require("solapi");

initializeApp();
const db = getFirestore();

const NOTIFICATION_MAX = 100;

const COMPANY = "부스트클래스";
const DEFAULT_ADMIN_PHONE = "01036736942";

function cfg() {
  return {
    apiKey: process.env.SOLAPI_API_KEY || "",
    apiSecret: process.env.SOLAPI_API_SECRET || "",
    sender: (process.env.SOLAPI_SENDER || "").replace(/\D/g, ""),
    adminPhone: (process.env.ADMIN_SMS_PHONE || DEFAULT_ADMIN_PHONE).replace(/\D/g, "")
  };
}

function normalizePhone(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("010")) return d;
  if (d.length === 10 && d.startsWith("10")) return "0" + d;
  if (d.length >= 10 && d.length <= 11) return d;
  return "";
}

function userSmsText(title, body) {
  const b = body ? String(body).trim() : "";
  const line = b ? `${title} ${b}` : title;
  const full = `[${COMPANY}] ${line}`;
  return full.length > 2000 ? full.slice(0, 1997) + "…" : full;
}

function adminSmsText(kind, detail) {
  const full = `[${COMPANY}] [관리자] ${kind}${detail ? " " + detail : ""}`;
  return full.length > 2000 ? full.slice(0, 1997) + "…" : full;
}

async function sendSms(toDigits, text) {
  const c = cfg();
  if (!c.apiKey || !c.apiSecret || !c.sender) {
    logger.warn("solapi: skip (missing SOLAPI_API_KEY / SECRET / SENDER)");
    return;
  }
  const to = normalizePhone(toDigits);
  if (!to) {
    logger.warn("solapi: skip (invalid to)");
    return;
  }
  const svc = new SolapiMessageService(c.apiKey, c.apiSecret);
  try {
    await svc.messageService.sendOne({
      to,
      from: c.sender,
      text
    });
  } catch (e) {
    logger.error("solapi send error", e && e.message ? e.message : e);
  }
}

function isPaidMemberType(t) {
  return String(t || "").trim() === "유료회원";
}

/**
 * 관리자 브라우저는 다른 회원 member 문서에 쓰기 권한이 없을 수 있음 → Admin SDK로만 기록
 */
async function pushInquiryReplyNotification(uid, bodyText) {
  if (!uid || !bodyText) return;
  try {
    const memberRef = db.collection("member").doc(uid);
    const snap = await memberRef.get();
    const data = snap.exists ? snap.data() : {};
    const arr = Array.isArray(data.notificationItems) ? data.notificationItems.slice() : [];
    const id = "n_" + Date.now() + "_" + Math.random().toString(36).slice(2, 12);
    arr.unshift({
      id,
      type: "inquiry_reply",
      title: "1:1 문의에 답변이 등록되었습니다",
      body: bodyText,
      createdAt: Timestamp.now()
    });
    await memberRef.set(
      { notificationItems: arr.slice(0, NOTIFICATION_MAX) },
      { merge: true }
    );
  } catch (e) {
    logger.error("pushInquiryReplyNotification", e);
  }
}

function memberTypeLabel(t) {
  const s = String(t || "").trim();
  return s || "미지정";
}

const region = "asia-northeast3";

exports.onMemberCreate = onDocumentCreated(
  { document: "member/{uid}", region },
  async (event) => {
    const data = event.data && event.data.data();
    if (!data) return;
    const phone = data.phone || "";
    const name = data.displayName || "";
    const email = data.email || "";

    await sendSms(
      phone,
      userSmsText("회원가입을 환영합니다", "부스트클래스 가입이 완료되었습니다.")
    );

    await sendSms(
      cfg().adminPhone,
      adminSmsText("신규 회원가입", `${name || "(이름없음)"} ${email ? email + " " : ""}${phone ? phone : ""}`.trim())
    );
  }
);

exports.onMemberUpdate = onDocumentUpdated(
  { document: "member/{uid}", region },
  async (event) => {
    const before = event.data.before.data() || {};
    const after = event.data.after.data() || {};
    const prev = memberTypeLabel(before.memberType);
    const next = memberTypeLabel(after.memberType);
    const phone = after.phone || before.phone || "";

    if (prev !== next) {
      await sendSms(
        phone,
        userSmsText("회원 등급이 변경되었습니다", `${prev} → ${next}`)
      );
    }

    const wasPaid = isPaidMemberType(before.memberType);
    const nowPaid = isPaidMemberType(after.memberType);
    if (!wasPaid && nowPaid) {
      const detail = `${after.displayName || ""} ${after.email || ""}`.trim();
      await sendSms(cfg().adminPhone, adminSmsText("유료회원 전환", detail));
    }
  }
);

exports.onInquiryCreate = onDocumentCreated(
  { document: "inquiries/{id}", region },
  async (event) => {
    const d = event.data && event.data.data();
    if (!d) return;
    const uid = d.uid || "";
    const subject = d.subject ? String(d.subject).trim() : "";
    const userPhone = d.userPhone ? String(d.userPhone).trim() : "";

    let phone = normalizePhone(userPhone);
    if (!phone && uid) {
      try {
        const m = await db.collection("member").doc(uid).get();
        if (m.exists) {
          const md = m.data();
          phone = normalizePhone((md && md.phone) || "");
        }
      } catch (e) {
        logger.warn("member lookup for inquiry sms", e);
      }
    }

    await sendSms(
      phone,
      userSmsText("1:1 문의가 등록되었습니다", subject || "문의가 접수되었습니다.")
    );

    await sendSms(
      cfg().adminPhone,
      adminSmsText("1:1 문의 접수", subject || "(제목 없음)")
    );
  }
);

exports.onInquiryReply = onDocumentUpdated(
  { document: "inquiries/{id}", region },
  async (event) => {
    const before = event.data.before.data() || {};
    const after = event.data.after.data() || {};
    const prevReply = before.reply != null ? String(before.reply).trim() : "";
    const nextReply = after.reply != null ? String(after.reply).trim() : "";
    if (prevReply || !nextReply) return;

    const uid = after.uid || before.uid || "";
    const subject = (after.subject || before.subject || "").trim();
    var replyPreview = nextReply;
    if (replyPreview.length > 120) replyPreview = replyPreview.slice(0, 120) + "…";
    const body = subject
      ? "「" + subject + "」" + (replyPreview ? " — " + replyPreview : "")
      : replyPreview || "마이페이지 1:1 문의에서 전체 답변을 확인하세요.";

    let phone = normalizePhone(after.userPhone || before.userPhone || "");
    if (!phone && uid) {
      try {
        const m = await db.collection("member").doc(uid).get();
        if (m.exists) {
          const md = m.data();
          phone = normalizePhone((md && md.phone) || "");
        }
      } catch (e) {
        logger.warn("member lookup for reply sms", e);
      }
    }

    await pushInquiryReplyNotification(uid, body);
    await sendSms(phone, userSmsText("1:1 문의에 답변이 등록되었습니다", body));
  }
);
