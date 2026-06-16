/**
 * OpenDART API — dartlab / vertical-mcp/dart-mcp 패턴
 * https://opendart.fss.or.kr
 */

const OPENDART_BASE = "https://opendart.fss.or.kr/api";

/** 주요 상장사 corp_code (CORPCODE.xml 일부 — 이름 검색용) */
export const DART_CORP_INDEX: { corpCode: string; corpName: string; stockCode?: string }[] = [
  { corpCode: "00126380", corpName: "삼성전자", stockCode: "005930" },
  { corpCode: "00164779", corpName: "SK하이닉스", stockCode: "000660" },
  { corpCode: "00258801", corpName: "카카오", stockCode: "035720" },
  { corpCode: "00266961", corpName: "NAVER", stockCode: "035420" },
  { corpCode: "00106641", corpName: "LG에너지솔루션", stockCode: "373220" },
  { corpCode: "00356361", corpName: "셀트리온", stockCode: "068270" },
  { corpCode: "00164742", corpName: "현대자동차", stockCode: "005380" },
  { corpCode: "00155276", corpName: "포스코홀딩스", stockCode: "005490" },
  { corpCode: "00401731", corpName: "LG화학", stockCode: "051910" },
  { corpCode: "00113410", corpName: "KB금융", stockCode: "105560" },
];

export function getOpenDartApiKey(): string {
  return (
    process.env.OPENDART_API_KEY?.trim() ||
    process.env.DART_API_KEY?.trim() ||
    process.env.OPEN_DART_API_KEY?.trim() ||
    ""
  );
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

async function dartGet(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const key = getOpenDartApiKey();
  if (!key) throw new Error("OPENDART_API_KEY 미설정 — opendart.fss.or.kr에서 발급 후 Vercel env에 등록");

  const qs = new URLSearchParams({ crtfc_key: key, ...params });
  const url = `${OPENDART_BASE}/${path}?${qs}`;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  const json = (await res.json()) as Record<string, unknown>;
  if (json.status && json.status !== "000") {
    throw new Error(String(json.message ?? `OpenDART 오류 (${json.status})`));
  }
  return json;
}

export function resolveCorpCode(input: string): string | null {
  const q = input.trim();
  if (/^\d{8}$/.test(q)) return q;
  if (/^\d{6}$/.test(q)) {
    const hit = DART_CORP_INDEX.find((c) => c.stockCode === q);
    return hit?.corpCode ?? null;
  }
  const lower = q.toLowerCase();
  const hit = DART_CORP_INDEX.find(
    (c) =>
      c.corpName.includes(q) ||
      c.corpName.toLowerCase().includes(lower) ||
      c.corpName.replace(/\s/g, "") === q.replace(/\s/g, "")
  );
  return hit?.corpCode ?? null;
}

export async function searchDartDisclosures(input: {
  corpCode?: string;
  corpName?: string;
  bgnDe?: string;
  endDe?: string;
  pageNo?: number;
}) {
  const corpCode = input.corpCode?.trim() || (input.corpName ? resolveCorpCode(input.corpName) : null);
  if (!corpCode) throw new Error("corp_code 또는 등록된 회사명/종목코드를 입력하세요.");

  const end = input.endDe ?? ymd(new Date());
  const bgn =
    input.bgnDe ??
    ymd(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));

  const json = await dartGet("list.json", {
    corp_code: corpCode,
    bgn_de: bgn,
    end_de: end,
    page_no: String(input.pageNo ?? 1),
    page_count: "20",
  });

  const list = (json.list as Record<string, unknown>[] | undefined) ?? [];
  return {
    corpCode,
    totalCount: json.total_count,
    items: list.map((r) => ({
      reportName: r.report_nm,
      receiptDate: r.rcept_dt,
      corpName: r.corp_name,
      stockCode: r.stock_code,
      url: r.rcept_no ? `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${r.rcept_no}` : undefined,
    })),
  };
}

export async function getDartCompanyInfo(corpCode: string) {
  const json = await dartGet("company.json", { corp_code: corpCode });
  return {
    corpCode: json.corp_code,
    corpName: json.corp_name,
    ceo: json.ceo_nm,
    industry: json.induty_code,
    address: json.adres,
    homepage: json.hm_url,
    estDate: json.est_dt,
    accMonth: json.acc_mt,
  };
}

export async function getDartFinancialSummary(input: {
  corpCode: string;
  bsnsYear: string;
  reprtCode?: string;
}) {
  const reprtCode = input.reprtCode ?? "11011"; // 사업보고서
  const json = await dartGet("fnlttSinglAcntAll.json", {
    corp_code: input.corpCode,
    bsns_year: input.bsnsYear,
    reprt_code: reprtCode,
    fs_div: "OFS",
  });

  const list = (json.list as Record<string, unknown>[] | undefined) ?? [];
  const highlights = list
    .filter((r) => {
      const name = String(r.account_nm ?? "");
      return /매출|영업이익|당기순이익|자산총계|부채총계|자본총계/.test(name);
    })
    .slice(0, 12)
    .map((r) => ({
      account: r.account_nm,
      amount: r.thstrm_amount,
      unit: r.currency,
    }));

  return { bsnsYear: input.bsnsYear, reprtCode, highlights, rawCount: list.length };
}

export function searchDartCorpIndex(keyword: string) {
  const q = keyword.trim().toLowerCase();
  if (!q) return DART_CORP_INDEX;
  return DART_CORP_INDEX.filter(
    (c) =>
      c.corpName.toLowerCase().includes(q) ||
      c.stockCode?.includes(q) ||
      c.corpCode.includes(q)
  );
}
