/**
 * 판결문 PDF 요약(doc_summary) OCR E2E
 * node scripts/test-doc-summary-e2e.mjs
 * BASE_URL=https://lawygo.vercel.app node scripts/test-doc-summary-e2e.mjs
 */
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const BASE = process.env.BASE_URL || "https://lawygo.vercel.app";
const samplePdf = path.join(root, "scripts/fixtures/sample-judgment.pdf");

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
  console.log(`=== 판결문 PDF 요약 OCR E2E (${BASE}) ===\n`);

  if (!existsSync(samplePdf)) {
    throw new Error(`샘플 PDF 없음: ${samplePdf}`);
  }

  const cookie = await demoLogin();
  console.log("OK: 데모 로그인");

  const status = await fetch(`${BASE}/api/document/ocr`, {
    headers: { Cookie: cookie },
  });
  const statusJson = await status.json();
  if (!status.ok) throw new Error(`OCR 상태 조회 실패: ${status.status}`);
  console.log("OK: OCR API 상태", statusJson.providers);

  const buf = readFileSync(samplePdf);
  const form = new FormData();
  form.append("file", new Blob([buf], { type: "application/pdf" }), "sample-judgment.pdf");

  const ocrRes = await fetch(`${BASE}/api/document/ocr`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: form,
  });
  const ocrJson = await ocrRes.json();
  if (!ocrRes.ok) {
    throw new Error(`OCR 실패 (${ocrRes.status}): ${ocrJson.error ?? JSON.stringify(ocrJson)}`);
  }

  const text = (ocrJson.text ?? "").trim();
  if (!text) throw new Error("OCR 결과 텍스트가 비어 있습니다.");
  if (text.includes("fake worker failed")) {
    throw new Error("pdfjs fake worker 오류가 응답에 포함됨");
  }

  console.log(
    `OK: PDF OCR — method=${ocrJson.method} pages=${ocrJson.pageCount} chars=${text.length}`
  );
  console.log(`   preview: ${text.slice(0, 80).replace(/\s+/g, " ")}…`);

  const pageRes = await fetch(`${BASE}/board/ai/doc_summary`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  if (pageRes.status !== 200 && pageRes.status !== 307 && pageRes.status !== 308) {
    throw new Error(`doc_summary 페이지 접근 실패: ${pageRes.status}`);
  }
  console.log("OK: /board/ai/doc_summary 페이지 접근");

  const prompt = `다음 판결문 텍스트를 간략히 요약해 주세요.\n\n${text.slice(0, 4000)}`;
  const sumRes = await fetch(`${BASE}/api/ai/gemini`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ prompt, featureId: "doc_summary" }),
  });
  const sumJson = await sumRes.json();
  if (!sumRes.ok) {
    throw new Error(`Gemini 요약 실패 (${sumRes.status}): ${sumJson.error ?? JSON.stringify(sumJson)}`);
  }
  const summary = (sumJson.text ?? "").trim();
  if (!summary) throw new Error("Gemini 요약 결과가 비어 있습니다.");
  console.log(`OK: Gemini 요약 — ${summary.slice(0, 100).replace(/\s+/g, " ")}…`);

  console.log("\n=== 판결문 PDF 요약 OCR E2E 통과 ===");
}

main().catch((e) => {
  console.error("\n❌ 검증 실패:", e.message || e);
  process.exit(1);
});
