/**
 * lawygo .env.local Supabase → loyad Vercel (REST API, CLI hang 회피)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const loyadRoot = path.resolve(__dirname, "..");
const source = process.env.SOURCE_ENV || "C:/Users/user/.cursor/lawygo/.env.local";
const project = JSON.parse(fs.readFileSync(path.join(loyadRoot, ".vercel/project.json"), "utf8"));

const envText = fs.readFileSync(source, "utf8");
const local = {};
for (const line of envText.split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i < 1) continue;
  local[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const token = local.VERCEL_ACCESS_TOKEN?.trim();
if (!token) {
  console.error("VERCEL_ACCESS_TOKEN missing in source env");
  process.exit(1);
}

const keys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ENABLE_DEMO_LOGIN",
];

const api = (p, init = {}) => {
  const url = new URL(`https://api.vercel.com${p}`);
  url.searchParams.set("teamId", project.orgId);
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
};

const listRes = await api(`/v9/projects/${project.projectId}/env`);
const listJson = await listRes.json();
if (!listRes.ok) {
  console.error("list failed", listJson);
  process.exit(1);
}

for (const key of keys) {
  const value = key === "ENABLE_DEMO_LOGIN" ? "true" : local[key]?.trim();
  if (!value) {
    console.log("SKIP", key);
    continue;
  }
  for (const row of listJson.envs.filter((e) => e.key === key)) {
    await api(`/v9/projects/${project.projectId}/env/${row.id}`, { method: "DELETE" });
  }
  const res = await api(`/v10/projects/${project.projectId}/env`, {
    method: "POST",
    body: JSON.stringify({
      key,
      value,
      type: key.startsWith("NEXT_PUBLIC_") ? "plain" : "encrypted",
      target: ["production", "preview", "development"],
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error("FAIL", key, json);
    process.exit(1);
  }
  console.log("OK", key);
}

console.log("\nDone — redeploy: npx vercel --prod --yes");
