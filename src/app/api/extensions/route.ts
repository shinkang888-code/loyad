/**
 * GET /api/extensions — 카탈로그 + 설치 상태
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/authSession";
import { resolveManagementNumber } from "@/lib/tenantScope";
import { EXTENSION_CATALOG } from "@/lib/extensions/catalog";
import { getInstalledExtensions } from "@/lib/extensions/extensionStoreServer";

export async function GET() {
  const session = await getSession();
  const managementNumber = session
    ? await resolveManagementNumber(session)
    : "10000";

  const installed = managementNumber
    ? await getInstalledExtensions(managementNumber)
    : [];

  return NextResponse.json({
    catalog: EXTENSION_CATALOG,
    installed,
  });
}
