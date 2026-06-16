/**
 * POST /api/extensions/law-mcp — korean-law-mcp 도구 실행
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/authSession";
import {
  LAW_MCP_TOOLS,
  executeLawMcpTool,
  type LawMcpToolId,
} from "@/lib/extensions/lawMcpTools";

export async function GET() {
  return NextResponse.json({ tools: LAW_MCP_TOOLS });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await req.json()) as { tool?: string; params?: Record<string, unknown> };
  const tool = String(body.tool ?? "") as LawMcpToolId;
  if (!LAW_MCP_TOOLS.some((t) => t.id === tool)) {
    return NextResponse.json({ error: "지원하지 않는 도구입니다." }, { status: 400 });
  }

  const result = await executeLawMcpTool(tool, body.params ?? {});
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
