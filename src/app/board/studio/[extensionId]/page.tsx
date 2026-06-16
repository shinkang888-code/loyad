// filepath: src/app/board/studio/[extensionId]/page.tsx
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getExtensionById } from "@/lib/extensions/catalog";
import { AiImageGenStudio } from "@/components/extensions/studio/AiImageGenStudio";
import { ImageProcessStudio } from "@/components/extensions/studio/ImageProcessStudio";
import { ImageViewerStudio } from "@/components/extensions/studio/ImageViewerStudio";
import { ExtensionPlaceholderStudio } from "@/components/extensions/studio/ExtensionPlaceholderStudio";
import { LawMcpStudio } from "@/components/extensions/studio/LawMcpStudio";
import { DartReportsStudio } from "@/components/extensions/studio/DartReportsStudio";
import { VoiceStudio } from "@/components/extensions/studio/VoiceStudio";
import { MarketingHarnessStudio } from "@/components/extensions/studio/MarketingHarnessStudio";

function StudioBody({ extensionId }: { extensionId: string }) {
  switch (extensionId) {
    case "ai_image_gen":
      return <AiImageGenStudio />;
    case "image_optimize":
      return <ImageProcessStudio mode="optimize" />;
    case "image_convert":
      return <ImageProcessStudio mode="convert" />;
    case "image_viewer":
      return <ImageViewerStudio />;
    case "law_mcp":
      return <LawMcpStudio />;
    case "dart_reports":
      return <DartReportsStudio />;
    case "voice_studio":
      return <VoiceStudio />;
    case "marketing_harness":
      return <MarketingHarnessStudio />;
    default: {
      const ext = getExtensionById(extensionId);
      if (ext) return <ExtensionPlaceholderStudio ext={ext} />;
      return <p className="text-sm text-danger-600">확장을 찾을 수 없습니다.</p>;
    }
  }
}

export default function ExtensionStudioPage() {
  const params = useParams();
  const extensionId = String(params.extensionId ?? "");
  const ext = getExtensionById(extensionId);

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
      >
        <ArrowLeft size={14} /> 대시보드
      </Link>
      <header>
        <h1 className="text-xl font-bold text-slate-900">{ext?.name ?? "콘텐츠 스튜디오"}</h1>
        {ext?.sourceRepo && (
          <p className="text-xs text-text-muted mt-1">
            {ext.sourceRepo.owner}/{ext.sourceRepo.name}
            {ext.sourceRepo.stars ? ` · ★ ${ext.sourceRepo.stars.toLocaleString()}` : ""}
          </p>
        )}
      </header>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4 md:p-6">
        <StudioBody extensionId={extensionId} />
      </div>
    </div>
  );
}
