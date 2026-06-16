/**
 * 확장 플랫폼 — Gemini 이미지 생성 (imaginAIry / Imagen 패턴)
 */

import { getGeminiApiKey } from "@/lib/geminiClient";

const IMAGE_MODELS = [
  "gemini-2.0-flash-preview-image-generation",
  "gemini-2.5-flash-image",
  "gemini-2.0-flash-exp",
] as const;

export type GeminiImageResult =
  | { ok: true; mimeType: string; base64: string; model: string; text?: string }
  | { ok: false; status: number; message: string };

export async function generateGeminiImage(options: {
  prompt: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3";
}): Promise<GeminiImageResult> {
  const apiKey = (await getGeminiApiKey()).trim();
  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      message: "Gemini API 키가 설정되지 않았습니다.",
    };
  }

  const prompt = options.prompt.trim();
  if (!prompt) {
    return { ok: false, status: 400, message: "프롬프트를 입력하세요." };
  }

  const aspectHint =
    options.aspectRatio === "16:9"
      ? "wide landscape 16:9"
      : options.aspectRatio === "9:16"
        ? "vertical portrait 9:16"
        : options.aspectRatio === "4:3"
          ? "4:3 aspect"
          : "square 1:1";

  const userPrompt = `Generate a professional image for a law firm marketing context. ${aspectHint}. ${prompt}`;

  for (const model of IMAGE_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
    });

    const body = await res.text();
    if (!res.ok) continue;

    try {
      const json = JSON.parse(body) as {
        candidates?: {
          content?: {
            parts?: Array<
              | { text?: string }
              | { inlineData?: { mimeType?: string; data?: string } }
              | { inline_data?: { mime_type?: string; data?: string } }
            >;
          };
        }[];
      };
      const parts = json.candidates?.[0]?.content?.parts ?? [];
      let text = "";
      for (const part of parts) {
        if ("text" in part && part.text) text += part.text;
        const inline =
          "inlineData" in part
            ? part.inlineData
            : "inline_data" in part
              ? {
                  mimeType: part.inline_data?.mime_type,
                  data: part.inline_data?.data,
                }
              : null;
        if (inline?.data) {
          return {
            ok: true,
            mimeType: inline.mimeType ?? "image/png",
            base64: inline.data,
            model,
            text: text || undefined,
          };
        }
      }
    } catch {
      continue;
    }
  }

  return {
    ok: false,
    status: 502,
    message:
      "이미지 생성 모델을 사용할 수 없습니다. GEMINI_MODEL 또는 API 할당량을 확인하세요.",
  };
}
