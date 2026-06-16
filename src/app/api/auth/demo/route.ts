/**
 * 데모 로그인 (DEMO 버튼용)
 * - 관리번호 10000 · shinkang888@gmail.com 계정으로 세션 발급
 * - ENABLE_DEMO_LOGIN=false 로 비활성화 가능
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { issueAuthSessionCookie } from "@/lib/issueAuthSession";
import { hashPassword } from "@/lib/authPassword";
import {
  buildOfflineDemoSession,
  DEMO_GOOGLE_EMAIL,
  DEMO_LOGIN_ID,
  DEMO_MANAGEMENT_NUMBER,
  DEMO_NAME,
  DEMO_PASSWORD,
  isDemoLoginEnabled,
  isOfflineDemoAllowed,
} from "@/lib/demoAuth";
import { getClientIdentifier, LIMIT_DEMO_PER_MIN } from "@/lib/rateLimit";
import { enforceRateLimit } from "@/lib/security/rateLimitGuard";
import { buildLoginTenantSession } from "@/lib/platformTenantSwitch";
import { COMPANY_ADMIN_ROLE_ID, PLATFORM_ADMIN_ROLE_ID } from "@/lib/adminRoles";
import { getMenuPermissionsForRole } from "@/lib/rolePermissionsServer";

type DemoUserRow = {
  id: string;
  login_id: string;
  name: string | null;
  role: string | null;
  status: string;
  management_number: string | null;
  permission_role_id?: string | null;
  google_email?: string | null;
};

const DEMO_USER_SELECT =
  "id, login_id, name, role, status, management_number, permission_role_id, google_email";

function platformSuperLoginIds(): string[] {
  return (process.env.PLATFORM_ADMIN_LOGIN_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isBlockedPlatformDemoUser(user: DemoUserRow): boolean {
  if (platformSuperLoginIds().includes(user.login_id)) return true;
  return user.permission_role_id?.trim() === PLATFORM_ADMIN_ROLE_ID;
}

function approvedStatuses(): string[] {
  return ["active", "approved"];
}

async function findFallbackDemoUser(db: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const { data } = await db
    .from("site_users")
    .select(DEMO_USER_SELECT)
    .eq("management_number", DEMO_MANAGEMENT_NUMBER)
    .in("status", approvedStatuses())
    .order("created_at", { ascending: true });

  for (const row of data ?? []) {
    const user = row as DemoUserRow;
    if (!isBlockedPlatformDemoUser(user)) return user;
  }
  return null;
}

async function findDemoUser(db: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const baseSelect = DEMO_USER_SELECT;

  const { data: byGoogle } = await db
    .from("site_users")
    .select(baseSelect)
    .eq("management_number", DEMO_MANAGEMENT_NUMBER)
    .eq("google_email", DEMO_GOOGLE_EMAIL)
    .in("status", approvedStatuses())
    .maybeSingle();

  if (byGoogle) return byGoogle as DemoUserRow;

  const { data: byLogin } = await db
    .from("site_users")
    .select(baseSelect)
    .eq("management_number", DEMO_MANAGEMENT_NUMBER)
    .eq("login_id", DEMO_LOGIN_ID)
    .in("status", approvedStatuses())
    .maybeSingle();

  if (byLogin) return byLogin as DemoUserRow;

  const { data: byEmailLogin } = await db
    .from("site_users")
    .select(baseSelect)
    .eq("management_number", DEMO_MANAGEMENT_NUMBER)
    .eq("login_id", DEMO_GOOGLE_EMAIL)
    .in("status", approvedStatuses())
    .maybeSingle();

  return (byEmailLogin as DemoUserRow | null) ?? null;
}

async function ensureDemoUser(
  db: NonNullable<ReturnType<typeof getSupabaseAdmin>>
): Promise<{ user: DemoUserRow | null; upsertError?: string }> {
  const existing = await findDemoUser(db);
  if (existing && !isBlockedPlatformDemoUser(existing)) {
    return { user: existing };
  }

  const password_hash = hashPassword(DEMO_PASSWORD);
  const loginId = DEMO_LOGIN_ID.includes("@") ? DEMO_LOGIN_ID.split("@")[0] : DEMO_LOGIN_ID;
  const now = new Date().toISOString();
  const fullRow = {
    login_id: loginId,
    password_hash,
    management_number: DEMO_MANAGEMENT_NUMBER,
    google_email: DEMO_GOOGLE_EMAIL,
    name: DEMO_NAME,
    role: "관리자",
    permission_role_id: COMPANY_ADMIN_ROLE_ID,
    status: "active",
    approved_at: now,
    approved_by: "demo",
    auth_provider: "google",
  };
  let { error: upsertError } = await db.from("site_users").upsert(fullRow, { onConflict: "login_id" });

  if (upsertError) {
    const minimalRow = {
      login_id: loginId,
      password_hash,
      management_number: DEMO_MANAGEMENT_NUMBER,
      name: DEMO_NAME,
      status: "active",
      approved_at: now,
      approved_by: "demo",
    };
    const retry = await db.from("site_users").upsert(minimalRow, { onConflict: "login_id" });
    upsertError = retry.error;
  }

  if (!upsertError) {
    const created = await findDemoUser(db);
    if (created && !isBlockedPlatformDemoUser(created)) return { user: created };
  }

  const fallback = await findFallbackDemoUser(db);
  if (fallback) return { user: fallback };

  const { data: anyTenantUser } = await db
    .from("site_users")
    .select(DEMO_USER_SELECT)
    .eq("management_number", DEMO_MANAGEMENT_NUMBER)
    .in("status", approvedStatuses())
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return {
    user: (anyTenantUser as DemoUserRow | null) ?? null,
    upsertError: upsertError?.message,
  };
}

async function findAnyApprovedUser(db: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const { data } = await db
    .from("site_users")
    .select(DEMO_USER_SELECT)
    .in("status", approvedStatuses())
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as DemoUserRow | null) ?? null;
}

export async function POST(request: Request) {
  if (!isDemoLoginEnabled()) {
    const message =
      process.env.NODE_ENV === "production"
        ? "프로덕션에서는 데모 로그인이 비활성화되어 있습니다."
        : "데모 로그인이 비활성화되어 있습니다.";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const limited = enforceRateLimit(request, `auth:demo:${getClientIdentifier(request)}`, LIMIT_DEMO_PER_MIN, {
    routePath: "/api/auth/demo",
    source: "auth",
  });
  if (limited) return limited;

  const db = getSupabaseAdmin();
  if (!db) {
    if (isOfflineDemoAllowed()) {
      const offline = buildOfflineDemoSession();
      const res = NextResponse.json({
        success: true,
        offline: true,
        user: {
          id: offline.userId,
          loginId: offline.loginId,
          name: offline.name,
          role: offline.role,
          managementNumber: offline.managementNumber,
        },
        warning:
          "로컬 오프라인 데모입니다. 실제 데이터는 Supabase 연결 후 사용하세요. (.env.local 설정)",
      });
      res.headers.set(
        "Set-Cookie",
        issueAuthSessionCookie(offline, {
          loginId: offline.loginId,
          managementNumber: offline.managementNumber,
          googleEmail: DEMO_GOOGLE_EMAIL,
        })
      );
      return res;
    }

    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const missing: string[] = [];
    if (!hasUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!hasKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    const hint =
      missing.length > 0
        ? `.env.local(로컬) 또는 Vercel 환경 변수(배포)에 ${missing.join(", ")}를 설정한 뒤 재배포하세요.`
        : "환경 변수는 있으나 DB 연결에 실패했습니다.";
    return NextResponse.json(
      { error: "DB가 연결되지 않았습니다.", code: "DB_NOT_CONFIGURED", missing, hint },
      { status: 503 }
    );
  }

  let { user: demoUser } = await ensureDemoUser(db);
  if (!demoUser) {
    demoUser = await findAnyApprovedUser(db);
  }
  if (!demoUser && isDemoLoginEnabled()) {
    const offline = buildOfflineDemoSession();
    const res = NextResponse.json({
      success: true,
      offline: true,
      user: {
        id: offline.userId,
        loginId: offline.loginId,
        name: offline.name,
        role: offline.role,
        managementNumber: offline.managementNumber,
      },
      warning: "DB 연결 없이 체험 세션입니다. Supabase 복구 후 실데이터를 사용하세요.",
    });
    res.headers.set(
      "Set-Cookie",
      issueAuthSessionCookie(offline, {
        loginId: offline.loginId,
        managementNumber: offline.managementNumber,
        googleEmail: DEMO_GOOGLE_EMAIL,
      })
    );
    return res;
  }
  if (!demoUser) {
    return NextResponse.json(
      {
        error:
          "체험 계정을 찾을 수 없습니다. 관리번호 10000 · shinkang888@gmail.com 계정이 승인 상태인지 확인해 주세요.",
      },
      { status: 500 }
    );
  }

  const demoManagementNumber =
    (demoUser.management_number ?? DEMO_MANAGEMENT_NUMBER).trim() || DEMO_MANAGEMENT_NUMBER;
  const permissionRoleId = demoUser.permission_role_id?.trim() || COMPANY_ADMIN_ROLE_ID;
  const menuPermissions = await getMenuPermissionsForRole(permissionRoleId);

  const cookie = issueAuthSessionCookie(
    buildLoginTenantSession({
      userId: demoUser.id,
      loginId: demoUser.login_id,
      name: demoUser.name ?? demoUser.login_id,
      role: demoUser.role ?? "관리자",
      managementNumber: demoManagementNumber,
      permissionRoleId,
      menuPermissions,
    }),
    {
      loginId: demoUser.login_id,
      managementNumber: demoManagementNumber,
      googleEmail: demoUser.google_email ?? DEMO_GOOGLE_EMAIL,
    }
  );

  const res = NextResponse.json({
    success: true,
    user: {
      id: demoUser.id,
      loginId: demoUser.login_id,
      name: demoUser.name ?? demoUser.login_id,
      role: demoUser.role ?? "관리자",
      managementNumber: demoManagementNumber,
      googleEmail: demoUser.google_email ?? DEMO_GOOGLE_EMAIL,
    },
  });
  res.headers.set("Set-Cookie", cookie);
  return res;
}
