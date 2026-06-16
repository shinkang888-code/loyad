/**
 * 메신저 사전 발송 양식 UI·스토리지 검증
 * node scripts/test-messenger-templates-ui.mjs [--base=URL]
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");
const BASE = (
  process.argv.find((a) => a.startsWith("--base="))?.split("=")[1] ||
  process.env.BASE_URL ||
  "https://lawygo.vercel.app"
).replace(/\/$/, "");

const errors = [];
function ok(name, cond, msg) {
  if (cond) console.log(`OK: ${name}`);
  else errors.push(msg || name);
}

const storage = readFileSync(resolve(root, "src/lib/messengerTemplates.ts"), "utf8");
const panel = readFileSync(resolve(root, "src/components/messenger/MessengerTemplatePanel.tsx"), "utf8");
const popup = readFileSync(resolve(root, "src/components/messenger/MessengerTemplateEditorPopup.tsx"), "utf8");
const page = readFileSync(resolve(root, "src/app/messenger/page.tsx"), "utf8");

ok("softDeleteTemplate", storage.includes("softDeleteTemplate"));
ok("updateTemplate", storage.includes("updateTemplate"));
ok("deletedAt 필드", storage.includes("deletedAt"));
ok("MessengerTemplatePanel", page.includes("MessengerTemplatePanel"));
ok("등록 버튼", panel.includes("등록"));
ok("수정 버튼", panel.includes("수정"));
ok("삭제 버튼", panel.includes("삭제"));
ok("페이지네이션", panel.includes("CasesListPagination") && panel.includes("PAGE_SIZE"));
ok("목록 스크롤", panel.includes("overflow-y-auto"));
ok("팝업 수정·저장", popup.includes("수정") && popup.includes("저장"));
ok("상세 팝업 모드", popup.includes('"detail"') && panel.includes("openDetail"));

console.log(`\n페이지 E2E: ${BASE}/messenger`);
const pageRes = await fetch(`${BASE}/messenger`, { redirect: "follow" });
const html = await pageRes.text();
ok("메신저 페이지 200", pageRes.ok);
ok("페이지 런타임 에러 없음", !/Application error|Internal Server Error/i.test(html));

if (errors.length) {
  console.error("\nFAIL:");
  errors.forEach((e) => console.error(" -", e));
  process.exit(1);
}
console.log("\n모든 검증 통과");
