// filepath: src/components/extensions/studio/DartReportsStudio.tsx
"use client";

import { useEffect, useState } from "react";
import { BarChart3, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

type CorpItem = { corpCode: string; corpName: string; stockCode?: string };

export function DartReportsStudio() {
  const [corpName, setCorpName] = useState("삼성전자");
  const [bsnsYear, setBsnsYear] = useState(String(new Date().getFullYear() - 1));
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [corpIndex, setCorpIndex] = useState<CorpItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [disclosures, setDisclosures] = useState<unknown>(null);
  const [financial, setFinancial] = useState<unknown>(null);

  useEffect(() => {
    fetch("/api/extensions/dart-reports")
      .then((r) => r.json())
      .then((d) => {
        setConfigured(d.configured);
        setCorpIndex(d.corpIndex ?? []);
      })
      .catch(() => setConfigured(false));
  }, []);

  const runAction = async (action: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/extensions/dart-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, corpName, bsnsYear }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "조회 실패");
      if (action === "financial") setFinancial(data.financial);
      else setDisclosures(data);
      toast.success("DART 조회 완료");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-blue-700">
        <BarChart3 size={18} />
        <p className="text-sm">dartlab 패턴 · OpenDART 공시·재무 요약</p>
      </div>

      {configured === false && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          OPENDART_API_KEY 미설정 — opendart.fss.or.kr에서 발급 후 Vercel env에 등록하세요.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {corpIndex.slice(0, 6).map((c) => (
          <button
            key={c.corpCode}
            type="button"
            onClick={() => setCorpName(c.corpName)}
            className="px-2 py-1 text-xs border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            {c.corpName}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input
          value={corpName}
          onChange={(e) => setCorpName(e.target.value)}
          placeholder="회사명·종목코드·corp_code"
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          value={bsnsYear}
          onChange={(e) => setBsnsYear(e.target.value)}
          placeholder="사업연도"
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => runAction("disclosures")} disabled={loading} variant="outline" className="gap-2">
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          공시 목록
        </Button>
        <Button onClick={() => runAction("financial")} disabled={loading} className="gap-2">
          재무 요약
        </Button>
        <Button onClick={() => runAction("company")} disabled={loading} variant="ghost">
          회사 개요
        </Button>
      </div>

      {disclosures != null && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">공시 목록</h3>
          {((disclosures as { items?: { reportName?: string; receiptDate?: string; url?: string }[] }).items ?? []).map(
            (item, i) => (
              <div key={i} className="text-xs border border-slate-100 rounded-lg px-3 py-2 flex justify-between gap-2">
                <span>
                  {item.reportName} ({item.receiptDate})
                </span>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 shrink-0">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            )
          )}
        </div>
      )}

      {financial != null && (
        <pre className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-auto max-h-64">
          {JSON.stringify(financial, null, 2)}
        </pre>
      )}
    </div>
  );
}
