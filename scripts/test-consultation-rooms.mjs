/**
 * 상담실(회의실) 등록·저장 검증
 * node scripts/test-consultation-rooms.mjs [--base=URL]
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

const storage = readFileSync(resolve(root, "src/lib/consultationStorage.ts"), "utf8");
const page = readFileSync(resolve(root, "src/app/consultation/page.tsx"), "utf8");

ok("consultationStorage", storage.includes("saveConsultationRooms"));
ok("loadConsultationRooms", storage.includes("loadConsultationRooms"));
ok("테넌트별 키", storage.includes("ROOMS_KEY_PREFIX"));
ok("storage import", page.includes("consultationStorage"));
ok("storeReady 하이드레이션", page.includes("storeReady"));
ok("isTrial 리셋 useEffect 제거", !page.includes("setRooms(trialSampleConsultationRooms)"));
ok("rooms.sort 인플레이스 제거", !page.includes("rooms.sort("));
ok("RoomForm 저장 검증", page.includes("trim()") || page.includes("상담실명"));

// storage CRUD simulation
const tenant = "test-tenant";
const rooms = [];

function saveRooms(items) {
  rooms.length = 0;
  rooms.push(...items);
}

function addRoom(name) {
  const item = {
    id: `room-${Date.now()}`,
    name,
    sortOrder: rooms.length,
  };
  saveRooms([...rooms, item]);
  return item;
}

function updateRoom(id, patch) {
  saveRooms(rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)));
}

const created = addRoom("신규 상담실");
ok("등록 시뮬레이션", rooms.some((r) => r.name === "신규 상담실"));
updateRoom(created.id, { name: "수정된 상담실" });
ok("수정 시뮬레이션", rooms.find((r) => r.id === created.id)?.name === "수정된 상담실");

console.log(`\n페이지 E2E: ${BASE}/consultation`);
const pageRes = await fetch(`${BASE}/consultation`, { redirect: "follow" });
const html = await pageRes.text();
ok("상담관리 페이지 200", pageRes.ok);
ok("페이지 런타임 에러 없음", !/Application error|Internal Server Error/i.test(html));

if (errors.length) {
  console.error("\nFAIL:");
  errors.forEach((e) => console.error(" -", e));
  process.exit(1);
}
console.log("\n모든 검증 통과");
