/**
 * 확장 플랫폼 API 스모크 테스트 (Phase 6 + Phase 7)
 * 로컬: npm run test:extensions
 * 프로덕션: npm run test:extensions -- --remote
 */
const remote = process.argv.includes("--remote");
const BASE = (
  remote
    ? process.env.BASE_URL || "https://loyad.vercel.app"
    : process.env.TEST_BASE_URL || "http://localhost:3000"
).replace(/\/$/, "");

async function main() {
  let pass = 0;
  let fail = 0;

  const res = await fetch(`${BASE}/api/extensions`);
  if (res.status === 200) {
    const data = await res.json();
    if (Array.isArray(data.catalog) && data.catalog.length >= 8) {
      console.log("PASS extensions catalog", data.catalog.length);
      pass++;
    } else {
      console.log("FAIL extensions catalog empty or <8");
      fail++;
    }
  } else {
    console.log("FAIL extensions status", res.status);
    fail++;
  }

  const studioPages = [
    "ai_image_gen",
    "law_mcp",
    "dart_reports",
    "voice_studio",
    "marketing_harness",
  ];

  for (const id of studioPages) {
    const studio = await fetch(`${BASE}/board/studio/${id}`, { redirect: "follow" });
    if (studio.status === 200) {
      console.log(`PASS studio page ${id}`);
      pass++;
    } else {
      console.log(`FAIL studio page ${id}`, studio.status);
      fail++;
    }
  }

  const lawMcpGet = await fetch(`${BASE}/api/extensions/law-mcp`);
  if (lawMcpGet.status === 200) {
    const data = await lawMcpGet.json();
    if (Array.isArray(data.tools) && data.tools.length >= 5) {
      console.log("PASS law-mcp tools catalog");
      pass++;
    } else {
      console.log("FAIL law-mcp tools");
      fail++;
    }
  } else {
    console.log("FAIL law-mcp GET", lawMcpGet.status);
    fail++;
  }

  const dartGet = await fetch(`${BASE}/api/extensions/dart-reports`);
  if (dartGet.status === 200) {
    const data = await dartGet.json();
    if (Array.isArray(data.corpIndex) && data.corpIndex.length >= 5) {
      console.log("PASS dart-reports corp index");
      pass++;
    } else {
      console.log("FAIL dart-reports corp index");
      fail++;
    }
  } else {
    console.log("FAIL dart-reports GET", dartGet.status);
    fail++;
  }

  const admin = await fetch(`${BASE}/admin/extensions`, { redirect: "follow" });
  if (admin.status === 200) {
    console.log("PASS admin extensions page");
    pass++;
  } else {
    console.log("FAIL admin extensions", admin.status);
    fail++;
  }

  console.log(`\nExtensions: PASS ${pass} / FAIL ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
