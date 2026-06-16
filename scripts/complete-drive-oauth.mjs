#!/usr/bin/env node
/**
 * Drive OAuth refresh token 수동 등록 (브라우저 승인 후 redirect URL의 code 파라미터 사용)
 *
 * 1) 관리자로 로그인 후 「업로드 권한 연결」 클릭
 * 2) shinkang888@gmail.com 승인 후 리디렉트 URL 복사 (drive_oauth=success 전에 주소창의 code=...)
 *    또는: node scripts/print-drive-oauth-url.mjs 로 URL 출력 후 승인
 * 3) node scripts/complete-drive-oauth.mjs --code=4/0A... --origin=https://lawygo.vercel.app
 */
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { readFileSync, existsSync } from "fs";
import path from "path";

const DRIVE_SETTINGS_KEY = "drive_settings";
const GOOGLE_OAUTH_SETTINGS_KEY = "google_oauth_settings";

function loadEnv() {
  const out = {};
  for (const file of [".env.production.local", ".env.local", "bot/.env"]) {
    const p = path.join(process.cwd(), file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m) {
        const v = m[2].replace(/^["']|["']$/g, "").trim();
        if (v) out[m[1]] = v;
      }
    }
  }
  return { ...out, ...process.env };
}

function parseArgs() {
  const out = {};
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const args = parseArgs();
const code = (args.code ?? "").trim();
const origin = (args.origin ?? "https://lawygo.vercel.app").replace(/\/$/, "");
const redirectUri = `${origin}/api/auth/google/callback`;

if (!code) {
  console.error("사용: node scripts/complete-drive-oauth.mjs --code=AUTH_CODE --origin=https://lawygo.vercel.app");
  process.exit(1);
}

const env = loadEnv();
let clientId = env.GOOGLE_OAUTH_CLIENT_ID || env.GOOGLE_CLIENT_ID;
let clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET;

if ((!clientId || !clientSecret) && env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await db.from("app_settings").select("value").eq("key", GOOGLE_OAUTH_SETTINGS_KEY).maybeSingle();
  clientId = clientId || data?.value?.clientId;
  clientSecret = clientSecret || data?.value?.clientSecret;
}

if (!clientId || !clientSecret) {
  console.error("Google OAuth Client ID/Secret 없음");
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
const { tokens } = await oauth2.getToken(code);
const refreshToken = tokens.refresh_token?.trim();
if (!refreshToken) {
  console.error("refresh_token 없음 — prompt=consent 로 다시 승인하세요.");
  process.exit(1);
}

oauth2.setCredentials(tokens);
const { data: userinfo } = await google.oauth2({ version: "v2", auth: oauth2 }).userinfo.get();
const email = userinfo.email?.trim();
if (!email) {
  console.error("이메일 확인 실패");
  process.exit(1);
}

console.log("OAuth 계정:", email);

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log("SUPABASE 없음 — 아래를 .env.local에 저장:");
  console.log(`GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN=${refreshToken}`);
  process.exit(0);
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: existing } = await db.from("app_settings").select("value").eq("key", DRIVE_SETTINGS_KEY).maybeSingle();
const next = {
  ...(existing?.value ?? {}),
  oauthRefreshToken: refreshToken,
  oauthDelegateEmail: email,
  enabled: existing?.value?.enabled !== false,
};

const { error } = existing
  ? await db.from("app_settings").update({ value: next }).eq("key", DRIVE_SETTINGS_KEY)
  : await db.from("app_settings").insert({ key: DRIVE_SETTINGS_KEY, value: next });

if (error) {
  console.error("DB 저장 실패:", error.message);
  process.exit(1);
}

console.log("OK: drive_settings.oauthRefreshToken 저장 완료");
console.log("→ npm run test:drive 로 검증하세요.");
