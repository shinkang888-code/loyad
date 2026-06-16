// filepath: src/components/extensions/studio/MarketingHarnessStudio.tsx
"use client";

import { useState } from "react";
import { Loader2, Megaphone, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

type Channel = "blog" | "sns" | "ad" | "email";

const CHANNELS: { id: Channel; label: string }[] = [
  { id: "blog", label: "블로그" },
  { id: "sns", label: "SNS" },
  { id: "ad", label: "광고" },
  { id: "email", label: "이메일" },
];

export function MarketingHarnessStudio() {
  const [topic, setTopic] = useState("");
  const [channel, setChannel] = useState<Channel>("blog");
  const [audience, setAudience] = useState("잠재 의뢰인");
  const [loading, setLoading] = useState(false);
  const [pack, setPack] = useState<Record<string, unknown> | null>(null);

  const handleRun = async () => {
    if (!topic.trim()) {
      toast.error("주제를 입력하세요.");
      return;
    }
    setLoading(true);
    setPack(null);
    try {
      const res = await fetch("/api/extensions/marketing-harness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ topic, channel, audience }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "생성 실패");
      setPack(data.pack ?? null);
      toast.success("마케팅 harness 생성 완료");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setLoading(false);
    }
  };

  const copyAll = () => {
    if (!pack) return;
    void navigator.clipboard.writeText(JSON.stringify(pack, null, 2));
    toast.success("클립보드에 복사했습니다.");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-orange-700">
        <Megaphone size={18} />
        <p className="text-sm">ah-my-marketing · Gemini 멀티채널 마케팅 harness</p>
      </div>

      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="예: 상속·유언장 작성 상담 안내"
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
      />

      <input
        value={audience}
        onChange={(e) => setAudience(e.target.value)}
        placeholder="타깃 독자"
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
      />

      <div className="flex flex-wrap gap-2">
        {CHANNELS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChannel(c.id)}
            className={`px-3 py-1.5 rounded-lg text-xs border ${
              channel === c.id
                ? "border-orange-500 bg-orange-50 text-orange-800"
                : "border-slate-200 text-slate-600"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <Button onClick={handleRun} disabled={loading} className="gap-2">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />}
        harness 실행
      </Button>

      {pack && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold">{String(pack.title ?? topic)}</h3>
            <button type="button" onClick={copyAll} className="text-xs text-primary-600 flex items-center gap-1">
              <Copy size={14} /> 복사
            </button>
          </div>
          {typeof pack.body === "string" && (
            <div className="text-sm whitespace-pre-wrap bg-slate-50 border border-slate-200 rounded-xl p-4">
              {pack.body}
            </div>
          )}
          {Array.isArray(pack.hashtags) && pack.hashtags.length > 0 && (
            <p className="text-xs text-text-muted">{(pack.hashtags as string[]).map((h) => `#${h}`).join(" ")}</p>
          )}
          {typeof pack.cta === "string" && pack.cta && (
            <p className="text-xs font-medium text-primary-700">CTA: {pack.cta}</p>
          )}
        </div>
      )}
    </div>
  );
}
