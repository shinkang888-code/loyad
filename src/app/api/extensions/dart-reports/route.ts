/**
 * POST /api/extensions/dart-reports — OpenDART 공시·재무 조회
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/authSession";
import {
  DART_CORP_INDEX,
  getDartCompanyInfo,
  getDartFinancialSummary,
  getOpenDartApiKey,
  resolveCorpCode,
  searchDartCorpIndex,
  searchDartDisclosures,
} from "@/lib/extensions/openDartClient";

export async function GET() {
  const configured = Boolean(getOpenDartApiKey());
  return NextResponse.json({
    configured,
    corpIndex: DART_CORP_INDEX,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await req.json()) as {
    action?: string;
    corpCode?: string;
    corpName?: string;
    bgnDe?: string;
    endDe?: string;
    bsnsYear?: string;
    keyword?: string;
  };

  const action = String(body.action ?? "disclosures");

  try {
    switch (action) {
      case "corp_search": {
        const items = searchDartCorpIndex(String(body.keyword ?? ""));
        return NextResponse.json({ ok: true, items });
      }

      case "resolve": {
        const code = resolveCorpCode(String(body.corpName ?? body.corpCode ?? ""));
        if (!code) {
          return NextResponse.json({ ok: false, error: "회사를 찾을 수 없습니다." }, { status: 404 });
        }
        return NextResponse.json({ ok: true, corpCode: code });
      }

      case "company": {
        const corpCode = body.corpCode?.trim() || resolveCorpCode(String(body.corpName ?? ""));
        if (!corpCode) {
          return NextResponse.json({ ok: false, error: "corpCode 또는 corpName 필요" }, { status: 400 });
        }
        const company = await getDartCompanyInfo(corpCode);
        return NextResponse.json({ ok: true, company });
      }

      case "financial": {
        const corpCode = body.corpCode?.trim() || resolveCorpCode(String(body.corpName ?? ""));
        const bsnsYear = String(body.bsnsYear ?? new Date().getFullYear() - 1);
        if (!corpCode) {
          return NextResponse.json({ ok: false, error: "corpCode 또는 corpName 필요" }, { status: 400 });
        }
        const financial = await getDartFinancialSummary({ corpCode, bsnsYear });
        return NextResponse.json({ ok: true, financial });
      }

      case "disclosures":
      default: {
        const data = await searchDartDisclosures({
          corpCode: body.corpCode,
          corpName: body.corpName,
          bgnDe: body.bgnDe,
          endDe: body.endDe,
        });
        return NextResponse.json({ ok: true, ...data });
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "DART 조회 실패";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
