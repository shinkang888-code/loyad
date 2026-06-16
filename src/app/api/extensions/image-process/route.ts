/**
 * POST /api/extensions/image-process — 최적화·변환 (multipart)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/authSession";
import { convertImage, optimizeImage } from "@/lib/extensions/imageProcessor";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const action = String(form.get("action") ?? "optimize");
  const quality = Number(form.get("quality") ?? 82);
  const maxWidth = Number(form.get("maxWidth") ?? 1920);
  const format = String(form.get("format") ?? "webp") as "jpeg" | "webp" | "png" | "avif";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file이 필요합니다." }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "15MB 이하 파일만 지원합니다." }, { status: 400 });
  }

  try {
    if (action === "convert") {
      const result = await convertImage(buf, format, maxWidth);
      return NextResponse.json({
        mimeType: result.mimeType,
        imageBase64: result.buffer.toString("base64"),
        originalSize: buf.length,
        outputSize: result.buffer.length,
      });
    }

    const result = await optimizeImage(buf, { quality, maxWidth, format });
    return NextResponse.json({
      mimeType: result.mimeType,
      imageBase64: result.buffer.toString("base64"),
      originalSize: buf.length,
      outputSize: result.buffer.length,
      width: result.width,
      height: result.height,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "이미지 처리 실패";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
