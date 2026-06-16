// filepath: src/components/extensions/studio/LawMcpStudio.tsx
"use client";

import { useState } from "react";
import { Loader2, Scale, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

type ToolId = "search_law" | "get_law_article" | "search_precedents" | "search_interpretations" | "external_links";

const TOOLS: { id: ToolId; label: string }[] = [
  { id: "search_law", label: "법령 검색" },
  { id: "get_law_article", label: "조문 원문" },
  { id: "search_precedents", label: "판례 검색" },
  { id: "search_interpretations", label: "법령해석례" },
  { id: "external_links", label: "외부 링크" },
];

export function LawMcpStudio() {
  const [tool, setTool] = useState<ToolId>("search_law");
  const [query, setQuery] = useState("");
  const [lawName, setLawName] = useState("민법");
  const [articleNo, setArticleNo] = useState("750");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  const buildParams = (): Record<string, unknown> => {
    switch (tool) {
      case "get_law_article":
        return { lawName, articleNo };
      case "external_links":
        return { query, type: "law" };
      default:
        return { query };
    }
  };

  const handleRun = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/extensions/law-mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tool, params: buildParams() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "실행 실패");
      setResult(data);
      toast.success("MCP 도구 실행 완료");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "실행 실패");
    } finally {
      setLoading(false);
    }
  };

  const data = result as { data?: Record<string, unknown> } | null;
  const externalUrl = data?.data?.externalUrl as string | undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-emerald-700">
        <Scale size={18} />
        <p className="text-sm">korean-law-mcp — 국가법령정보 Open API·웹 추출 연동</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTool(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs border ${
              tool === t.id
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : "border-slate-200 text-slate-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tool === "get_law_article" ? (
        <div className="grid grid-cols-2 gap-3">
          <input
            value={lawName}
            onChange={(e) => setLawName(e.target.value)}
            placeholder="법령명"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={articleNo}
            onChange={(e) => setArticleNo(e.target.value)}
            placeholder="조문번호"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      ) : (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tool === "search_precedents" ? "판례 키워드" : "검색어"}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
      )}

      <Button onClick={handleRun} disabled={loading} className="gap-2">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Scale size={16} />}
        실행
      </Button>

      {externalUrl && (
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
        >
          <ExternalLink size={14} /> law.go.kr에서 보기
        </a>
      )}

      {result != null && (
        <pre className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-auto max-h-96 whitespace-pre-wrap">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
