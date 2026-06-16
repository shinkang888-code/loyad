// filepath: src/app/admin/extensions/page.tsx
"use client";

import Link from "next/link";
import { ArrowLeft, Puzzle, Check, Plus, Trash2 } from "lucide-react";
import { useExtensions } from "@/hooks/useExtensions";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export default function AdminExtensionsPage() {
  const { catalog, installedIds, loading, reload } = useExtensions();

  const toggle = async (extensionId: string, install: boolean) => {
    try {
      const res = await fetch("/api/admin/extensions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: install ? "install" : "uninstall",
          extensionId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "실패");
      toast.success(install ? "확장을 설치했습니다." : "확장을 제거했습니다.");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "처리 실패");
    }
  };

  const byCategory = catalog.reduce<Record<string, typeof catalog>>((acc, ext) => {
    const k = ext.category;
    if (!acc[k]) acc[k] = [];
    acc[k].push(ext);
    return acc;
  }, {});

  const categoryLabel: Record<string, string> = {
    ai_content: "AI 콘텐츠",
    image: "이미지",
    media: "미디어",
    marketing: "마케팅",
    integration: "연동",
    document: "문서",
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <Link href="/admin" className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline">
        <ArrowLeft size={14} /> 관리자
      </Link>
      <header className="flex items-center gap-2">
        <Puzzle size={22} className="text-emerald-600" />
        <div>
          <h1 className="text-xl font-bold">확장 관리</h1>
          <p className="text-sm text-text-muted">GitHub 리포 기반 콘텐츠·미디어 도구를 메뉴에 설치합니다.</p>
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-text-muted">불러오는 중…</p>
      ) : (
        Object.entries(byCategory).map(([cat, items]) => (
          <section key={cat} className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">{categoryLabel[cat] ?? cat}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((ext) => {
                const on = installedIds.has(ext.id);
                return (
                  <div
                    key={ext.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{ext.name}</p>
                        <p className="text-xs text-text-muted mt-1">{ext.description}</p>
                      </div>
                      {on && (
                        <span className="shrink-0 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <Check size={10} /> 설치됨
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {ext.sourceRepo.owner}/{ext.sourceRepo.name}
                    </p>
                    <div className="flex gap-2 mt-auto pt-2">
                      {on ? (
                        <>
                          <Link href={ext.href} className="text-xs text-primary-600 hover:underline">
                            열기
                          </Link>
                          {!ext.defaultInstalled && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 text-danger-600"
                              onClick={() => void toggle(ext.id, false)}
                            >
                              <Trash2 size={12} className="mr-1" /> 제거
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => void toggle(ext.id, true)}>
                          <Plus size={12} /> 설치
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
