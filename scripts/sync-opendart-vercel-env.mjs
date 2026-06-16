/**
 * OpenDART API 키 → Loyad Vercel env (OPENDART_API_KEY, DART_API_KEY)
 * 사용: npm run sync:opendart-env
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import os from "os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const loyadRoot = path.resolve(__dirname, "..");
const keyFile =
  process.env.LOYAD_DART_KEY_FILE ||
  "c:/Users/user/Dropbox/PC (9)/Downloads/wallpilotDART api key.docx";

function readDartKeyFromDocx(filePath) {
  const zipPath = path.join(os.tmpdir(), "loyad-dart-key.zip");
  fs.copyFileSync(filePath, zipPath);
  const extractDir = path.join(os.tmpdir(), "loyad-dart-key-extract");
  fs.rmSync(extractDir, { recursive: true, force: true });
  fs.mkdirSync(extractDir, { recursive: true });
  execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}' -Force"`, {
    stdio: "pipe",
  });
  const xml = fs.readFileSync(path.join(extractDir, "word/document.xml"), "utf8");
  const text = xml.replace(/<[^>]+>/g, "").replace(/\s+/g, "");
  const match = text.match(/(?:dart)?apikey=([a-f0-9]{40})/i);
  return match?.[1]?.trim() ?? "";
}

const dartKey = readDartKeyFromDocx(keyFile);
if (!dartKey) {
  console.error("OpenDART key not found in", keyFile);
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

for (const key of ["OPENDART_API_KEY", "DART_API_KEY"]) {
  for (const row of listJson.envs.filter((e) => e.key === key)) {
    await api(`/v9/projects/${project.projectId}/env/${row.id}`, { method: "DELETE" });
  }
  const res = await api(`/v10/projects/${project.projectId}/env`, {
    method: "POST",
    body: JSON.stringify({
      key,
      value: dartKey,
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

console.log("\nDone — redeploy production for env to apply.");
