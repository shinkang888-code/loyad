// filepath: src/components/dashboard/ExtensionHub.tsx
"use client";

import Link from "next/link";
import { Puzzle, ArrowRight, Plus } from "lucide-react";
import { useExtensions } from "@/hooks/useExtensions";

const ICON_EMOJI: Record<string, string> = {
  ai_image_gen: "🎨",
  image_optimize: "📦",
  image_convert: "🔄",
  image_viewer: "🖼️",
  voice_studio: "🎙️",
  marketing_harness: "📣",
  law_mcp: "⚖️",
  dart_reports: "📊",
};

export function ExtensionHub() {
  const { active, loading } = useExtensions();

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4 text-sm text-text-muted">
        확장 로딩 중…
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Puzzle size={16} className="text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-800">콘텐츠 확장 스튜디오</h2>
        </div>
        <Link
          href="/admin/extensions"
          className="text-xs text-primary-600 hover:underline flex items-center gap-1"
        >
          <Plus size={12} /> 확장 관리
        </Link>
      </div>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2">
        {active.slice(0, 8).map((ext) => (
          <Link
            key={ext.id}
            href={ext.href}
            className="flex flex-col gap-1 p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors min-h-[72px]"
          >
            <span className="text-lg leading-none">{ICON_EMOJI[ext.id] ?? "🧩"}</span>
            <span className="text-xs font-semibold text-slate-800 leading-tight">{ext.name}</span>
            <span className="text-[10px] text-text-muted line-clamp-2">{ext.description}</span>
          </Link>
        ))}
      </div>
      {active.length === 0 && (
        <p className="px-4 pb-4 text-xs text-text-muted">
          설치된 확장이 없습니다.{" "}
          <Link href="/admin/extensions" className="text-primary-600 hover:underline">
            확장 관리
          </Link>
          에서 추가하세요.
        </p>
      )}
      {active.length > 8 && (
        <div className="px-4 pb-3">
          <Link href="/admin/extensions" className="text-xs text-primary-600 flex items-center gap-1">
            +{active.length - 8}개 더 보기 <ArrowRight size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}
