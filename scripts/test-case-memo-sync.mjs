/**
 * 사건 메모 ↔ 사건메모 게시판 연동 검증
 * node scripts/test-case-memo-sync.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return {};
  const env = {};
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = { ...process.env, ...loadEnvLocal() };
const LAWYGO = env.LAWYGO_TEST_URL ?? "http://localhost:3000";
const errors = [];

function check(name, ok, msg) {
  if (ok) console.log(`OK: ${name}`);
  else errors.push(msg || name);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

// 정적 코드 점검
check("caseMemoBoardSync", read("src/lib/caseMemoBoardSync.ts").includes("CASE_MEMO_BOARD_SLUG"));
check("caseMemoClient sync", read("src/lib/caseMemoClient.ts").includes("syncCaseMemosChange"));
check("case-memos API", read("src/app/api/case-memos/route.ts").includes("CASE_MEMO_BOARD_SLUG"));
check("useSyncedCaseMemos", read("src/hooks/useSyncedCaseMemos.ts").includes("loadAndCacheCaseMemos"));
check("boardService caseId filter", read("src/lib/boardService.ts").includes("options.caseId"));
check("CaseMemoTab async save", read("src/components/cases/CaseMemoTab.tsx").includes("await onMemosChange"));

async function loginForTests() {
  const res = await fetch(`${LAWYGO}/api/auth/demo`, { method: "POST" });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || `demo login failed ${res.status}`);
  }
  return cookie;
}

async function main() {
  console.log(`LawyGo: ${LAWYGO}\n`);

  let authCookie = "";
  try {
    authCookie = await loginForTests();
    check("데모 로그인", !!authCookie);
  } catch (e) {
    check("데모 로그인", false, e instanceof Error ? e.message : String(e));
  }

  if (authCookie) {
    const headers = { Cookie: authCookie, "Content-Type": "application/json" };
    const boardListRes = await fetch(`${LAWYGO}/api/board`, { headers: { Cookie: authCookie } });
    const boardListJson = await boardListRes.json().catch(() => ({}));
    const nativeReady = boardListJson.nativeBoard === true;

    if (!nativeReady) {
      console.log("SKIP: 네이티브 게시판 DB 미준비 — API 연동 테스트 생략");
    } else {
      const testCaseId = `test-memo-sync-${Date.now()}`;
      let memoId = null;

      try {
      const createRes = await fetch(`${LAWYGO}/api/case-memos`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          caseId: testCaseId,
          caseNumber: "2026테스트1",
          content: "연동 테스트 메모",
          date: new Date().toISOString(),
          authorName: "테스트",
        }),
      });
      const createJson = await createRes.json();
      check("POST /api/case-memos", createRes.ok && createJson.success && createJson.data?.id);
      memoId = createJson.data?.id ?? null;

      const listRes = await fetch(`${LAWYGO}/api/case-memos?caseId=${encodeURIComponent(testCaseId)}`, {
        headers: { Cookie: authCookie },
      });
      const listJson = await listRes.json();
      check(
        "GET /api/case-memos",
        listRes.ok && listJson.success && listJson.data?.some((m) => m.content === "연동 테스트 메모")
      );

      const boardRes = await fetch(`${LAWYGO}/api/board/case_memo?per_page=50`, {
        headers: { Cookie: authCookie },
      });
      const boardJson = await boardRes.json();
      check(
        "게시판 case_memo 목록",
        boardRes.ok && boardJson.success && boardJson.data?.some((p) => p.content === "연동 테스트 메모")
      );

      if (memoId) {
        const patchRes = await fetch(`${LAWYGO}/api/case-memos`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            id: memoId,
            content: "연동 테스트 메모 (수정)",
            caseNumber: "2026테스트1",
          }),
        });
        const patchJson = await patchRes.json();
        check("PATCH /api/case-memos", patchRes.ok && patchJson.success);

        const delRes = await fetch(`${LAWYGO}/api/case-memos?id=${encodeURIComponent(memoId)}`, {
          method: "DELETE",
          headers: { Cookie: authCookie },
        });
        const delJson = await delRes.json();
        check("DELETE /api/case-memos", delRes.ok && delJson.success);
      }
      } catch (e) {
        check("API 연동 테스트", false, e instanceof Error ? e.message : String(e));
      }
    }
  }

  if (errors.length) {
    console.error("\nFAIL:");
    errors.forEach((e) => console.error(" -", e));
    process.exit(1);
  }

  console.log("\n모든 점검 통과");
}

main();
