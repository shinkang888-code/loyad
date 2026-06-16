/**
 * POST /api/ai/image-generate — AI 이미지 생성
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/authSession";
import { generateGeminiImage } from "@/lib/extensions/geminiImageClient";
import { enforceRateLimit } from "@/lib/security/rateLimitGuard";
import { getClientIdentifier, LIMIT_AI_PER_MIN } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const limited = enforceRateLimit(req, `ai:image:${getClientIdentifier(req)}`, LIMIT_AI_PER_MIN, {
    routePath: "/api/ai/image-generate",
    source: "ai",
  });
  if (limited) return limited;

  let body: { prompt?: string; aspectRatio?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const aspect = body.aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | undefined;
  const result = await generateGeminiImage({
    prompt: body.prompt ?? "",
    aspectRatio: aspect,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json({
    mimeType: result.mimeType,
    imageBase64: result.base64,
    model: result.model,
    text: result.text,
  });
}
