#!/usr/bin/env node
/**
 * Drive OAuth 승인 URL 출력 (shinkang 등 전체관리자가 브라우저에서 열기)
 */
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { readFileSync, existsSync } from "fs";
import path from "path";
import crypto from "crypto";

const GOOGLE_OAUTH_SETTINGS_KEY = "google_oauth_settings";
const SECRET = process.env.SESSION_SECRET || process.env.NEXT_PUBLIC_SUPABASE_URL || "lawygo-drive-oauth";

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

const origin = (process.argv[2] ?? "https://lawygo.vercel.app").replace(/\/$/, "");
const redirectUri = `${origin}/api/auth/google/callback`;
const loginId = process.argv[3] ?? "shinkang";

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
  console.error("Google OAuth credentials 없음");
  process.exit(1);
}

const payload = Buffer.from(
  JSON.stringify({ mode: "drive_oauth", loginId, nonce: crypto.randomBytes(8).toString("hex"), ts: Date.now() }),
  "utf-8"
).toString("base64url");
const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
const state = `${payload}.${sig}`;

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
const url = oauth2.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/userinfo.email",
  ],
  state,
  include_granted_scopes: true,
});

console.log("Drive OAuth URL (shinkang888@gmail.com 으로 승인):\n");
console.log(url);
console.log("\n승인 후 리디렉트 URL의 code= 값으로:");
console.log(`node scripts/complete-drive-oauth.mjs --code=CODE --origin=${origin}`);
