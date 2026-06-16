"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BoardSettingsPanel } from "@/components/admin/BoardSettingsPanel";

export default function AdminSettingsBoardsPage() {
  return (
    <div className="space-y-4">
      <Link
        href="/admin/settings"
        className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-primary-600"
        aria-label="설정 목록으로"
      >
        <ArrowLeft size={18} />
        시스템 설정
      </Link>
      <BoardSettingsPanel showBackLink={false} />
    </div>
  );
}
