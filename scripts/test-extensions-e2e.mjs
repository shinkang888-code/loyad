/**
 * 확장 플랫폼 기능별 E2E 검증 (Phase 6 + Phase 7)
 * 로컬: npm run test:extensions:e2e
 * 프로덕션: npm run test:extensions:e2e -- --remote
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const remote = process.argv.includes("--remote");
const BASE = (
  remote
    ? process.env.BASE_URL || "https://loyad.vercel.app"
    : process.env.TEST_BASE_URL || "http://localhost:3000"
).replace(/\/$/, "");

let cookie = "";
let pass = 0;
let fail = 0;
let skip = 0;

/** @type {{ feature: string; name: string; status: string; detail: string }[]} */
const results = [];

function record(feature, name, status, detail) {
  results.push({ feature, name, status, detail });
  if (status === "PASS") pass++;
  else if (status === "SKIP") skip++;
  else fail++;
  const icon = status === "PASS" ? "✓" : status === "SKIP" ? "○" : "✗";
  console.log(`${icon} [${feature}] ${name} — ${detail}`);
}

function parseCookie(res) {
  const set = res.headers.getSetCookie?.() ?? [];
  for (const c of set) {
    const part = c.split(";")[0];
    if (part.startsWith("lawygo_session=")) return part;
  }
  const legacy = res.headers.get("set-cookie");
  if (legacy?.includes("lawygo_session=")) return legacy.split(";")[0];
  return "";
}

async function api(method, urlPath, body, useAuth = true) {
  const headers = { "Content-Type": "application/json" };
  if (useAuth && cookie) headers.Cookie = cookie;
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: urlPath.startsWith("/board") || urlPath.startsWith("/admin") ? "follow" : undefined,
  });
  const isJson = (res.headers.get("content-type") ?? "").includes("json");
  const data = isJson ? await res.json().catch(() => ({})) : { _text: await res.text().catch(() => "") };
  return { res, data };
}

async function demoLogin() {
  const res = await fetch(`${BASE}/api/auth/demo`, { method: "POST" });
  cookie = parseCookie(res);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && Boolean(cookie), data };
}

/** 1x1 PNG */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

async function testCatalog() {
  const feature = "catalog";
  const { res, data } = await api("GET", "/api/extensions", undefined, false);
  if (res.status === 200 && Array.isArray(data.catalog) && data.catalog.length >= 8) {
    record(feature, "GET /api/extensions", "PASS", `catalog ${data.catalog.length}개`);
  } else {
    record(feature, "GET /api/extensions", "FAIL", `HTTP ${res.status}`);
  }

  const ids = ["law_mcp", "dart_reports", "voice_studio", "marketing_harness", "ai_image_gen"];
  for (const id of ids) {
    const page = await fetch(`${BASE}/board/studio/${id}`, { redirect: "follow" });
    const html = await page.text();
    const err = /Application error|Internal Server Error|Unhandled Runtime Error/i.test(html);
    if (page.status === 200 && !err) {
      record(feature, `studio /${id}`, "PASS", "HTTP 200");
    } else {
      record(feature, `studio /${id}`, "FAIL", err ? "런타임 에러" : `HTTP ${page.status}`);
    }
  }
}

async function testLawMcp() {
  const feature = "law_mcp";

  const unauth = await api("POST", "/api/extensions/law-mcp", { tool: "search_law", params: { query: "민법" } }, false);
  if (unauth.res.status === 401) {
    record(feature, "POST 비인증 401", "PASS", "로그인 필요");
  } else {
    record(feature, "POST 비인증 401", "FAIL", `HTTP ${unauth.res.status}`);
  }

  const { res: gRes, data: gData } = await api("GET", "/api/extensions/law-mcp", undefined, false);
  if (gRes.status === 200 && Array.isArray(gData.tools) && gData.tools.length >= 5) {
    record(feature, "GET tools", "PASS", `${gData.tools.length} tools`);
  } else {
    record(feature, "GET tools", "FAIL", `HTTP ${gRes.status}`);
  }

  const search = await api("POST", "/api/extensions/law-mcp", {
    tool: "search_law",
    params: { query: "민법", maxResults: 3 },
  });
  if (search.res.status === 200 && search.data.ok && search.data.data) {
    const count = search.data.data.count ?? search.data.data.items?.length ?? 0;
    const hint = search.data.data.hint;
    record(feature, "search_law", hint ? "SKIP" : "PASS", hint ?? `items ${count}`);
  } else {
    record(feature, "search_law", "FAIL", search.data.error ?? `HTTP ${search.res.status}`);
  }

  const article = await api("POST", "/api/extensions/law-mcp", {
    tool: "get_law_article",
    params: { lawName: "민법", articleNo: "750" },
  });
  if (article.res.status === 200 && article.data.ok) {
    const src = article.data.data?.source;
    const hasContent = Boolean(article.data.data?.text || article.data.data?.html);
    record(feature, "get_law_article", hasContent || src === "fallback" ? "PASS" : "FAIL", `source=${src}`);
  } else {
    record(feature, "get_law_article", "FAIL", article.data.error ?? `HTTP ${article.res.status}`);
  }

  const prec = await api("POST", "/api/extensions/law-mcp", {
    tool: "search_precedents",
    params: { query: "손해배상", display: 3 },
  });
  if (prec.res.status === 200 && prec.data.ok) {
    record(feature, "search_precedents", "PASS", `count=${prec.data.data?.count ?? 0}`);
  } else {
    record(feature, "search_precedents", "FAIL", prec.data.error ?? `HTTP ${prec.res.status}`);
  }

  const link = await api("POST", "/api/extensions/law-mcp", {
    tool: "external_links",
    params: { query: "민법", type: "law" },
  });
  if (link.res.status === 200 && link.data.ok && link.data.data?.url) {
    record(feature, "external_links", "PASS", "URL 생성");
  } else {
    record(feature, "external_links", "FAIL", link.data.error ?? `HTTP ${link.res.status}`);
  }
}

