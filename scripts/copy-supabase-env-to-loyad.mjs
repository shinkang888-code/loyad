/**
 * lawygo Vercel production → loyad Vercel production (Supabase 3종)
 * vercel env pull 은 값이 마스킹되므로 lawygo .env.local 기준으로 동기화
 */
import fs from "fs";
import { execFileSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const loyadRoot = path.resolve(__dirname, "..");
const source = process.env.SOURCE_ENV || "C:/Users/user/.cursor/lawygo/.env.local";
const keys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const vars = {};
for (const line of fs.readFileSync(source, "utf8").split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i < 1) continue;
  vars[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

for (const name of keys) {
  const val = vars[name]?.trim();
  if (!val) {
    console.log("SKIP", name);
    continue;
  }
  execFileSync(
    "npx",
    ["vercel", "env", "add", name, "production", "--force", "--yes", "--value", val],
    { cwd: loyadRoot, stdio: "inherit", shell: true }
  );
  console.log("OK", name);
}

console.log("\nDone — run: npx vercel --prod --yes");
