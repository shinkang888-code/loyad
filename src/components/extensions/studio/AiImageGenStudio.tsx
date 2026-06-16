// filepath: src/components/extensions/studio/AiImageGenStudio.tsx
"use client";

import { useState } from "react";
import { Sparkles, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export function AiImageGenStudio() {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16">("16:9");
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("프롬프트를 입력하세요.");
      return;
    }
    setLoading(true);
    setImageUrl(null);
    try {
      const res = await fetch("/api/ai/image-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt, aspectRatio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "생성 실패");
      setImageUrl(`data:${data.mimeType};base64,${data.imageBase64}`);
      toast.success(`이미지 생성 완료 (${data.model})`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "이미지 생성 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-violet-700">
        <Sparkles size={18} />
        <p className="text-sm">
          imaginAIry 패턴 · Gemini Imagen — 로펌·마케팅용 이미지를 프롬프트로 생성합니다.
        </p>
      </div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={4}
        placeholder="예: 현대적인 법률 사무소 로비, 따뜻한 조명, 전문적인 분위기"
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs text-text-muted">비율</label>
        {(["1:1", "16:9", "9:16"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setAspectRatio(r)}
            className={`px-3 py-1 rounded-lg text-xs border ${
              aspectRatio === r
                ? "border-primary-500 bg-primary-50 text-primary-700"
                : "border-slate-200 text-slate-600"
            }`}
          >
            {r}
          </button>
        ))}
        <Button onClick={handleGenerate} disabled={loading} className="ml-auto gap-2">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          생성
        </Button>
      </div>
      {imageUrl && (
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Generated" className="max-w-full rounded-lg mx-auto" />
          <a
            href={imageUrl}
            download="loyad-generated.png"
            className="inline-flex items-center gap-1 mt-2 text-xs text-primary-600 hover:underline"
          >
            <Download size={14} /> 다운로드
          </a>
        </div>
      )}
    </div>
  );
}
