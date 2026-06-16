// filepath: src/components/layout/AiQuickLaunchBar.tsx
"use client";

import { AI_QUICK_LAUNCH, openAiFeatureWindow } from "@/lib/aiQuickLaunch";
import { cn } from "@/lib/utils";

type AiQuickLaunchBarProps = {
  /** 모바일: 아이콘만 */
  compact?: boolean;
  className?: string;
};

export function AiQuickLaunchBar({ compact, className }: AiQuickLaunchBarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 min-w-0",
        compact ? "overflow-x-auto scrollbar-thin pb-0.5" : "overflow-x-auto",
        className
      )}
      role="toolbar"
      aria-label="AI 문서엔진 빠른 실행"
    >
      {AI_QUICK_LAUNCH.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            title={`${item.name} (새 창)`}
            onClick={() => openAiFeatureWindow(item)}
            className={cn(
              "inline-flex items-center gap-1 shrink-0 rounded-lg border transition-colors",
              "border-slate-200 bg-white text-slate-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700",
              compact ? "flex-col px-2 py-1.5 min-w-[52px]" : "px-2 py-1.5 text-xs font-medium"
            )}
          >
            <Icon size={compact ? 16 : 14} className="text-primary-600 shrink-0" />
            <span
              className={cn(
                compact ? "text-[10px] leading-tight text-center" : "whitespace-nowrap hidden xl:inline"
              )}
            >
              {item.shortName}
            </span>
          </button>
        );
      })}
    </div>
  );
}
