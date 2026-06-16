/**
 * 한국법 MCP 도구 — korean-law-mcp TOOL_SPECS 기반 Loyad 네이티브 실행
 */

import { fetchLawArticleContent } from "@/lib/lawGoKrArticle";
import { getLawGoKrOc } from "@/lib/lawOpenApiSettings";
import { buildLawGoKrLawSearchUrl } from "@/lib/lawLinks";
import { buildPrecedentLawGoKrSearchUrl } from "@/lib/precedentLinks";

const DRF = "http://www.law.go.kr/DRF";
const TIMEOUT = 12_000;

export type LawMcpToolId =
  | "search_law"
  | "get_law_article"
  | "search_precedents"
  | "search_interpretations"
  | "external_links";

export type LawMcpToolMeta = {
  id: LawMcpToolId;
  name: string;
  description: string;
  params: string[];
};

export const LAW_MCP_TOOLS: LawMcpToolMeta[] = [
  {
    id: "search_law",
    name: "법령 검색",
    description: "법령명으로 국가법령정보 검색 (search_law)",
    params: ["query", "maxResults?"],
  },
  {
    id: "get_law_article",
    name: "조문 원문",
    description: "법령 조문 본문 조회 (get_law_article)",
    params: ["lawName", "articleNo", "articleSub?"],
  },
  {
    id: "search_precedents",
    name: "판례 검색",
    description: "키워드·법원별 판례 검색 (search_precedents)",
    params: ["query", "court?", "display?"],
  },
  {
    id: "search_interpretations",
    name: "법령해석례",
    description: "법령해석례 검색 (search_interpretations)",
    params: ["query", "display?"],
  },
  {
    id: "external_links",
    name: "외부 링크",
    description: "law.go.kr 검색 URL 생성",
    params: ["query", "type?"],
  },
];

async function drfJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT) });
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, unknown>;
    if (json.result && String(json.result).includes("실패")) return null;
    return json;
  } catch {
    return null;
  }
}

function rows(node: unknown): Record<string, unknown>[] {
  if (!node) return [];
  return Array.isArray(node) ? (node as Record<string, unknown>[]) : [node as Record<string, unknown>];
}

export async function executeLawMcpTool(
  tool: LawMcpToolId,
  params: Record<string, unknown>
): Promise<{ ok: boolean; tool: string; data?: unknown; error?: string }> {
  const oc = await getLawGoKrOc();

  switch (tool) {
    case "search_law": {
      const query = String(params.query ?? "").trim();
      if (!query) return { ok: false, tool, error: "query 필요" };
      if (!oc) {
        return {
          ok: true,
          tool,
          data: {
            items: [],
            externalUrl: buildLawGoKrLawSearchUrl(query),
            hint: "LAW_GO_KR_OC 미설정 — 관리자 > 국가법령정보 API에서 OC를 설정하세요.",
          },
        };
      }
      const max = Math.min(Number(params.maxResults) || 10, 30);
      const url = `${DRF}/lawSearch.do?OC=${encodeURIComponent(oc)}&target=law&type=JSON&query=${encodeURIComponent(query)}&display=${max}`;
      const json = await drfJson(url);
      const lawNode = (json?.LawSearch as Record<string, unknown> | undefined)?.law;
      const items = rows(lawNode).map((r) => ({
        lawId: r.법령ID ?? r.lawId,
        name: r.법령명한글 ?? r.law_name,
        type: r.법령구분명,
        effectiveDate: r.시행일자,
      }));
      return { ok: true, tool, data: { items, count: items.length } };
    }

    case "get_law_article": {
      const lawName = String(params.lawName ?? params.law ?? "").trim();
      const articleNo = String(params.articleNo ?? "").trim();
      const articleSub = params.articleSub != null ? String(params.articleSub).trim() : undefined;
      if (!lawName || !articleNo) return { ok: false, tool, error: "lawName, articleNo 필요" };
      const result = await fetchLawArticleContent({ lawName, articleNo, articleSub, oc });
      return {
        ok: result.ok,
        tool,
        data: {
          source: result.source,
          html: result.html,
          text: result.text,
          externalUrl: result.externalUrl,
          embedUrl: result.embedUrl,
          error: result.error,
        },
      };
    }

    case "search_precedents": {
      const query = String(params.query ?? "").trim();
      if (!query) return { ok: false, tool, error: "query 필요" };
      if (!oc) {
        return {
          ok: true,
          tool,
          data: {
            items: [],
            externalUrl: buildPrecedentLawGoKrSearchUrl(query),
            hint: "LAW_GO_KR_OC 미설정",
          },
        };
      }
      const court = String(params.court ?? "").trim();
      const display = Math.min(Number(params.display) || 10, 30);
      let url = `${DRF}/lawSearch.do?OC=${encodeURIComponent(oc)}&target=prec&type=JSON&query=${encodeURIComponent(query)}&display=${display}`;
      if (court) url += `&org=${encodeURIComponent(court)}`;
      const json = await drfJson(url);
      const prec = (json?.PrecSearch as Record<string, unknown> | undefined)?.prec;
      const items = rows(prec).map((r) => ({
        caseNumber: r.사건번호 ?? r.caseNo,
        title: r.사건명 ?? r.caseName,
        court: r.법원명 ?? r.court,
        date: r.선고일자 ?? r.date,
        serial: r.판례일련번호,
      }));
      return { ok: true, tool, data: { items, count: items.length } };
    }

    case "search_interpretations": {
      const query = String(params.query ?? "").trim();
      if (!query) return { ok: false, tool, error: "query 필요" };
      if (!oc) return { ok: false, tool, error: "LAW_GO_KR_OC 미설정" };
      const display = Math.min(Number(params.display) || 10, 30);
      const url = `${DRF}/lawSearch.do?OC=${encodeURIComponent(oc)}&target=expCmnt&type=JSON&query=${encodeURIComponent(query)}&display=${display}`;
      const json = await drfJson(url);
      const node = (json?.ExpcSearch as Record<string, unknown> | undefined)?.expc;
      const items = rows(node).map((r) => ({
        serial: r.법령해석례일련번호,
        title: r.안건명 ?? r.title,
        date: r.회신일자,
        agency: r.회신기관명,
      }));
      return { ok: true, tool, data: { items, count: items.length } };
    }

    case "external_links": {
      const query = String(params.query ?? "").trim();
      const type = String(params.type ?? "law");
      if (!query) return { ok: false, tool, error: "query 필요" };
      const url =
        type === "prec" || type === "precedent"
          ? buildPrecedentLawGoKrSearchUrl(query)
          : buildLawGoKrLawSearchUrl(query);
      return { ok: true, tool, data: { url, type } };
    }

    default:
      return { ok: false, tool, error: "지원하지 않는 도구" };
  }
}
