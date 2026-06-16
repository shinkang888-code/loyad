// filepath: src/components/extensions/studio/VoiceStudio.tsx
"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Mic, Pause, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

const STYLES = ["전문적이고 따뜻한", "친근한 설명", "뉴스 앵커", "팟캐스트 호스트"];

export function VoiceStudio() {
  const [raw, setRaw] = useState("");
  const [script, setScript] = useState("");
  const [style, setStyle] = useState(STYLES[0]);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const handlePolish = async () => {
    if (!raw.trim()) {
      toast.error("원문을 입력하세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/extensions/voice-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: raw, style }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "대본 생성 실패");
      setScript(data.script ?? "");
      toast.success("나레이션 대본 생성 완료");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "대본 생성 실패");
    } finally {
      setLoading(false);
    }
  };

  const stopSpeech = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const handleSpeak = () => {
    const text = (script || raw).trim();
    if (!text) {
      toast.error("재생할 대본이 없습니다.");
      return;
    }
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast.error("브라우저 TTS를 지원하지 않습니다.");
      return;
    }

    if (speaking) {
      stopSpeech();
      return;
    }

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ko-KR";
    utter.rate = 0.95;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
    toast.success("브라우저 TTS 재생 중 (Gemini 대본 + Web Speech API)");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-violet-700">
        <Mic size={18} />
        <p className="text-sm">voice 리포 패턴 · Gemini 대본 + 브라우저 TTS 미리듣기</p>
      </div>

      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={5}
        placeholder="법률 칼럼·공지·상담 안내 원문을 입력하세요."
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-text-muted">톤</span>
        {STYLES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStyle(s)}
            className={`px-2 py-1 rounded-lg text-xs border ${
              style === s ? "border-violet-500 bg-violet-50 text-violet-800" : "border-slate-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handlePolish} disabled={loading} className="gap-2">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          AI 대본 생성
        </Button>
        <Button onClick={handleSpeak} variant="outline" className="gap-2">
          {speaking ? <Pause size={16} /> : <Play size={16} />}
          {speaking ? "정지" : "미리듣기"}
        </Button>
      </div>

      {script && (
        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          rows={8}
          className="w-full rounded-xl border border-violet-200 bg-violet-50/30 px-3 py-2 text-sm"
          placeholder="생성된 나레이션 대본"
        />
      )}
    </div>
  );
}
