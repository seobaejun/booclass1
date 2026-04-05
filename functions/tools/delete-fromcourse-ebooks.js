/**
 * ebooks 컬렉션에서 fromCourseBundle === true 인 문서만 삭제.
 * (강의 등록에서 잘못 ebooks 에 넣었던 판매 카드 잔여분 정리)
 *
 * 인증 (둘 중 하나):
 *   - GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
 *   - 또는 gcloud auth application-default login 후 이 스크립트 실행
 *
 * 사용 (boostclass/functions 디렉터리에서):
 *   node tools/delete-fromcourse-ebooks.js --dry-run
 *   node tools/delete-fromcourse-ebooks.js --execute
 */

const { initializeApp, applicationDefault, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "boostclass-7d4fd";

function parseArgs() {
  const argv = process.argv.slice(2);
  return {
    dryRun: argv.includes("--dry-run"),
    execute: argv.includes("--execute"),
  };
}

function initAdmin() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json && json.trim()) {
    const sa = JSON.parse(json);
    initializeApp({ credential: cert(sa), projectId: PROJECT_ID });
    return;
  }
  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
}

async function main() {
  const { dryRun, execute } = parseArgs();
  if (!dryRun && !execute) {
    console.error("다음 중 하나를 지정하세요: --dry-run | --execute");
    process.exit(1);
  }
  if (dryRun && execute) {
    console.error("--dry-run 과 --execute 는 동시에 쓸 수 없습니다.");
    process.exit(1);
  }

  initAdmin();
  const db = getFirestore();

  const snap = await db.collection("ebooks").where("fromCourseBundle", "==", true).get();

  if (snap.empty) {
    console.log("삭제 대상 없음 (fromCourseBundle === true 인 ebooks 문서 0건)");
    return;
  }

  console.log("대상 건수:", snap.size);
  snap.docs.forEach((d) => {
    const t = (d.data() && d.data().title) || "(제목 없음)";
    console.log(" -", d.id, "|", t);
  });

  if (dryRun) {
    console.log("\n[DRY-RUN] 실제 삭제는 하지 않았습니다. 삭제하려면 --execute");
    return;
  }

  const BATCH_LIMIT = 450;
  let batch = db.batch();
  let n = 0;
  let total = 0;

  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    n++;
    if (n >= BATCH_LIMIT) {
      await batch.commit();
      total += n;
      batch = db.batch();
      n = 0;
    }
  }
  if (n > 0) {
    await batch.commit();
    total += n;
  }
  console.log("\n삭제 완료:", total, "건");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
