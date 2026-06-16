/**
 * 소프트 삭제된 게시판 복구
 * POST { id: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminSession";
import { isNativeBoardReady, restoreBoard } from "@/lib/boardService";

export async function POST(req: NextRequest) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;

  if (!(await isNativeBoardReady())) {
    return NextResponse.json({ error: "native_boards 마이그레이션 필요" }, { status: 503 });
  }

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const id = body.id?.trim();
  if (!id) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });

  try {
    const ok = await restoreBoard(id);
    if (!ok) return NextResponse.json({ error: "복구할 수 없습니다." }, { status: 400 });
    return NextResponse.json({ ok: true, message: "게시판이 복구되었습니다." });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "복구 실패" },
      { status: 500 }
    );
  }
}
