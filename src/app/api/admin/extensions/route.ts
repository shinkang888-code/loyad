/**
 * POST /api/admin/extensions — 확장 설치/제거
 * body: { action: "install" | "uninstall", extensionId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/authSession";
import { resolveManagementNumber } from "@/lib/tenantScope";
import { isCompanyAdmin } from "@/lib/adminRoles";
import {
  installExtension,
  uninstallExtension,
} from "@/lib/extensions/extensionStoreServer";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (!isCompanyAdmin(session) && session.role !== "관리자") {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const managementNumber = await resolveManagementNumber(session);
  if (!managementNumber) {
    return NextResponse.json({ error: "관리번호를 확인할 수 없습니다." }, { status: 403 });
  }

  let body: { action?: string; extensionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const action = body.action?.trim();
  const extensionId = body.extensionId?.trim();
  if (!action || !extensionId) {
    return NextResponse.json({ error: "action, extensionId가 필요합니다." }, { status: 400 });
  }

  const result =
    action === "install"
      ? await installExtension(managementNumber, extensionId, session.loginId)
      : action === "uninstall"
        ? await uninstallExtension(managementNumber, extensionId)
        : { ok: false as const, error: "action은 install 또는 uninstall" };

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
