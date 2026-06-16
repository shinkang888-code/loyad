/**
 * 자료실 종합 검증 — 회사 자료실 + 사건별 자료실 (Drive)
 * node scripts/test-materials-room.mjs
 * BASE_URL=https://lawygo.vercel.app node scripts/test-materials-room.mjs
 */
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const BASE = process.env.BASE_URL || "https://lawygo.vercel.app";

const errors = [];
function assert(cond, msg) {
  if (!cond) errors.push(msg);
}
function ok(label, detail = "") {
  console.log(`OK: ${label}${detail ? ` — ${detail}` : ""}`);
}

function loadEnv() {
  const out = {};
  for (const file of [".env.production.local", ".env.local", "bot/.env"]) {
    const p = path.join(root, file);
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

async function demoLogin() {
  const auth = await fetch(`${BASE}/api/auth/demo`, { method: "POST" });
  let cookie = "";
  for (const c of auth.headers.getSetCookie?.() ?? []) {
    const p = c.split(";")[0];
    if (p.startsWith("lawygo_session=")) cookie = p;
  }
  if (!cookie) throw new Error(`demo login failed (${auth.status})`);
  return cookie;
}

async function api(cookie, pathSuffix, opts = {}) {
  const res = await fetch(`${BASE}${pathSuffix}`, {
    ...opts,
    headers: { Cookie: cookie, ...(opts.headers ?? {}) },
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { res, json, text };
}

async function main() {
  console.log(`=== 자료실 종합 검증 (${BASE}) ===\n`);
  const env = loadEnv();
  const cookie = await demoLogin();
  ok("데모 로그인");

  const status = await api(cookie, "/api/drive/status");
  assert(status.res.ok, `Drive 상태 실패: ${status.res.status}`);
  assert(status.json.available === true, "Drive available=false");
  ok("Drive 연동", status.json.oauthDelegateEmail ?? "OAuth");

  // 회사 자료실
  const testName = `lawygo-room-test-${Date.now()}.txt`;
  const testContent = `LawyGo materials room ${new Date().toISOString()}`;
  const fd = new FormData();
  fd.append("file", new Blob([testContent], { type: "text/plain" }), testName);

  const uploadRes = await fetch(`${BASE}/api/drive/company-files/upload`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: fd,
  });
  const uploadJson = await uploadRes.json();
  assert(uploadRes.ok && uploadJson.fileId, `회사 자료실 업로드 실패: ${uploadJson.error}`);
  const companyFileId = uploadJson.fileId;
  ok("회사 자료실 업로드", companyFileId);

  const renamed = `room-renamed-${Date.now()}.txt`;
  const patch = await api(cookie, `/api/drive/company-files/${companyFileId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: renamed }),
  });
  assert(patch.res.ok && patch.json.ok, `이름변경 실패: ${patch.json.error}`);
  ok("회사 자료실 이름변경", renamed);

  const dl = await fetch(`${BASE}/api/drive/company-files/download/${companyFileId}`, {
    headers: { Cookie: cookie },
  });
  const dlBody = await dl.text();
  assert(dl.ok, `다운로드 실패: ${dl.status}`);
  assert(dlBody.includes("LawyGo materials room"), "다운로드 내용 불일치");
  ok("회사 자료실 다운로드");

  const preview = await fetch(
    `${BASE}/api/drive/company-files/download/${companyFileId}?inline=1`,
    { headers: { Cookie: cookie } }
  );
  assert(preview.ok, `미리보기(inline) 실패: ${preview.status}`);
  ok("회사 자료실 미리보기");

  const list = await api(cookie, `/api/drive/company-files?q=${encodeURIComponent(renamed)}`);
  assert(list.res.ok, `목록 검색 실패`);
  assert(
    (list.json.files ?? []).some((f) => f.fileId === companyFileId),
    "검색 결과에 파일 없음"
  );
  ok("회사 자료실 탐색/검색");

  // 사건 자료실
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn("SKIP: 사건 자료실 — Supabase env 없음");
  } else {
    const db = createClient(url, key);
    const { data: caseRow } = await db
      .from("cases")
      .select("id, case_number, management_number")
      .eq("management_number", "10000")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    assert(caseRow?.id, "데모 관리번호(10000) 사건 없음");
    if (caseRow?.id) {
      const caseId = caseRow.id;
      const caseTestName = `lawygo-case-room-${Date.now()}.txt`;
      const caseFd = new FormData();
      caseFd.append("file", new Blob([testContent], { type: "text/plain" }), caseTestName);
      caseFd.append("caseId", caseId);

      const caseUploadRes = await fetch(`${BASE}/api/case-files/upload`, {
        method: "POST",
        headers: { Cookie: cookie },
        body: caseFd,
      });
      const caseUploadJson = await caseUploadRes.json();
      assert(
        caseUploadRes.ok && caseUploadJson.data?.id,
        `사건 자료실 업로드 실패: ${caseUploadJson.error ?? caseUploadRes.status}`
      );
      assert(
        caseUploadJson.storageMode === "drive" && caseUploadJson.data?.driveFileId,
        `사건 파일이 Drive에 저장되지 않음 (mode=${caseUploadJson.storageMode})`
      );
      const caseFileDbId = caseUploadJson.data.id;
      const driveFileId = caseUploadJson.data.driveFileId;
      ok("사건 자료실 업로드", `${caseRow.case_number} → ${driveFileId}`);

      const caseList = await api(cookie, `/api/case-files?caseId=${encodeURIComponent(caseId)}`);
      assert(caseList.res.ok, "사건 파일 목록 실패");
      assert(
        (caseList.json.files ?? []).some((f) => f.id === caseFileDbId),
        "사건 목록에 파일 없음"
      );
      ok("사건 자료실 목록");

      const globalList = await api(
        cookie,
        `/api/drive/company-files?q=${encodeURIComponent(caseTestName)}`
      );
      assert(
        (globalList.json.files ?? []).some((f) => f.fileId === driveFileId),
        "전체 자료실에서 사건 파일 미표시"
      );
      ok("전체 자료실 사건 파일 통합 탐색");

      const caseDl = await fetch(`${BASE}/api/drive/download/${driveFileId}`, {
        headers: { Cookie: cookie },
      });
      assert(caseDl.ok, `사건 파일 다운로드 실패: ${caseDl.status}`);
      ok("사건 파일 다운로드");

      const caseRenamed = `case-renamed-${Date.now()}.txt`;
      const casePatch = await api(cookie, "/api/case-files", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: caseFileDbId, type: "file", fileName: caseRenamed }),
      });
      assert(casePatch.res.ok, `사건 파일 이름변경 실패: ${casePatch.json.error}`);
      ok("사건 파일 이름변경(Drive 동기화)");

      const caseDel = await api(
        cookie,
        `/api/case-files?id=${encodeURIComponent(caseFileDbId)}&type=file`,
        { method: "DELETE" }
      );
      assert(caseDel.res.ok, `사건 파일 삭제 실패: ${caseDel.json.error}`);
      ok("사건 파일 삭제(Drive 휴지통)");

      const afterDel = await api(
        cookie,
        `/api/drive/company-files?q=${encodeURIComponent(caseRenamed)}`
      );
      const still = (afterDel.json.files ?? []).some((f) => f.fileId === driveFileId);
      assert(!still, "삭제 후 전체 자료실에 사건 파일 잔존");
      ok("사건 파일 삭제 확인");
    }
  }

  const delCompany = await api(cookie, `/api/drive/company-files/${companyFileId}`, {
    method: "DELETE",
  });
  assert(delCompany.res.ok, `회사 자료실 삭제 실패: ${delCompany.json.error}`);
  ok("회사 자료실 삭제");

  if (errors.length) {
    errors.forEach((e) => console.error("FAIL:", e));
    process.exit(1);
  }

  console.log("\n=== 자료실 종합 검증 전체 통과 ===");
}

main().catch((e) => {
  console.error("\n❌ 검증 실패:", e.message || e);
  process.exit(1);
});
