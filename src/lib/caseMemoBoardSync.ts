/**
 * 사건 메모장 ↔ 사건메모 게시판(case_memo) 동기화 공통 유틸
 */

import type { PostRecord } from "./boardService";
import type { BoardPost } from "./boardBridge";
import type { CaseItem, Timeline } from "./types";

export const CASE_MEMO_BOARD_SLUG = "case_memo";
export const MEMO_DATE_CATEGORY_PREFIX = "memo_at:";

export function isBoardSyncedMemoId(id: string): boolean {
  return id.startsWith("board-");
}

export function boardMemoId(numId: number): string {
  return `board-${numId}`;
}

export function parseBoardMemoNumId(id: string): number | null {
  const match = id.match(/^board-(\d+)$/);
  return match ? Number(match[1]) : null;
}

export function isCourtSyncMemoId(id: string): boolean {
  return id.startsWith("court-sync");
}

export function isPendingLocalMemoId(id: string): boolean {
  return id.startsWith("memo-");
}

export function encodeMemoCategory(dateIso: string): string {
  return `${MEMO_DATE_CATEGORY_PREFIX}${dateIso}`;
}

export function decodeMemoDateFromCategory(
  category: string | null | undefined,
  fallback: string
): string {
  if (category?.startsWith(MEMO_DATE_CATEGORY_PREFIX)) {
    return category.slice(MEMO_DATE_CATEGORY_PREFIX.length);
  }
  return fallback;
}

export function buildBoardPostTitle(caseNumber: string, content: string): string {
  const preview = content.trim().split("\n")[0].slice(0, 60);
  if (caseNumber) {
    return `[${caseNumber}] ${preview || "사건 메모"}`;
  }
  return preview || "사건 메모";
}

export function postRecordToTimeline(post: PostRecord): Timeline {
  return boardPostToTimeline({
    id: post.numId,
    subject: post.title,
    content: post.content,
    author: post.authorName,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    hit: post.viewCount,
    commentCount: post.commentCount,
    category: post.category ?? undefined,
    caseId: post.caseId ?? undefined,
    caseType: post.caseType ?? undefined,
  });
}

export function boardPostToTimeline(post: BoardPost & { caseId?: string }): Timeline {
  return {
    id: boardMemoId(post.id),
    caseId: post.caseId ?? "",
    type: "memo",
    title: post.subject.replace(/^\[[^\]]+\]\s*/, "") || "상담/업무 메모",
    content: post.content,
    authorId: "board",
    authorName: post.author,
    date: decodeMemoDateFromCategory(post.category, post.updatedAt),
  };
}

export function timelineToBoardPayload(
  memo: Timeline,
  caseItem?: CaseItem | null
): {
  title: string;
  content: string;
  category: string;
  caseId: string;
  caseType?: string;
  authorName: string;
} {
  const caseNumber = caseItem?.caseNumber ?? "";
  return {
    title: buildBoardPostTitle(caseNumber, memo.content),
    content: memo.content,
    category: encodeMemoCategory(memo.date),
    caseId: memo.caseId,
    caseType: caseItem?.caseType,
    authorName: memo.authorName || "담당자",
  };
}

export function mergeCaseMemos(
  boardMemos: Timeline[],
  localMemos: Timeline[]
): Timeline[] {
  const courtSync = localMemos.filter((m) => isCourtSyncMemoId(m.id));
  const pendingLocal = localMemos.filter(
    (m) => isPendingLocalMemoId(m.id) && !isCourtSyncMemoId(m.id)
  );
  const boardIds = new Set(boardMemos.map((m) => m.id));
  const orphans = pendingLocal.filter((m) => !boardIds.has(m.id));
  return [...courtSync, ...boardMemos, ...orphans].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
