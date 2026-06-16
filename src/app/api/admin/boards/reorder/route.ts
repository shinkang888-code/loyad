/**
 * 게시판 순서 일괄 변경
 * PATCH { orderedIds: string[] }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminSession";
import { getTenantManagementNumber } from "@/lib/boardApiContext";
import { isNativeBoardReady, reorderBoards } from "@/lib/boardService";

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;

  if (!(await isNativeBoardReady())) {
    return NextResponse.json({ error: "native_boards 마이그레이션 필요" }, { status: 503 });
  }

  let body: { orderedIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const orderedIds = body.orderedIds?.filter(Boolean) ?? [];
  if (orderedIds.length === 0) {
    return NextResponse.json({ error: "orderedIds가 필요합니다." }, { status: 400 });
  }

  try {
    await reorderBoards(orderedIds, getTenantManagementNumber(auth.session));
    return NextResponse.json({ ok: true, message: "순서가 저장되었습니다." });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "순서 저장 실패" },
      { status: 500 }
    );
  }
}
