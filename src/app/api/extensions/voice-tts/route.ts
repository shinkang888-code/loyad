/**
 * POST /api/extensions/voice-tts — 나레이션 대본 다듬기 (voice 리포 패턴)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/authSession";
import { polishVoiceScript } from "@/lib/extensions/contentStudioServer";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await req.json()) as { text?: string; style?: string };
  const result = await polishVoiceScript(String(body.text ?? ""), body.style);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, script: result.script });
}
