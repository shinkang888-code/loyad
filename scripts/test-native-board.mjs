#!/usr/bin/env node
/**
 * LawyGo 네이티브 게시판 API 기능 점검
 * 전제: Supabase native_boards 마이그레이션 적용, LawyGo(dev) 실행
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return {};
  const env = {};
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = { ...process.env, ...loadEnvLocal() };
const LAWYGO = env.LAWYGO_TEST_URL ?? "http://localhost:3000";

const results = [];

async function loginForTests() {
  const res = await fetch(`${LAWYGO}/api/auth/demo`, { method: "POST" });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || `demo login failed ${res.status}`);
  }
  return cookie;
}

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`✓ ${name}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    results.push({ name, ok: false, error: msg });
    console.error(`✗ ${name}: ${msg}`);
  }
}

async function main() {
  console.log(`LawyGo: ${LAWYGO}\n`);

  let authCookie = "";
  await check("데모 로그인 (세션)", async () => {
    authCookie = await loginForTests();
    if (!authCookie) throw new Error("세션 쿠키 없음");
  });

  const authHeaders = authCookie
    ? { Cookie: authCookie, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };

  await check("LawyGo /api/board 목록", async () => {
    const r = await fetch(`${LAWYGO}/api/board`);
    const j = await r.json();
    if (!j.success) throw new Error(JSON.stringify(j));
    if (!j.nativeBoard) throw new Error("nativeBoard=false — 마이그레이션 확인");
    if (!Array.isArray(j.data) || j.data.length < 3) {
      throw new Error(`게시판 ${j.data?.length ?? 0}개 — 기본 3개 필요`);
    }
  });

  const boardId = "general";
  let postId = null;

  await check(`게시물 목록 (${boardId})`, async () => {
    const r = await fetch(`${LAWYGO}/api/board/${boardId}`);
    const j = await r.json();
    if (!j.success) throw new Error(JSON.stringify(j));
    if (j.source !== "lawygo") throw new Error(`source=${j.source}`);
  });

  await check(`게시물 작성 (${boardId})`, async () => {
    const r = await fetch(`${LAWYGO}/api/board/${boardId}`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        wr_subject: `[테스트] 네이티브 게시판 ${new Date().toISOString()}`,
        wr_content: "LawyGo Supabase 게시판 자동 테스트",
        wr_name: "테스트",
      }),
    });
    const j = await r.json();
    if (!j.success) throw new Error(JSON.stringify(j));
    postId = j.data?.id;
    if (!postId) throw new Error("postId 없음");
  });

  if (postId) {
    await check(`게시물 조회 (${boardId}/${postId})`, async () => {
      const r = await fetch(`${LAWYGO}/api/board/${boardId}/${postId}`, {
        headers: authCookie ? { Cookie: authCookie } : undefined,
      });
      const j = await r.json();
      if (!j.success || !j.data) throw new Error(JSON.stringify(j));
    });

    await check(`댓글 작성 (${boardId}/${postId})`, async () => {
      const r = await fetch(`${LAWYGO}/api/board/${boardId}/${postId}/comments`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ co_content: "테스트 댓글" }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(JSON.stringify(j));
    });

    await check(`댓글 목록 (${boardId}/${postId})`, async () => {
      const r = await fetch(`${LAWYGO}/api/board/${boardId}/${postId}/comments`);
      const j = await r.json();
      if (!j.success) throw new Error(JSON.stringify(j));
    });
  }

  await check("공지 게시판 (notice) 목록", async () => {
    const r = await fetch(`${LAWYGO}/api/board/notice`);
    const j = await r.json();
    if (!j.success) throw new Error(JSON.stringify(j));
    if (j.source !== "lawygo") throw new Error(`source=${j.source}`);
  });

  await check("/api/notices 목록", async () => {
    const r = await fetch(`${LAWYGO}/api/notices`);
    const j = await r.json();
    if (!j.success) throw new Error(JSON.stringify(j));
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} 통과`);
  if (failed.length > 0) process.exit(1);
}

main();
