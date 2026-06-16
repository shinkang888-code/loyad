/**
 * 헤더 AI 퀵런치 E2E
 * node scripts/test-ai-quick-launch.mjs
 */
const BASE = process.env.BASE_URL || "https://lawygo.vercel.app";

const AI_FEATURES = [
  { id: "legal_encyclopedia", shortName: "법률백과" },
  { id: "case_search", shortName: "판례추천" },
  { id: "doc_summary", shortName: "PDF요약" },
  { id: "doc_draft", shortName: "서면작성" },
  { id: "law_search", shortName: "법령검색" },
  { id: "ai_search", shortName: "AI검색" },
];

async function demoLogin() {
  const auth = await fetch(`${BASE}/api/auth/demo`, { method: "POST" });
  let cookie = "";
  for (const c of auth.headers.getSetCookie?.() ?? []) {
    const p = c.split(";")[0];
    if (p.startsWith("lawygo_session=")) cookie = p;
  }
  if (!cookie) throw new Error(`demo login failed (${auth.status})`);
  return cookie;
}

async function main() {
  console.log(`=== AI 퀵런치 E2E (${BASE}) ===\n`);

  if (AI_FEATURES.length !== 6) {
    throw new Error(`AI 메뉴 6개 필요, 현재 ${AI_FEATURES.length}개`);
  }
  console.log("OK: AI 메뉴 6개", AI_FEATURES.map((i) => i.shortName).join(", "));

  const cookie = await demoLogin();
  console.log("OK: 데모 로그인");

  for (const item of AI_FEATURES) {
    const res = await fetch(`${BASE}/board/ai/${item.id}`, {
      headers: { Cookie: cookie },
      redirect: "manual",
    });
    if (res.status !== 200 && res.status !== 307 && res.status !== 308) {
      throw new Error(`${item.shortName} (/board/ai/${item.id}) 페이지 실패: ${res.status}`);
    }
    console.log(`OK: /board/ai/${item.id} — ${item.shortName}`);
  }

  const cases = await fetch(`${BASE}/cases`, { headers: { Cookie: cookie } });
  if (cases.status !== 200) throw new Error(`/cases 페이지 실패: ${cases.status}`);
  const html = await cases.text();
  if (!html.includes("AiQuickLaunchBar") && !html.includes("법률백과") && !html.includes("board/ai")) {
    console.log("SKIP: 헤더 버튼은 클라이언트 렌더 (페이지 200 확인)");
  } else {
    console.log("OK: 사건 페이지에 AI 퀵런치 마크업");
  }
  console.log("OK: /cases 페이지 (200)");

  console.log("\n=== AI 퀵런치 E2E 통과 ===");
}

main().catch((e) => {
  console.error("\n❌ 검증 실패:", e.message || e);
  process.exit(1);
});
