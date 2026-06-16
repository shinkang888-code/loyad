"use client";

import { useSearchParams } from "next/navigation";
import { CaseMemoTab } from "@/components/cases/CaseMemoTab";
import { CaseQuickPopupShell } from "@/components/cases/CaseQuickPopupShell";
import { useCaseItemById } from "@/hooks/useCaseItemById";
import { useSyncedCaseMemos } from "@/hooks/useSyncedCaseMemos";
import { usePageTabTitle } from "@/lib/tabTitle";

export default function CaseMemoPopupPage() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId");
  const caseNumberParam = searchParams.get("caseNumber") ?? "";
  const { caseItem, loading } = useCaseItemById(caseId);
  const { memos, updateMemos, syncing } = useSyncedCaseMemos(caseId, { caseItem });

  const caseNumber = caseItem?.caseNumber ?? caseNumberParam;
  usePageTabTitle(caseNumber ? `메모장 · ${caseNumber}` : "메모장");

  return (
    <CaseQuickPopupShell title="메모장" caseNumber={caseNumber || undefined}>
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-500">
          사건 정보를 불러오는 중…
        </div>
      ) : !caseItem ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-500">
          사건을 찾을 수 없습니다.
        </div>
      ) : (
        <CaseMemoTab
          caseItem={caseItem}
          memos={memos}
          onMemosChange={updateMemos}
          syncing={syncing}
        />
      )}
    </CaseQuickPopupShell>
  );
}