async function testDartReports() {
  const feature = "dart_reports";

  const { res, data } = await api("GET", "/api/extensions/dart-reports", undefined, false);
  if (res.status === 200 && Array.isArray(data.corpIndex)) {
    record(feature, "GET corp index", "PASS", `configured=${data.configured}, corps=${data.corpIndex.length}`);
  } else {
    record(feature, "GET corp index", "FAIL", `HTTP ${res.status}`);
  }

  const search = await api("POST", "/api/extensions/dart-reports", { action: "corp_search", keyword: "삼성" });
  if (search.res.status === 200 && search.data.ok && Array.isArray(search.data.items) && search.data.items.length > 0) {
    record(feature, "corp_search", "PASS", `hits=${search.data.items.length}`);
  } else {
    record(feature, "corp_search", "FAIL", search.data.error ?? `HTTP ${search.res.status}`);
  }

  const disc = await api("POST", "/api/extensions/dart-reports", { action: "disclosures", corpName: "삼성전자" });
  if (disc.res.status === 200 && disc.data.ok && Array.isArray(disc.data.items)) {
    record(feature, "disclosures", "PASS", `items=${disc.data.items.length}`);
  } else if (disc.data.error?.includes("OPENDART") || disc.data.error?.includes("API_KEY")) {
    record(feature, "disclosures", "SKIP", "OPENDART_API_KEY 미설정");
  } else {
    record(feature, "disclosures", "FAIL", disc.data.error ?? `HTTP ${disc.res.status}`);
  }

  const fin = await api("POST", "/api/extensions/dart-reports", {
    action: "financial",
    corpName: "삼성전자",
    bsnsYear: String(new Date().getFullYear() - 1),
  });
  if (fin.res.status === 200 && fin.data.ok && fin.data.financial) {
    record(feature, "financial", "PASS", `highlights=${fin.data.financial.highlights?.length ?? 0}`);
  } else if (fin.data.error?.includes("OPENDART") || fin.data.error?.includes("API_KEY")) {
    record(feature, "financial", "SKIP", "OPENDART_API_KEY 미설정");
  } else {
    record(feature, "financial", "FAIL", fin.data.error ?? `HTTP ${fin.res.status}`);
  }
}

async function testVoiceStudio() {
  const feature = "voice_studio";

  const unauth = await api("POST", "/api/extensions/voice-tts", { text: "테스트" }, false);
  if (unauth.res.status === 401) {
    record(feature, "POST 비인증 401", "PASS", "로그인 필요");
  } else {
    record(feature, "POST 비인증 401", "FAIL", `HTTP ${unauth.res.status}`);
  }

  const empty = await api("POST", "/api/extensions/voice-tts", { text: "" });
  if (empty.res.status === 400) {
    record(feature, "빈 텍스트 400", "PASS", "검증 OK");
  } else {
    record(feature, "빈 텍스트 400", "FAIL", `HTTP ${empty.res.status}`);
  }

  const gen = await api("POST", "/api/extensions/voice-tts", {
    text: "상속 절차는 유언장 작성, 상속재산 조사, 상속세 신고 순으로 진행됩니다.",
    style: "전문적이고 따뜻한",
  });
  if (gen.res.status === 200 && gen.data.ok && gen.data.script?.length > 20) {
    record(feature, "대본 생성", "PASS", `len=${gen.data.script.length}`);
  } else if (gen.data.error?.includes("Gemini") || gen.data.error?.includes("API 키")) {
    record(feature, "대본 생성", "SKIP", "Gemini 미설정");
  } else {
    record(feature, "대본 생성", "FAIL", gen.data.error ?? `HTTP ${gen.res.status}`);
  }
}

