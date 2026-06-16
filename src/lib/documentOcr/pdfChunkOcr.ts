/**
 * 스캔 PDF — pdf-lib 페이지 구간 분할 + Gemini Vision OCR
 */
import { PDFDocument } from "pdf-lib";
import { generateGeminiContent } from "@/lib/geminiClient";
import { normalizeJudgmentText } from "@/lib/pdfTextExtract";
import type { OcrChainError } from "./types";
import type { OcrMethod } from "./types";

const JUDGMENT_OCR_PROMPT =
  "이 문서(판결문·법률 문서)의 본문 텍스트를 빠짐없이 추출하세요. 【주문】【이유】【범죄사실】 등 구조와 줄바꿈을 유지하고, 설명·요약 없이 추출된 텍스트만 출력하세요.";

/** Vercel 요청 본문 한도(4.5MB) 대비 안전한 청크 크기 */
export const PDF_UPLOAD_SAFE_BYTES = 3_500_000;

/** 한 번에 Gemini에 보낼 PDF 페이지 수 (스캔 판결문 기준) */
export const PDF_OCR_PAGES_PER_CHUNK = 4;

export async function extractPdfPageRangeBuffer(
  source: Buffer,
  startPage: number,
  endPage: number
): Promise<Buffer> {
  const src = await PDFDocument.load(source, { ignoreEncryption: true });
  const dst = await PDFDocument.create();
  const indices: number[] = [];
  const max = src.getPageCount();
  for (let p = startPage; p <= endPage && p <= max; p++) {
    indices.push(p - 1);
  }
  if (indices.length === 0) {
    throw new Error("유효한 PDF 페이지 구간이 아닙니다.");
  }
  const copied = await dst.copyPages(src, indices);
  for (const page of copied) dst.addPage(page);
  return Buffer.from(await dst.save());
}

export async function ocrPdfBufferWithGemini(
  pdfBuffer: Buffer,
  label: string
): Promise<{ text: string } | OcrChainError | null> {
  const result = await generateGeminiContent({
    parts: [
      { inline_data: { mime_type: "application/pdf", data: pdfBuffer.toString("base64") } },
      { text: `${JUDGMENT_OCR_PROMPT}\n\n(페이지 구간: ${label})` },
    ],
    temperature: 0.1,
    maxOutputTokens: 16384,
    minTextLength: 30,
  });

  if (result.ok) {
    return { text: normalizeJudgmentText(result.text) };
  }
  if (result.invalidKey) {
    return {
      code: "invalid_gemini_key",
      message: result.message,
    };
  }
  return {
    code: "gemini_failed",
    message: result.message,
  };
}

export async function ocrScannedPdfWithGeminiChunks(
  buffer: Buffer,
  pageCount: number,
  pagesPerChunk = PDF_OCR_PAGES_PER_CHUNK
): Promise<{ text: string; method: OcrMethod } | OcrChainError> {
  const parts: string[] = [];
  const failures: string[] = [];

  for (let start = 1; start <= pageCount; start += pagesPerChunk) {
    const end = Math.min(start + pagesPerChunk - 1, pageCount);
    const label = `${start}-${end}/${pageCount}`;
    let chunkBuf: Buffer;

    try {
      chunkBuf = await extractPdfPageRangeBuffer(buffer, start, end);
    } catch (e) {
      failures.push(`${label}: PDF 분할 실패`);
      continue;
    }

    const ocr = await ocrPdfBufferWithGemini(chunkBuf, label);
    if (ocr && "text" in ocr && ocr.text.trim()) {
      parts.push(ocr.text.trim());
      continue;
    }
    if (ocr && "code" in ocr) {
      if (ocr.code === "invalid_gemini_key") return ocr;
      failures.push(`${label}: ${ocr.message}`);
    } else {
      failures.push(`${label}: 빈 OCR 결과`);
    }
  }

  const merged = parts.join("\n\n");
  if (merged.trim().length >= 60) {
    return { text: merged, method: "gemini-vision" };
  }

  return {
    code: "gemini_failed",
    message:
      failures.length > 0
        ? `스캔 PDF OCR 실패: ${failures.slice(0, 3).join(" · ")}`
        : "스캔 PDF에서 텍스트를 추출하지 못했습니다. Gemini API 키·할당량을 확인하세요.",
  };
}
