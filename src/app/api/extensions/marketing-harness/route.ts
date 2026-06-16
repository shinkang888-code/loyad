/**
 * POST /api/extensions/marketing-harness — ah-my-marketing 워크플로
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/authSession";
import {
  runMarketingHarness,
  type MarketingChannel,
} from "@/lib/extensions/contentStudioServer";

const CHANNELS: MarketingChannel[] = ["blog", "sns", "ad", "email"];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await req.json()) as {
    topic?: string;
    channel?: string;
    audience?: string;
    firmName?: string;
  };

  const channel = (body.channel ?? "blog") as MarketingChannel;
  if (!CHANNELS.includes(channel)) {
    return NextResponse.json({ error: "channel: blog|sns|ad|email" }, { status: 400 });
  }

  const result = await runMarketingHarness({
    topic: String(body.topic ?? ""),
    channel,
    audience: body.audience,
    firmName: body.firmName,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, pack: result.pack });
}
