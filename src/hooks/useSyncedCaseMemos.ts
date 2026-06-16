"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { mockTimeline } from "@/lib/mockData";
import {
  getInitialMemosFromMock,
  readCaseMemosForCase,
  subscribeCaseMemoChanges,
  type CaseMemosMap,
} from "@/lib/caseScopedStorage";
import {
  loadAndCacheCaseMemos,
  saveCaseMemosWithBoardSync,
} from "@/lib/caseMemoClient";
import type { CaseItem, Timeline } from "@/lib/types";

type Options = {
  caseItem?: CaseItem | null;
  mockSeed?: CaseMemosMap;
};

export function useSyncedCaseMemos(caseId: string | null | undefined, options: Options = {}) {
  const mockSeed = useMemo(
    () => options.mockSeed ?? getInitialMemosFromMock(mockTimeline),
    [options.mockSeed]
  );
  const [memos, setMemos] = useState<Timeline[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const reload = useCallback(async () => {
    if (!caseId) {
      setMemos([]);
      return;
    }
    setLoading(true);
    try {
      const merged = await loadAndCacheCaseMemos(caseId, mockSeed);
      setMemos(merged);
    } catch {
      setMemos(readCaseMemosForCase(caseId, mockSeed));
    } finally {
      setLoading(false);
    }
  }, [caseId, mockSeed]);

  const updateMemos = useCallback(
    async (next: Timeline[]) => {
      if (!caseId) return;
      const previous = memos;
      setMemos(next);
      setSyncing(true);
      try {
        const synced = await saveCaseMemosWithBoardSync(
          caseId,
          previous,
          next,
          mockSeed,
          options.caseItem
        );
        setMemos(synced);
      } catch {
        await reload();
        throw new Error("메모 동기화에 실패했습니다.");
      } finally {
        setSyncing(false);
      }
    },
    [caseId, memos, mockSeed, options.caseItem, reload]
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!caseId) return;
    return subscribeCaseMemoChanges((changedCaseId) => {
      if (changedCaseId && changedCaseId !== caseId) return;
      void reload();
    });
  }, [caseId, reload]);

  useEffect(() => {
    if (!caseId) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [caseId, reload]);

  return { memos, setMemos, updateMemos, reload, loading, syncing };
}
