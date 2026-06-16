/**
 * bot/.env Supabase 값 → loyad Vercel production (빈 값 덮어쓰기 방지용)
 */
import fs from "fs";
import { execFileSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cwd = path.resolve(__dirname, "..");
const source =
  process.env.SOURCE_ENV || "C:/Users/user/.cursor/lawygo/.env.local";

const wanted = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const vars = {};
for (const line of fs.readFileSync(source, "utf8").split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i < 1) continue;
  const name = line.slice(0, i).trim();
  let val = line.slice(i + 1).trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  vars[name] = val;
}

for (const name of wanted) {
  const val = vars[name]?.trim();
  if (!val) {
    console.log("SKIP (missing in source)", name);
    continue;
  }
  execFileSync(
    "npx",
    ["vercel", "env", "add", name, "production", "--force", "--yes", "--value", val],
    { cwd, stdio: "inherit", shell: true }
  );
  console.log("OK", name);
}

console.log("\nDone. Run: npx vercel --prod --yes");
