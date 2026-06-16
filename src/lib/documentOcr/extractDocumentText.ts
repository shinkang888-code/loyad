/**
 * PDF·이미지 → 텍스트 (pdfjs 내장 텍스트 → OCR 폴백)
 */
import { extractTextFromPdfBufferServer } from "./pdfTextExtractServer";
import { runDocumentOcrChain } from "./ocrProviders";
import { ocrScannedPdfWithGeminiChunks } from "./pdfChunkOcr";
import type { DocumentOcrResult } from "./types";
import { isImageMime, isPdfMime, needsOcrFallback } from "./types";

/** Vercel 서버리스 요청 본문 한도(4.5MB) 이내로 API 업로드 권장 */
export const MAX_BYTES = 12 * 1024 * 1024;

export async function extractDocumentText(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<DocumentOcrResult> {
  if (buffer.length > MAX_BYTES) {
    throw new Error("파일은 12MB 이하여야 합니다.");
  }

  const warnings: string[] = [];

  if (isPdfMime(mimeType, fileName)) {
    const { text, pageCount } = await extractTextFromPdfBufferServer(buffer);

    if (!needsOcrFallback(text, pageCount)) {
      return {
        text,
        method: "pdf-text",
        pageCount,
        charCount: text.length,
      };
    }

    warnings.push("PDF에 텍스트 레이어가 없거나 부족하여 OCR을 실행합니다.");
    const chunked = await ocrScannedPdfWithGeminiChunks(buffer, pageCount);
    if ("text" in chunked && chunked.text.trim()) {
      return {
        text: chunked.text,
        method: chunked.method,
        pageCount,
        charCount: chunked.text.length,
        warnings,
      };
    }
    if ("code" in chunked) {
      const fallback = await runDocumentOcrChain(buffer, "application/pdf");
      if (fallback && "text" in fallback && fallback.text.trim()) {
        return {
          text: fallback.text,
          method: fallback.method,
          pageCount,
          charCount: fallback.text.length,
          warnings: [...warnings, "Gemini 청크 OCR 실패 — 대체 엔진으로 추출했습니다."],
        };
      }
      throw new Error(chunked.message);
    }

    const ocr = await runDocumentOcrChain(buffer, "application/pdf");
    if (ocr && "text" in ocr && ocr.text.trim()) {
      return {
        text: ocr.text,
        method: ocr.method,
        pageCount,
        charCount: ocr.text.length,
        warnings,
      };
    }

    if (ocr && "code" in ocr) {
      throw new Error(ocr.message);
    }

    if (text.trim()) {
      warnings.push("OCR 결과가 비어 있어 추출된 PDF 텍스트를 사용합니다.");
      return { text, method: "pdf-text", pageCount, charCount: text.length, warnings };
    }

    throw new Error(
      "PDF에서 텍스트를 추출하지 못했습니다. GOOGLE_VISION_API_KEY, CLOVA OCR, 또는 Gemini API를 설정해 주세요."
    );
  }

  if (isImageMime(mimeType, fileName)) {
    const resolvedMime = mimeType.startsWith("image/") ? mimeType : "image/jpeg";
    const ocr = await runDocumentOcrChain(buffer, resolvedMime);
    if (ocr && "text" in ocr && ocr.text.trim()) {
      return {
        text: ocr.text,
        method: ocr.method,
        charCount: ocr.text.length,
      };
    }
    if (ocr && "code" in ocr) {
      throw new Error(ocr.message);
    }
    throw new Error(
      "이미지 OCR에 실패했습니다. Vision·CLOVA·Gemini 중 하나 이상을 환경 변수 또는 AI 설정에서 구성해 주세요."
    );
  }

  throw new Error("PDF 또는 이미지(JPG, PNG, WEBP, TIFF) 파일만 지원합니다.");
}
