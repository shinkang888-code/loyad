/**
 * 사건 메모장 ↔ 사건메모 게시판 클라이언트 동기화
 */

import {
  isBoardSyncedMemoId,
  isCourtSyncMemoId,
  isPendingLocalMemoId,
  mergeCaseMemos,
  parseBoardMemoNumId,
} from "./caseMemoBoardSync";
import {
  type CaseMemosMap,
  persistCaseMemos,
  readCaseMemosForCase,
} from "./caseScopedStorage";
import type { CaseItem, Timeline } from "./types";

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const json = (await res.json()) as { success?: boolean; error?: string; data?: T };
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `요청 실패 (${res.status})`);
  }
  return json.data as T;
}

export async function fetchBoardMemosForCase(caseId: string): Promise<Timeline[]> {
  return apiFetch<Timeline[]>(`/api/case-memos?caseId=${encodeURIComponent(caseId)}`);
}

export async function reloadCaseMemosFromServer(
  caseId: string,
  mockSeed: CaseMemosMap
): Promise<Timeline[]> {
  const local = readCaseMemosForCase(caseId, mockSeed);
  try {
    const boardMemos = await fetchBoardMemosForCase(caseId);
    return mergeCaseMemos(boardMemos, local);
  } catch {
    return local;
  }
}

async function createBoardMemo(
  memo: Timeline,
  caseItem?: CaseItem | null
): Promise<Timeline> {
  return apiFetch<Timeline>("/api/case-memos", {
    method: "POST",
    body: JSON.stringify({
      caseId: memo.caseId,
      content: memo.content,
      date: memo.date,
      caseNumber: caseItem?.caseNumber,
      caseType: caseItem?.caseType,
      authorName: memo.authorName,
    }),
  });
}

async function updateBoardMemo(
  memo: Timeline,
  caseItem?: CaseItem | null
): Promise<Timeline> {
  return apiFetch<Timeline>("/api/case-memos", {
    method: "PATCH",
    body: JSON.stringify({
      id: memo.id,
      content: memo.content,
      date: memo.date,
      caseNumber: caseItem?.caseNumber,
    }),
  });
}

async function deleteBoardMemo(memoId: string): Promise<void> {
  await apiFetch(`/api/case-memos?id=${encodeURIComponent(memoId)}`, { method: "DELETE" });
}

/** 이전·다음 메모 목록 diff 후 게시판과 동기화 */
export async function syncCaseMemosChange(
  caseId: string,
  previous: Timeline[],
  next: Timeline[],
  caseItem?: CaseItem | null
): Promise<Timeline[]> {
  const prevById = new Map(previous.map((m) => [m.id, m]));
  const nextById = new Map(next.map((m) => [m.id, m]));
  let result = [...next];

  for (const prev of previous) {
    if (!nextById.has(prev.id) && isBoardSyncedMemoId(prev.id)) {
      await deleteBoardMemo(prev.id);
    }
  }

  for (let i = 0; i < result.length; i++) {
    const memo = result[i];
    if (isCourtSyncMemoId(memo.id)) continue;

    const prev = prevById.get(memo.id);
    if (isPendingLocalMemoId(memo.id) && !prev) {
      const created = await createBoardMemo(memo, caseItem);
      result = result.map((m) => (m.id === memo.id ? created : m));
      continue;
    }

    if (isBoardSyncedMemoId(memo.id) && prev) {
      if (prev.content !== memo.content || prev.date !== memo.date) {
        const updated = await updateBoardMemo(memo, caseItem);
        result = result.map((m) => (m.id === memo.id ? updated : m));
      }
    }
  }

  return result;
}

/** 서버·로컬 병합 후 localStorage 캐시 갱신 */
export async function loadAndCacheCaseMemos(
  caseId: string,
  mockSeed: CaseMemosMap
): Promise<Timeline[]> {
  const merged = await reloadCaseMemosFromServer(caseId, mockSeed);
  persistCaseMemos(caseId, merged, mockSeed);
  return merged;
}

/** 변경 저장: 게시판 동기화 → localStorage 캐시 */
export async function saveCaseMemosWithBoardSync(
  caseId: string,
  previous: Timeline[],
  next: Timeline[],
  mockSeed: CaseMemosMap,
  caseItem?: CaseItem | null
): Promise<Timeline[]> {
  const synced = await syncCaseMemosChange(caseId, previous, next, caseItem);
  persistCaseMemos(caseId, synced, mockSeed);
  return synced;
}

export function isBoardMemoId(id: string): boolean {
  return parseBoardMemoNumId(id) !== null;
}
