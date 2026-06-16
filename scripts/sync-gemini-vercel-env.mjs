/**
 * Gemini API 키 → Loyad Vercel env (GOOGLE_GEMINI_API_KEY, GEMINI_API_KEY)
 * 사용: node scripts/sync-gemini-vercel-env.mjs
 *       LOYAD_GEMINI_KEY_FILE="d:/로이고key/loyadkey/loyadgooglekey.txt"
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const loyadRoot = path.resolve(__dirname, "..");
const keyFile =
  process.env.LOYAD_GEMINI_KEY_FILE ||
  "d:/로이고key/loyadkey/loyadgooglekey.txt";

const keyText = fs.readFileSync(keyFile, "utf8");
const match = keyText.match(/gemini\s*apikey\s*=\s*\r?\n([^\r\n#]+)/i);
const geminiKey = match?.[1]?.trim();
if (!geminiKey) {
  console.error("Gemini key not found in", keyFile);
  process.exit(1);
}

const project = JSON.parse(fs.readFileSync(path.join(loyadRoot, ".vercel/project.json"), "utf8"));
const sourceEnv = process.env.SOURCE_ENV || "C:/Users/user/.cursor/lawygo/.env.local";
const token = fs
  .readFileSync(sourceEnv, "utf8")
  .match(/^VERCEL_ACCESS_TOKEN=(.+)$/m)?.[1]
  ?.trim();
if (!token) {
  console.error("VERCEL_ACCESS_TOKEN missing in", sourceEnv);
  process.exit(1);
}

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

for (const key of ["GOOGLE_GEMINI_API_KEY", "GEMINI_API_KEY"]) {
  for (const row of listJson.envs.filter((e) => e.key === key)) {
    await api(`/v9/projects/${project.projectId}/env/${row.id}`, { method: "DELETE" });
  }
  const res = await api(`/v10/projects/${project.projectId}/env`, {
    method: "POST",
    body: JSON.stringify({
      key,
      value: geminiKey,
      type: "encrypted",
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

console.log("\nDone — redeploy production for env to apply (Git push or Vercel dashboard).");
