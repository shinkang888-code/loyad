/**
 * 확장 플랫폼 API 스모크 테스트
 */
const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

async function main() {
  let pass = 0;
  let fail = 0;

  const res = await fetch(`${BASE}/api/extensions`);
  if (res.status === 200) {
    const data = await res.json();
    if (Array.isArray(data.catalog) && data.catalog.length >= 4) {
      console.log("PASS extensions catalog", data.catalog.length);
      pass++;
    } else {
      console.log("FAIL extensions catalog empty");
      fail++;
    }
  } else {
    console.log("FAIL extensions status", res.status);
    fail++;
  }

  const studio = await fetch(`${BASE}/board/studio/ai_image_gen`, { redirect: "follow" });
  if (studio.status === 200) {
    console.log("PASS studio page");
    pass++;
  } else {
    console.log("FAIL studio page", studio.status);
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
