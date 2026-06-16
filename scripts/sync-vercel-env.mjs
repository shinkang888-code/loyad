/**
 * lawygo .env.production.local → loyad Vercel production env
 */
import fs from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = process.env.SOURCE_ENV || "C:/Users/user/.cursor/lawygo/.env.production.local";
const cwd = path.resolve(__dirname, "..");
const skip = /^(VERCEL_|NX_|TURBO_|lawygo$)/;

const content = fs.readFileSync(source, "utf8");
let ok = 0;
let fail = 0;

for (const line of content.split(/\r?\n/)) {
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
  if (skip.test(name)) continue;
  if (!val) {
    console.log("SKIP (empty)", name);
    continue;
  }
  try {
    execSync(`npx vercel env add "${name}" production --force --yes --value "${val.replace(/"/g, '\\"')}"`, {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });
    console.log("OK", name);
    ok++;
  } catch (e) {
    console.log("FAIL", name);
    fail++;
  }
}

console.log(`\nDone: ${ok} ok, ${fail} fail`);
