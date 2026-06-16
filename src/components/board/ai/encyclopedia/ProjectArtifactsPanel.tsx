// filepath: src/components/board/ai/encyclopedia/ProjectArtifactsPanel.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, FileText, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

type Artifact = {
  id: string;
  source_feature: string;
  title: string;
  created_at: string;
};

const FEATURE_LABELS: Record<string, string> = {
  legal_encyclopedia: "법률백과",
  case_search: "판례추천",
  doc_summary: "PDF요약",
  doc_draft: "서면작성",
  law_search: "법령검색",
  ai_search: "AI검색",
};

type Props = {
  projectId: string | null;
  onArchived?: () => void;
};

export function ProjectArtifactsPanel({ projectId, onArchived }: Props) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const loadArtifacts = useCallback(async () => {
    if (!projectId) {
      setArtifacts([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/encyclopedia/projects/${projectId}`, { credentials: "include" });
      if (!res.ok) {
        setArtifacts([]);
        return;
      }
      const json = (await res.json()) as { artifacts?: Artifact[] };
      setArtifacts(Array.isArray(json.artifacts) ? json.artifacts : []);
    } catch {
      setArtifacts([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadArtifacts();
  }, [loadArtifacts]);

  const handleArchive = async () => {
    if (!projectId) return;
    if (!window.confirm("이 프로젝트를 보관 처리하시겠습니까?")) return;
    setArchiving(true);
    try {
      const res = await fetch(`/api/encyclopedia/projects/${projectId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive" }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "보관 처리에 실패했습니다.");
        return;
      }
      toast.success("프로젝트가 보관되었습니다.");
      onArchived?.();
    } catch {
      toast.error("보관 처리 중 오류가 발생했습니다.");
    } finally {
      setArchiving(false);
    }
  };

  if (!projectId) return null;

  return (
    <div className="mt-4 bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-primary-600" />
          <h3 className="text-sm font-semibold text-slate-800">프로젝트 산출물</h3>
          <span className="text-xs text-text-muted bg-slate-100 rounded-full px-2 py-0.5">
            {artifacts.length}건
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void loadArtifacts()}
            disabled={loading}
            leftIcon={loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          >
            새로고침
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleArchive()}
            disabled={archiving}
            leftIcon={archiving ? <Loader2 size={12} className="animate-spin" /> : <Archive size={12} />}
          >
            보관
          </Button>
        </div>
      </div>
      <div className="divide-y divide-slate-50 max-h-48 overflow-y-auto">
        {loading && artifacts.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-text-muted">불러오는 중…</div>
        ) : artifacts.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-text-muted">
            AI 기능으로 생성한 산출물이 여기에 표시됩니다.
          </div>
        ) : (
          artifacts.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-[10px] font-medium text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded shrink-0">
                {FEATURE_LABELS[a.source_feature] ?? a.source_feature}
              </span>
              <span className="text-sm text-slate-800 truncate flex-1">{a.title}</span>
              <span className="text-[10px] text-text-muted shrink-0">
                {new Date(a.created_at).toLocaleDateString("ko-KR")}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
