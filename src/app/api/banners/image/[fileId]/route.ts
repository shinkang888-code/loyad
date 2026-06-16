/**
 * 배너 이미지 프록시 — Drive 파일을 img 태그에서 표시 가능하도록 inline 제공
 * GET /api/banners/image/[fileId]
 */

import { NextRequest, NextResponse } from "next/server";
import { getDriveClient, getFileBuffer } from "@/lib/googleDriveClient";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;
  if (!fileId?.trim()) {
    return NextResponse.json({ error: "fileId가 필요합니다." }, { status: 400 });
  }

  const drive = await getDriveClient();
  if (!drive) {
    return NextResponse.json(
      { error: "Google Drive 연동이 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  const fileData = await getFileBuffer(drive, decodeURIComponent(fileId.trim()));
  if (!fileData) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }

  const mimeType = fileData.mimeType || "image/jpeg";
  const body = new Uint8Array(fileData.buffer);
  return new NextResponse(body, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": "inline",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
