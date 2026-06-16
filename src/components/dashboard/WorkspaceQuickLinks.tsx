// filepath: src/components/dashboard/WorkspaceQuickLinks.tsx
"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { AI_FEATURES } from "@/lib/boardConfig";

const FEATURE_ICONS: Record<string, string> = {
  legal_encyclopedia: "📚",
  case_search: "⚖️",
  doc_summary: "📄",
  doc_draft: "✍️",
  law_search: "🔍",
  ai_search: "🤖",
};

export function WorkspaceQuickLinks() {
  const features = AI_FEATURES.slice(0, 4);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-violet-600" />
          <h2 className="text-sm font-semibold text-slate-800">AI 콘텐츠 워크스페이스</h2>
        </div>
        <Link
          href="/board"
          className="text-xs text-primary-600 hover:underline flex items-center gap-1"
        >
          전체 보기 <ArrowRight size={12} />
        </Link>
      </div>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {features.map((f) => (
          <Link
            key={f.id}
            href={`/board/ai/${f.id}`}
            className="flex flex-col gap-1 p-3 rounded-xl border border-slate-100 hover:border-primary-200 hover:bg-primary-50/40 transition-colors min-h-[72px]"
          >
            <span className="text-lg leading-none">{FEATURE_ICONS[f.id] ?? "📋"}</span>
            <span className="text-xs font-semibold text-slate-800 leading-tight">{f.name}</span>
            <span className="text-[10px] text-text-muted line-clamp-2">{f.description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
