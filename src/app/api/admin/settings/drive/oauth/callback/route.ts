/**
 * Drive OAuth 콜백 — google/callback 으로 통합 (레거시 경로 유지)
 */

import { NextRequest, NextResponse } from "next/server";
import { getGoogleRedirectUri } from "@/lib/googleAuth";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const target = new URL(getGoogleRedirectUri(origin));
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });
  return NextResponse.redirect(target.toString());
}
