/**
 * 전문 게시판 중간 관리자 API - 게시물 단건 조회/수정/삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { bridgeDeletePost, bridgeGetPost, bridgeUpdatePost } from "@/lib/boardBridge";
import { bridgeContextFromSession, getTenantManagementNumber } from "@/lib/boardApiContext";
import { getSession } from "@/lib/authSession";
import { requireAuthenticatedSession } from "@/lib/adminSession";

type Params = { params: Promise<{ boardId: string; postId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { boardId, postId } = await params;
  const id = Number(postId);
  if (Number.isNaN(id)) {
    return NextResponse.json({ success: false, error: "잘못된 게시물 ID입니다." }, { status: 400 });
  }

  const session = await getSession();
  const ctx = session
    ? bridgeContextFromSession(session)
    : { managementNumber: getTenantManagementNumber(null) };

  const result = await bridgeGetPost(boardId, id, ctx);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error, data: result.data },
      { status: result.data === null ? 404 : 502 }
    );
  }
  return NextResponse.json({ success: true, data: result.data, source: result.source });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAuthenticatedSession();
  if ("error" in auth) return auth.error;

  const { boardId, postId } = await params;
  const id = Number(postId);
  if (Number.isNaN(id)) {
    return NextResponse.json({ success: false, error: "잘못된 게시물 ID입니다." }, { status: 400 });
  }

  let body: { wr_subject?: string; wr_content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const result = await bridgeUpdatePost(boardId, id, body, bridgeContextFromSession(auth.session));
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error, data: result.data },
      { status: result.data === null ? 404 : 502 }
    );
  }
  return NextResponse.json({ success: true, data: result.data, source: result.source });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireAuthenticatedSession();
  if ("error" in auth) return auth.error;

  const { boardId, postId } = await params;
  const id = Number(postId);
  if (Number.isNaN(id)) {
    return NextResponse.json({ success: false, error: "잘못된 게시물 ID입니다." }, { status: 400 });
  }

  const result = await bridgeDeletePost(boardId, id, bridgeContextFromSession(auth.session));
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, source: result.source });
}
