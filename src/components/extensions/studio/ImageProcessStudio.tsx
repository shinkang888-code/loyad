// filepath: src/components/extensions/studio/ImageProcessStudio.tsx
"use client";

import { useState, useRef } from "react";
import { Upload, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

type Mode = "optimize" | "convert";

export function ImageProcessStudio({ mode }: { mode: Mode }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    url: string;
    originalSize: number;
    outputSize: number;
  } | null>(null);

  const title =
    mode === "optimize"
      ? "ImageOptim 패턴 — 용량 최적화 (WebP/AVIF/JPEG)"
      : "ImageMagick 패턴 — 포맷 변환·리사이즈";

  const handleFile = async (file: File) => {
    setLoading(true);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("action", mode);
    fd.append("format", mode === "optimize" ? "webp" : "jpeg");
    fd.append("quality", "82");
    fd.append("maxWidth", "1920");
    try {
      const res = await fetch("/api/extensions/image-process", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "처리 실패");
      setResult({
        url: `data:${data.mimeType};base64,${data.imageBase64}`,
        originalSize: data.originalSize,
        outputSize: data.outputSize,
      });
      const saved = Math.round((1 - data.outputSize / data.originalSize) * 100);
      toast.success(`처리 완료 (${saved > 0 ? `${saved}% 절감` : "변환됨"})`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "처리 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{title}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={loading} className="gap-2">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        이미지 선택
      </Button>
      {result && (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">
            {(result.originalSize / 1024).toFixed(0)} KB → {(result.outputSize / 1024).toFixed(0)} KB
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.url} alt="Processed" className="max-w-md rounded-lg border" />
          <a href={result.url} download="loyad-processed.webp" className="text-xs text-primary-600 flex items-center gap-1">
            <Download size={14} /> 다운로드
          </a>
        </div>
      )}
    </div>
  );
}
