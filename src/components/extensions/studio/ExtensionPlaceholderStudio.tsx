// filepath: src/components/extensions/studio/ExtensionPlaceholderStudio.tsx
"use client";

import Link from "next/link";
import type { ExtensionDefinition } from "@/lib/extensions/types";

export function ExtensionPlaceholderStudio({ ext }: { ext: ExtensionDefinition }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center space-y-3">
      <p className="text-sm font-medium text-slate-800">{ext.name}</p>
      <p className="text-xs text-text-muted max-w-md mx-auto">{ext.description}</p>
      <p className="text-xs text-slate-500">
        근거 리포:{" "}
        <a
          href={`https://github.com/${ext.sourceRepo.owner}/${ext.sourceRepo.name}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 hover:underline"
        >
          {ext.sourceRepo.owner}/{ext.sourceRepo.name}
        </a>
      </p>
      <p className="text-xs text-amber-700">Phase 6 로드맵 — MCP·외부 API 연동 예정</p>
      <Link href="/admin/extensions" className="text-xs text-primary-600 hover:underline">
        ← 확장 관리
      </Link>
    </div>
  );
}
