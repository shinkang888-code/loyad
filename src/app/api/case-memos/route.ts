/**
 * 사건 메모장 ↔ 사건메모 게시판 API
 */

import { NextRequest, NextResponse } from "next/server";
import {
  CASE_MEMO_BOARD_SLUG,
  boardMemoId,
  encodeMemoCategory,
  parseBoardMemoNumId,
  postRecordToTimeline,
  timelineToBoardPayload,
} from "@/lib/caseMemoBoardSync";
import {
  createPost,
  listPosts,
  softDeletePost,
  updatePost,
} from "@/lib/boardService";
import { bridgeContextFromSession } from "@/lib/boardApiContext";
import { requireAuthenticatedSession } from "@/lib/adminSession";
import { getSession } from "@/lib/authSession";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  const caseId = new URL(request.url).searchParams.get("caseId")?.trim();
  if (!caseId) {
    return NextResponse.json({ success: false, error: "caseId가 필요합니다." }, { status: 400 });
  }

  const ctx = bridgeContextFromSession(session);
  try {
    const { items } = await listPosts(CASE_MEMO_BOARD_SLUG, {
      caseId,
      pageSize: 100,
      managementNumber: ctx.managementNumber,
    });
    return NextResponse.json({
      success: true,
      data: items.map(postRecordToTimeline),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "메모를 불러올 수 없습니다.";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedSession();
  if ("error" in auth) return auth.error;

  let body: {
    caseId?: string;
    content?: string;
    date?: string;
    caseNumber?: string;
    caseType?: string;
    authorName?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const caseId = body.caseId?.trim();
  const content = body.content?.trim();
  if (!caseId || !content) {
    return NextResponse.json(
      { success: false, error: "caseId와 content가 필요합니다." },
      { status: 400 }
    );
  }

  const ctx = bridgeContextFromSession(auth.session);
  const date = body.date ?? new Date().toISOString();
  const title = body.caseNumber
    ? `[${body.caseNumber}] ${content.split("\n")[0].slice(0, 60) || "사건 메모"}`
    : content.split("\n")[0].slice(0, 60) || "사건 메모";

  try {
    const created = await createPost(CASE_MEMO_BOARD_SLUG, {
      title,
      content,
      authorName: body.authorName ?? ctx.authorName ?? "담당자",
      authorLoginId: ctx.authorLoginId,
      category: encodeMemoCategory(date),
      caseId,
      caseType: body.caseType,
      managementNumber: ctx.managementNumber,
    });
    return NextResponse.json({ success: true, data: postRecordToTimeline(created) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "메모 등록에 실패했습니다.";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuthenticatedSession();
  if ("error" in auth) return auth.error;

  let body: {
    id?: string;
    content?: string;
    date?: string;
    caseNumber?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const numId = body.id ? parseBoardMemoNumId(body.id) : null;
  if (!numId) {
    return NextResponse.json({ success: false, error: "유효한 board 메모 ID가 필요합니다." }, { status: 400 });
  }

  const ctx = bridgeContextFromSession(auth.session);
  const content = body.content?.trim();
  const update: {
    title?: string;
    content?: string;
    category?: string;
    managementNumber?: string | null;
  } = { managementNumber: ctx.managementNumber };

  if (content !== undefined) {
    update.content = content;
    if (body.caseNumber) {
      update.title = `[${body.caseNumber}] ${content.split("\n")[0].slice(0, 60) || "사건 메모"}`;
    }
  }
  if (body.date) {
    update.category = encodeMemoCategory(body.date);
  }

  try {
    const updated = await updatePost(CASE_MEMO_BOARD_SLUG, numId, update);
    if (!updated) {
      return NextResponse.json({ success: false, error: "메모를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: postRecordToTimeline(updated) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "메모 수정에 실패했습니다.";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuthenticatedSession();
  if ("error" in auth) return auth.error;

  const memoId = new URL(request.url).searchParams.get("id")?.trim();
  const numId = memoId ? parseBoardMemoNumId(memoId) : null;
  if (!numId) {
    return NextResponse.json({ success: false, error: "유효한 board 메모 ID가 필요합니다." }, { status: 400 });
  }

  const ctx = bridgeContextFromSession(auth.session);
  try {
    const ok = await softDeletePost(CASE_MEMO_BOARD_SLUG, numId, ctx.managementNumber);
    if (!ok) {
      return NextResponse.json({ success: false, error: "메모를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ success: true, id: boardMemoId(numId) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "메모 삭제에 실패했습니다.";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
