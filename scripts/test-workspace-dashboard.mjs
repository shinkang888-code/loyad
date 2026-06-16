/**
 * AI 워크스페이스 대시보드 E2E
 * node scripts/test-workspace-dashboard.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const BASE = process.env.BASE_URL || "https://lawygo.vercel.app";

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

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
  console.log(`=== AI 워크스페이스 E2E (${BASE}) ===\n`);

  const explorer = read("src/components/drive/WorkspaceFileExplorer.tsx");
  if (/useEffect\(\(\) => \{\s*void loadFiles\(\)/.test(explorer)) {
    throw new Error("WorkspaceFileExplorer가 마운트 시 자동 loadFiles를 호출합니다");
  }
  if (!explorer.includes("loaded") || !explorer.includes("새로고침")) {
    throw new Error("WorkspaceFileExplorer 수동 로드 UI가 없습니다");
  }
  if (!read("src/lib/googleDriveClient.ts").includes("searchFilesUnderPath")) {
    throw new Error("Drive 이름 검색 API(searchFilesUnderPath) 없음");
  }
  if (!read("src/lib/driveCompanyFiles.ts").includes("listCaseFilesFromDb")) {
    throw new Error("사건 자료 DB 우선 조회 없음");
  }
  console.log("OK: 자료실 수동 로드 + 빠른 검색 경로");

  const cookie = await demoLogin();
  console.log("OK: 데모 로그인");

  const boardPage = await fetch(`${BASE}/board`, { headers: { Cookie: cookie } });
  if (boardPage.status !== 200) throw new Error(`/board 페이지 실패: ${boardPage.status}`);
  console.log("OK: /board 페이지 (200)");

  const boards = await fetch(`${BASE}/api/board`, { headers: { Cookie: cookie } });
  const boardsJson = await boards.json();
  if (!boards.ok) throw new Error(`게시판 API 실패: ${boardsJson.error}`);
  console.log(`OK: 게시판 API — ${(boardsJson.data ?? []).length}개`);

  const adminBoards = await fetch(`${BASE}/api/admin/boards`, { headers: { Cookie: cookie } });
  const adminJson = await adminBoards.json();
  if (adminBoards.ok) {
    const active = (adminJson.data ?? []).filter((b) => !b.deletedAt);
    console.log(`OK: 관리자 게시판 API — 활성 ${active.length}개`);
  } else {
    console.log("SKIP: 관리자 게시판 API (권한 없음)");
  }

  const drive = await fetch(`${BASE}/api/drive/company-files`, { headers: { Cookie: cookie } });
  const driveJson = await drive.json();
  if (!drive.ok) throw new Error(`자료실 API 실패: ${driveJson.error}`);
  console.log(`OK: 자료실 API — ${(driveJson.files ?? []).length}개 파일`);

  const reorder = await fetch(`${BASE}/api/admin/boards/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ orderedIds: [] }),
  });
  if (reorder.status === 400) {
    console.log("OK: reorder API 엔드포인트 존재");
  } else if (reorder.ok) {
    console.log("OK: reorder API");
  }

  console.log("\n=== AI 워크스페이스 E2E 통과 ===");
}

main().catch((e) => {
  console.error("\n❌ 검증 실패:", e.message || e);
  process.exit(1);
});
