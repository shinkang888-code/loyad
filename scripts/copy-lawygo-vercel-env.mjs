/**
 * lawygo Vercel env → loyad Vercel env (암호화 값 그대로 복사)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const loyadRoot = path.resolve(__dirname, "..");
const sourceEnv =
  process.env.SOURCE_ENV || "C:/Users/user/.cursor/lawygo/.env.local";
const local = {};
for (const line of fs.readFileSync(sourceEnv, "utf8").split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i < 1) continue;
  local[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const token = local.VERCEL_ACCESS_TOKEN?.trim();
if (!token) throw new Error("VERCEL_ACCESS_TOKEN required");

const teamId = JSON.parse(
  fs.readFileSync(path.join(loyadRoot, ".vercel/project.json"), "utf8")
).orgId;

const keys = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ENABLE_DEMO_LOGIN",
  "SESSION_SECRET",
  "CRON_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GEMINI_API_KEY",
  "GOOGLE_GEMINI_API_KEY",
  "LAW_GO_KR_OC",
  "PLATFORM_ADMIN_LOGIN_IDS",
  "PLATFORM_ADMIN_MANAGEMENT_NUMBERS",
]);

const api = (p, init = {}) => {
  const url = new URL(`https://api.vercel.com${p}`);
  url.searchParams.set("teamId", teamId);
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
};

const lawygo = await api("/v9/projects/lawygo").then((r) => r.json());
const loyad = await api("/v9/projects/loyad").then((r) => r.json());
const sourceEnvs = await api(`/v9/projects/${lawygo.id}/env`).then((r) => r.json());
const targetEnvs = await api(`/v9/projects/${loyad.id}/env`).then((r) => r.json());

for (const row of sourceEnvs.envs ?? []) {
  if (!keys.has(row.key)) continue;
  if (!row.target?.includes("production")) continue;

  for (const existing of (targetEnvs.envs ?? []).filter((e) => e.key === row.key)) {
    await api(`/v9/projects/${loyad.id}/env/${existing.id}`, { method: "DELETE" });
  }

  const body = {
    key: row.key,
    value: row.key === "ENABLE_DEMO_LOGIN" ? "true" : row.value,
    type: row.type,
    target: row.target,
  };

  const res = await api(`/v10/projects/${loyad.id}/env`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error("FAIL", row.key, json);
    process.exit(1);
  }
  console.log("OK", row.key, row.type);
}

console.log("\nDone — npx vercel --prod --yes --force");
