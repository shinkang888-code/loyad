#!/usr/bin/env node
/**
 * GCP 프로젝트 ID·서비스 계정·OAuth 클라이언트 일치 확인
 * node scripts/verify-gcp-project.mjs
 */
import { readFileSync, existsSync } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const EXPECTED_PROJECT_ID = "lawygo-499503";

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

const env = loadEnv();
let credentialsBase64 = env.GOOGLE_DRIVE_CREDENTIALS_BASE64;
let clientId = env.GOOGLE_OAUTH_CLIENT_ID;

if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: drive } = await db.from("app_settings").select("value").eq("key", "drive_settings").maybeSingle();
  const { data: oauth } = await db.from("app_settings").select("value").eq("key", "google_oauth_settings").maybeSingle();
  credentialsBase64 = credentialsBase64 || drive?.value?.credentialsBase64;
  clientId = clientId || oauth?.value?.clientId;
}

if (!credentialsBase64) {
  console.error("FAIL: 서비스 계정 credentials 없음");
  process.exit(1);
}

const sa = JSON.parse(Buffer.from(credentialsBase64, "base64").toString("utf8"));
const projectId = sa.project_id?.trim();
const projectNumber = clientId?.split("-")[0] ?? "";

console.log("서비스 계정 project_id:", projectId);
console.log("서비스 계정 email:", sa.client_email);
console.log("서비스 계정 client_id (숫자, OAuth용 아님):", sa.client_id ?? "(없음)");
console.log("OAuth Client ID:", clientId ? `${clientId.slice(0, 35)}…` : "(없음)");
console.log("OAuth 프로젝트 번호:", projectNumber || "(없음)");

let ok = true;
if (projectId !== EXPECTED_PROJECT_ID) {
  console.error(`FAIL: project_id가 ${EXPECTED_PROJECT_ID}가 아님 → ${projectId}`);
  ok = false;
} else {
  console.log(`OK: project_id = ${EXPECTED_PROJECT_ID}`);
}

if (sa.client_email && !sa.client_email.includes(`@${EXPECTED_PROJECT_ID}.iam.gserviceaccount.com`)) {
  console.error("FAIL: 서비스 계정 이메일 도메인이 프로젝트 ID와 불일치");
  ok = false;
} else if (sa.client_email) {
  console.log("OK: 서비스 계정 도메인 일치");
}

if (!clientId) {
  console.error("WARN: OAuth Client ID 없음");
  ok = false;
} else if (projectNumber && !/^\d+$/.test(projectNumber)) {
  console.error("WARN: OAuth Client ID 형식 이상");
} else {
  console.log("OK: OAuth 클라이언트 등록됨 (프로젝트 번호", projectNumber + ")");
}

process.exit(ok ? 0 : 1);
