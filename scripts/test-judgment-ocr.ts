/**
 * 판결문 PDF OCR 진단
 * npx tsx scripts/test-judgment-ocr.ts [pdf-path] [maxPages]
 */
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnv() {
  for (const file of [".env.production.local", ".env.local", "bot/.env"]) {
    const p = path.join(root, file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m) {
        const v = m[2].replace(/^["']|["']$/g, "").trim();
        if (v) process.env[m[1]] = v;
      }
    }
  }
}

loadEnv();

const pdfPath =
  process.argv[2] ??
  "c:/Users/user/OneDrive/문서/카카오톡 받은 파일/서울남부25고합614(882 병합)_김대웅 판결문.pdf";
const maxPages = Number(process.argv[3] ?? "0") || undefined;

if (!existsSync(pdfPath)) {
  console.error("파일 없음:", pdfPath);
  process.exit(1);
}

const buffer = readFileSync(pdfPath);
console.log("파일:", pdfPath);
console.log("크기:", buffer.length, "bytes");

const { getOcrAvailability } = await import("../src/lib/documentOcr/ocrProviders");
const { extractTextFromPdfBufferServer } = await import("../src/lib/documentOcr/pdfTextExtractServer");
const { needsOcrFallback } = await import("../src/lib/documentOcr/types");
const { extractDocumentText } = await import("../src/lib/documentOcr/extractDocumentText");

const avail = await getOcrAvailability();
console.log("providers:", avail);

try {
  const pdf = await extractTextFromPdfBufferServer(buffer);
  console.log(
    `pdf-text: pages=${pdf.pageCount} chars=${pdf.text.length} needsOcr=${needsOcrFallback(pdf.text, pdf.pageCount)}`
  );

  if (maxPages && maxPages > 0) {
    const { extractPdfPageRangeBuffer, ocrScannedPdfWithGeminiChunks } = await import(
      "../src/lib/documentOcr/pdfChunkOcr"
    );
    const limited = await extractPdfPageRangeBuffer(buffer, 1, maxPages);
    console.log(`quick chunk 1-${maxPages}: ${limited.length} bytes`);
    const quick = await ocrScannedPdfWithGeminiChunks(limited, maxPages, maxPages);
    if ("text" in quick) {
      console.log(`quick OK chars=${quick.text.length}`);
      console.log("sample:", quick.text.slice(0, 400));
      process.exit(0);
    }
    console.error("quick FAIL", quick);
    process.exit(1);
  }
} catch (e) {
  console.error("pdf-text error:", e instanceof Error ? e.message : e);
}

try {
  const result = await extractDocumentText(buffer, path.basename(pdfPath), "application/pdf");
  console.log(`OK method=${result.method} chars=${result.charCount} pages=${result.pageCount ?? "n/a"}`);
  console.log("sample:", result.text.slice(0, 400));
  if (result.warnings?.length) console.log("warnings:", result.warnings);
} catch (e) {
  console.error("FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
}
