import fs from "fs";
import { execSync } from "child_process";

const path = ".github/workflows/android-twa.yml";
const token = execSync("gh auth token", { encoding: "utf8" }).trim();
const content = fs.readFileSync(path, "utf8");
const res = await fetch(
  "https://api.github.com/repos/shinkang888-code/loyad/contents/" + path,
  {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "ci: Android TWA workflow 추가",
      content: Buffer.from(content).toString("base64"),
      branch: "main",
    }),
  }
);
const text = await res.text();
console.log(res.status, text.slice(0, 500));
process.exit(res.ok ? 0 : 1);
