// filepath: src/components/extensions/studio/ImageViewerStudio.tsx
"use client";

import { useState, useRef } from "react";
import { Images, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

/** ImageGlass 패턴 — 로컬 이미지 미리보기·줌 */
export function ImageViewerStudio() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [name, setName] = useState("");

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 flex items-center gap-2">
        <Images size={16} /> ImageGlass 패턴 — WEBP·AVIF·HEIC 등 브라우저 지원 포맷 미리보기
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (url) URL.revokeObjectURL(url);
          setUrl(URL.createObjectURL(f));
          setName(f.name);
          setZoom(100);
        }}
      />
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => inputRef.current?.click()}>
          파일 열기
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.min(z + 25, 300))}>
          <ZoomIn size={16} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.max(z - 25, 25))}>
          <ZoomOut size={16} />
        </Button>
        <span className="text-xs text-text-muted self-center">{zoom}%</span>
      </div>
      {url && (
        <div className="overflow-auto max-h-[480px] rounded-xl border bg-slate-900/5 p-4">
          <p className="text-xs text-text-muted mb-2">{name}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={name}
            style={{ width: `${zoom}%`, maxWidth: "none" }}
            className="mx-auto rounded shadow-sm"
          />
        </div>
      )}
    </div>
  );
}
