/**
 * 전문 게시판 중간 관리자 API - 게시물 목록 / 작성
 */

import { NextRequest, NextResponse } from "next/server";
import { bridgeCreatePost, bridgeGetPostList } from "@/lib/boardBridge";
import { bridgeContextFromSession, getTenantManagementNumber } from "@/lib/boardApiContext";
import { getSession } from "@/lib/authSession";
import { requireAuthenticatedSession } from "@/lib/adminSession";

type Params = { params: Promise<{ boardId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { boardId } = await params;
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page");
  const per_page = searchParams.get("per_page");
  const search_keyword = searchParams.get("search_keyword") ?? undefined;
  const search_field = searchParams.get("search_field") ?? undefined;
  const category = searchParams.get("category") ?? undefined;

  const session = await getSession();
  const ctx = session
    ? bridgeContextFromSession(session)
    : { managementNumber: getTenantManagementNumber(null) };

  const result = await bridgeGetPostList(boardId, {
    page: page ? Number(page) : undefined,
    per_page: per_page ? Number(per_page) : undefined,
    search_keyword,
    search_field,
    category,
    managementNumber: ctx.managementNumber,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error, data: result.data, total: result.total ?? 0 },
      { status: 502 }
    );
  }
  return NextResponse.json({
    success: true,
    data: result.data,
    total: result.total,
    source: result.source,
    nativeBoard: result.source === "lawygo",
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuthenticatedSession();
  if ("error" in auth) return auth.error;

  const { boardId } = await params;
  let body: { wr_subject?: string; wr_content?: string; wr_name?: string; wr_1?: string; wr_2?: string; isDraft?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const result = await bridgeCreatePost(
    boardId,
    {
      wr_subject: body.wr_subject ?? "",
      wr_content: body.wr_content ?? "",
      wr_name: body.wr_name,
      wr_1: body.wr_1,
      wr_2: body.wr_2,
      isDraft: body.isDraft,
    },
    bridgeContextFromSession(auth.session)
  );

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error, data: result.data },
      { status: 502 }
    );
  }
  return NextResponse.json({ success: true, data: result.data, source: result.source });
}
