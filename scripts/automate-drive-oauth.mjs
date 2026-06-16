#!/usr/bin/env node
/**
 * Drive OAuth 자동 승인 (Playwright) — shinkang888@gmail.com 테스트 사용자 전제
 * node scripts/automate-drive-oauth.mjs
 */
import { readFileSync, existsSync } from "fs";
import path from "path";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import crypto from "crypto";

const ORIGIN = process.env.LAWYGO_ORIGIN ?? "https://lawygo.vercel.app";
const REDIRECT_URI = `${ORIGIN}/api/auth/google/callback`;
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

async function saveRefreshToken(refreshToken, email, env) {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("SUPABASE 없음 — env에 저장:");
    console.log(`GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN=${refreshToken}`);
    return false;
  }
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: existing } = await db.from("app_settings").select("value").eq("key", DRIVE_SETTINGS_KEY).maybeSingle();
  const next = {
    ...(existing?.value ?? {}),
    oauthRefreshToken: refreshToken,
    oauthDelegateEmail: email,
    enabled: true,
    preferDbOverEnv: true,
    rootFolderId: existing?.value?.rootFolderId ?? "1nuh_G4MJnFA8WUh4c8jCuORLo7Dew2NI",
  };
  const { error } = existing
    ? await db.from("app_settings").update({ value: next }).eq("key", DRIVE_SETTINGS_KEY)
    : await db.from("app_settings").insert({ key: DRIVE_SETTINGS_KEY, value: next });
  if (error) throw new Error(error.message);
  console.log("OK: drive_settings.oauthRefreshToken 저장 →", email);
  return true;
}

const env = loadEnv();
let clientId = env.GOOGLE_OAUTH_CLIENT_ID;
let clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET;

if ((!clientId || !clientSecret) && env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await db.from("app_settings").select("value").eq("key", GOOGLE_OAUTH_SETTINGS_KEY).maybeSingle();
  clientId = clientId || data?.value?.clientId;
  clientSecret = clientSecret || data?.value?.clientSecret;
}

if (!clientId || !clientSecret) {
  console.error("OAuth Client ID/Secret 없음");
  process.exit(1);
}

const SECRET = env.SESSION_SECRET || env.NEXT_PUBLIC_SUPABASE_URL || "lawygo-drive-oauth";
const payload = Buffer.from(
  JSON.stringify({ mode: "drive_oauth", loginId: "shinkang", nonce: crypto.randomBytes(8).toString("hex"), ts: Date.now() }),
  "utf-8"
).toString("base64url");
const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
const state = `${payload}.${sig}`;

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
const authUrl = oauth2.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/userinfo.email"],
  state,
  include_granted_scopes: true,
});

console.log("OAuth URL 열기:", authUrl.slice(0, 80) + "...");
console.log("브라우저에서 shinkang888@gmail.com 으로 로그인·승인하세요 (최대 5분 대기).\n");

const userDataDir = path.join(process.cwd(), ".playwright-drive-oauth");
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  channel: "chrome",
  viewport: { width: 1280, height: 900 },
});
const page = context.pages()[0] ?? (await context.newPage());

let authCode = null;
page.on("framenavigated", (frame) => {
  const url = frame.url();
  if (url.startsWith(REDIRECT_URI) && url.includes("code=")) {
    const u = new URL(url);
    authCode = u.searchParams.get("code");
  }
});

await page.goto(authUrl, { waitUntil: "domcontentloaded", timeout: 120000 });

async function clickIfVisible(locator, ms = 3000) {
  try {
    if (await locator.first().isVisible({ timeout: ms })) {
      await locator.first().click();
      await page.waitForTimeout(1500);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

for (let i = 0; i < 150; i++) {
  if (authCode) break;

  await clickIfVisible(page.locator('input[type="email"]'));
  await clickIfVisible(page.getByRole("textbox", { name: /email|이메일/i }));

  await clickIfVisible(page.locator('[data-email="shinkang888@gmail.com"]'));
  await clickIfVisible(page.locator('div[data-identifier="shinkang888@gmail.com"]'));

  // 미검증 앱 경고
  await clickIfVisible(page.getByRole("link", { name: /Advanced|고급|자세히/i }));
  await clickIfVisible(page.getByRole("link", { name: /Go to lawygo|lawygo.*\(unsafe\)|lawygo.*이동/i }));

  await clickIfVisible(page.getByRole("button", { name: /Continue|계속|다음|Allow|허용|동의|Accept/i }));
  await clickIfVisible(page.locator('button:has-text("Allow")'));
  await clickIfVisible(page.locator('button:has-text("허용")'));
  await clickIfVisible(page.locator('button:has-text("Continue")'));

  const current = page.url();
  if (current.startsWith(REDIRECT_URI) && current.includes("code=")) {
    authCode = new URL(current).searchParams.get("code");
    break;
  }

  await page.waitForTimeout(2000);
}

if (!authCode) {
  // URL bar may have redirected
  const current = page.url();
  if (current.includes("code=")) {
    authCode = new URL(current).searchParams.get("code");
  }
}

await context.close();

if (!authCode) {
  console.error("FAIL: authorization code를 받지 못했습니다. 브라우저에서 shinkang888@gmail.com 으로 수동 승인 후 URL의 code= 값을 사용하세요.");
  console.error(`node scripts/complete-drive-oauth.mjs --code=CODE --origin=${ORIGIN}`);
  process.exit(1);
}

console.log("authorization code 수신 OK");

const { tokens } = await oauth2.getToken(authCode);
const refreshToken = tokens.refresh_token?.trim();
if (!refreshToken) {
  console.error("FAIL: refresh_token 없음 — Google 계정에서 앱 권한을 취소한 뒤 prompt=consent 로 다시 시도");
  process.exit(1);
}

oauth2.setCredentials(tokens);
const { data: userinfo } = await google.oauth2({ version: "v2", auth: oauth2 }).userinfo.get();
const email = userinfo.email?.trim();
if (!email) {
  console.error("FAIL: email 확인 불가");
  process.exit(1);
}

await saveRefreshToken(refreshToken, email, env);
console.log("\nDrive OAuth 연결 완료:", email);