async function testMarketingHarness() {
  const feature = "marketing_harness";

  const unauth = await api("POST", "/api/extensions/marketing-harness", { topic: "테스트" }, false);
  if (unauth.res.status === 401) {
    record(feature, "POST 비인증 401", "PASS", "로그인 필요");
  } else {
    record(feature, "POST 비인증 401", "FAIL", `HTTP ${unauth.res.status}`);
  }

  const empty = await api("POST", "/api/extensions/marketing-harness", { topic: "", channel: "blog" });
  if (empty.res.status === 400) {
    record(feature, "빈 주제 400", "PASS", "검증 OK");
  } else {
    record(feature, "빈 주제 400", "FAIL", `HTTP ${empty.res.status}`);
  }

  const gen = await api("POST", "/api/extensions/marketing-harness", {
    topic: "상속·유언장 작성 상담 안내",
    channel: "blog",
    audience: "50대 잠재 의뢰인",
  });
  if (gen.res.status === 200 && gen.data.ok && gen.data.pack) {
    const hasBody = Boolean(gen.data.pack.body || gen.data.pack.title);
    record(feature, "harness blog", hasBody ? "PASS" : "FAIL", hasBody ? "pack 생성" : "본문 없음");
  } else if (gen.data.error?.includes("Gemini") || gen.data.error?.includes("API 키")) {
    record(feature, "harness blog", "SKIP", "Gemini 미설정");
  } else {
    record(feature, "harness blog", "FAIL", gen.data.error ?? `HTTP ${gen.res.status}`);
  }
}

async function testAiImageGen() {
  const feature = "ai_image_gen";

  const unauth = await api("POST", "/api/ai/image-generate", { prompt: "test" }, false);
  if (unauth.res.status === 401) {
    record(feature, "POST 비인증 401", "PASS", "로그인 필요");
  } else {
    record(feature, "POST 비인증 401", "FAIL", `HTTP ${unauth.res.status}`);
  }

  const empty = await api("POST", "/api/ai/image-generate", { prompt: "" });
  if ([400, 503].includes(empty.res.status)) {
    record(feature, "빈 prompt", "PASS", `HTTP ${empty.res.status}`);
  } else if (empty.res.status === 200) {
    record(feature, "빈 prompt", "SKIP", "Gemini 이미지 생성 가능");
  } else {
    record(feature, "빈 prompt", "FAIL", `HTTP ${empty.res.status}`);
  }
}

async function testImageProcess() {
  const feature = "image_process";

  const form = new FormData();
  form.append("file", new Blob([TINY_PNG], { type: "image/png" }), "tiny.png");
  form.append("action", "optimize");
  form.append("quality", "80");

  const unauth = await fetch(`${BASE}/api/extensions/image-process`, { method: "POST", body: form });
  if (unauth.status === 401) {
    record(feature, "POST 비인증 401", "PASS", "로그인 필요");
  } else {
    record(feature, "POST 비인증 401", "FAIL", `HTTP ${unauth.status}`);
  }

  const form2 = new FormData();
  form2.append("file", new Blob([TINY_PNG], { type: "image/png" }), "tiny.png");
  form2.append("action", "optimize");
  form2.append("quality", "80");

  const res = await fetch(`${BASE}/api/extensions/image-process`, {
    method: "POST",
    headers: cookie ? { Cookie: cookie } : {},
    body: form2,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 200 && data.imageBase64) {
    record(feature, "optimize PNG", "PASS", `out=${data.outputSize}b`);
  } else {
    record(feature, "optimize PNG", "FAIL", data.error ?? `HTTP ${res.status}`);
  }
}

async function main() {
  console.log(`확장 플랫폼 E2E (${BASE})\n`);

  const login = await demoLogin();
  if (!login.ok) {
    console.error("데모 로그인 실패 — 테스트 중단");
    process.exit(1);
  }
  record("auth", "demo login", "PASS", "세션 확보");

  await testCatalog();
  await testLawMcp();
  await testDartReports();
  await testVoiceStudio();
  await testMarketingHarness();
  await testAiImageGen();
  await testImageProcess();

  console.log(`\nE2E: PASS ${pass} / SKIP ${skip} / FAIL ${fail}`);

  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "docs", "qa");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "extensions-e2e-results.json"),
    JSON.stringify({ base: BASE, at: new Date().toISOString(), pass, skip, fail, results }, null, 2)
  );
  console.log("결과 저장: docs/qa/extensions-e2e-results.json");

  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
