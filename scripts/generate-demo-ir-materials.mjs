/**
 * LawyGo IR 데모 자료 생성
 * - 데모 로그인 UI 클릭부터 전 기능 순차 시연
 * - 단계별 스크린샷 저장 + 설명 카드 + PDF
 * - Playwright 영상 녹화 (데모시연영상.webm)
 *
 * 사용: node scripts/generate-demo-ir-materials.mjs
 *       BASE_URL=https://lawygo.vercel.app node scripts/generate-demo-ir-materials.mjs
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { PDFDocument } from "pdf-lib";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");
const BASE = (process.env.BASE_URL || "https://lawygo.vercel.app").replace(/\/$/, "");
const OUT_DIR = resolve(root, "docs", "demo-ir");
const RAW_DIR = join(OUT_DIR, "screenshots");
const CARD_DIR = join(OUT_DIR, "cards");
const VIDEO_DIR = join(OUT_DIR, "video");
const PDF_PATH = join(OUT_DIR, "LawyGo-데모시연-IR자료.pdf");
const VIDEO_PATH = join(OUT_DIR, "LawyGo-데모시연영상.webm");
const MANIFEST_PATH = join(OUT_DIR, "demo-manifest.json");

const PAUSE_MS = Number(process.env.DEMO_PAUSE_MS || 2800);
const SCROLL_PAUSE_MS = Number(process.env.DEMO_SCROLL_MS || 1200);

/** @typedef {{ id: string; title: string; subtitle: string; description: string; category: string }} StepMeta */

/** @type {StepMeta[]} */
const STEP_META = [];

function ensureDirs() {
  for (const d of [OUT_DIR, RAW_DIR, CARD_DIR, VIDEO_DIR]) {
    mkdirSync(d, { recursive: true });
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function pause(page, ms = PAUSE_MS) {
  await page.waitForTimeout(ms);
}

async function snap(page, id, title, subtitle, description, category) {
  const rawPath = join(RAW_DIR, `${id}.png`);
  await page.screenshot({ path: rawPath, fullPage: false });
  STEP_META.push({ id, title, subtitle, description, category });
  console.log(`  📸 ${id} — ${title}`);
  return rawPath;
}

async function scrollToText(page, text) {
  const loc = page.getByText(text, { exact: false }).first();
  if ((await loc.count()) > 0) {
    await loc.scrollIntoViewIfNeeded();
    await page.waitForTimeout(SCROLL_PAUSE_MS);
  }
}

function buildCardHtml(step, screenshotB64, index, total) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1280px;
    font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
    background: linear-gradient(165deg, #0f172a 0%, #1e293b 40%, #312e81 100%);
    color: #f8fafc;
    padding: 40px 44px 48px;
  }
  .top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }
  .cat {
    background: rgba(99,102,241,0.35); border: 1px solid rgba(165,180,252,0.4);
    font-size: 12px; font-weight: 700; padding: 6px 12px; border-radius: 999px; color: #e0e7ff;
  }
  .idx { font-size: 13px; color: #94a3b8; margin-top: 8px; }
  h1 { font-size: 30px; font-weight: 800; letter-spacing: -0.02em; margin-top: 10px; }
  .sub { font-size: 15px; color: #cbd5e1; margin-top: 8px; line-height: 1.5; }
  .shot {
    background: #fff; border-radius: 14px; padding: 10px; margin: 20px 0;
    box-shadow: 0 20px 50px rgba(0,0,0,0.35);
  }
  .shot img { width: 100%; border-radius: 8px; display: block; }
  .desc {
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
    border-radius: 12px; padding: 18px 20px; font-size: 14px; line-height: 1.75; color: #e2e8f0;
  }
  .footer { margin-top: 16px; font-size: 11px; color: #64748b; }
</style>
</head>
<body>
  <div class="top">
    <div>
      <div class="cat">${escapeHtml(step.category)}</div>
      <div class="idx">${index} / ${total} · LawyGo IR 데모</div>
      <h1>${escapeHtml(step.title)}</h1>
      <p class="sub">${escapeHtml(step.subtitle)}</p>
    </div>
  </div>
  <div class="shot"><img src="data:image/png;base64,${screenshotB64}" alt="screenshot" /></div>
  <div class="desc">${escapeHtml(step.description)}</div>
  <div class="footer">${escapeHtml(BASE)} · ${new Date().toLocaleString("ko-KR")}</div>
</body>
</html>`;
}

async function buildCards(browser) {
  const total = STEP_META.length;
  /** @type {string[]} */
  const cardPaths = [];
  for (let i = 0; i < STEP_META.length; i++) {
    const step = STEP_META[i];
    const rawPath = join(RAW_DIR, `${step.id}.png`);
    if (!existsSync(rawPath)) continue;
    const cardPath = join(CARD_DIR, `${step.id}.png`);
    const screenshotB64 = readFileSync(rawPath).toString("base64");
    const html = buildCardHtml(
      { ...step, title: step.title, subtitle: step.subtitle, description: step.description, category: step.category },
      screenshotB64,
      i + 1,
      total
    );
    const htmlPath = join(OUT_DIR, `${step.id}.html`);
    writeFileSync(htmlPath, html, "utf8");
    const cardPage = await browser.newPage({ viewport: { width: 1280, height: 2200 } });
    await cardPage.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
    await cardPage.waitForTimeout(300);
    const h = await cardPage.evaluate(() => document.body.scrollHeight);
    await cardPage.setViewportSize({ width: 1280, height: Math.min(h + 24, 2600) });
    await cardPage.screenshot({ path: cardPath, fullPage: true });
    await cardPage.close();
    cardPaths.push(cardPath);
  }
  return cardPaths;
}

async function buildCoverCard(browser) {
  const html = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8" />
<style>
  body { width:1280px; margin:0; font-family:"Malgun Gothic",sans-serif;
    background:linear-gradient(135deg,#0c4a6e,#312e81 55%,#4c1d95); color:white; padding:72px 64px; min-height:720px; }
  .logo { font-size:14px; letter-spacing:0.2em; color:#a5f3fc; font-weight:700; }
  h1 { font-size:46px; margin:16px 0 12px; line-height:1.15; }
  p { font-size:18px; line-height:1.75; color:#e2e8f0; margin:10px 0; }
  .box { margin-top:40px; background:rgba(255,255,255,0.1); border-radius:18px; padding:32px; border:1px solid rgba(255,255,255,0.15); }
  .stat { font-size:24px; font-weight:800; color:#fde68a; margin-top:12px; }
  ul { margin-top:16px; padding-left:20px; font-size:15px; line-height:1.8; color:#cbd5e1; }
</style></head><body>
  <div class="logo">LAWYGO · LEGAL TECH IR</div>
  <h1>LawyGo 법무관리시스템<br/>데모 시연 자료</h1>
  <p>데모 로그인부터 대시보드·사건·게시판·AI 워크스페이스·관리자까지<br/>실제 프로덕션 환경에서 기능을 순차 검증한 IR용 자료입니다.</p>
  <div class="box">
    <p>검증 URL: ${escapeHtml(BASE)}</p>
    <p>생성일: ${new Date().toLocaleString("ko-KR")}</p>
    <p class="stat">총 ${STEP_META.length}단계 스크린캡처 · 영상 포함</p>
    <ul>
      <li>3요소 인증 + Google OAuth + DEMO 체험 로그인</li>
      <li>업무 대시보드 — 공지·기일·통계·담당사건·결재</li>
      <li>사건·기일·결재·재무·고객·메신저·게시판·AI 법률백과</li>
      <li>관리자 — 사용자·사건·배너·게시판·보안 관제</li>
    </ul>
  </div>
</body></html>`;
  const htmlPath = join(OUT_DIR, "00-cover.html");
  writeFileSync(htmlPath, html, "utf8");
  const coverPath = join(CARD_DIR, "00-cover.png");
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: coverPath, fullPage: true });
  await page.close();
  return coverPath;
}

async function embedImagePage(pdf, imagePath) {
  if (!existsSync(imagePath)) return;
  const imgBytes = readFileSync(imagePath);
  const png = await pdf.embedPng(imgBytes);
  const pageW = 595;
  const pageH = 842;
  const margin = 20;
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2;
  const scale = Math.min(maxW / png.width, maxH / png.height, 1);
  const drawW = png.width * scale;
  const drawH = png.height * scale;
  const page = pdf.addPage([pageW, pageH]);
  page.drawImage(png, {
    x: (pageW - drawW) / 2,
    y: pageH - margin - drawH,
    width: drawW,
    height: drawH,
  });
}

async function buildPdf(browser) {
  const pdf = await PDFDocument.create();
  const cover = await buildCoverCard(browser);
  await embedImagePage(pdf, cover);
  for (const step of STEP_META) {
    await embedImagePage(pdf, join(CARD_DIR, `${step.id}.png`));
  }
  writeFileSync(PDF_PATH, await pdf.save());
}

async function visitPage(page, id, title, path, subtitle, description, category) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 90000 });
  await pause(page);
  if (page.url().includes("/login") && path !== "/login") {
    console.warn(`  ⚠ ${title}: 로그인 리다이렉트`);
  }
  await snap(page, id, title, subtitle, description, category);
}

/** @param {import('playwright').Page} page */
async function runDemoFlow(page) {
  console.log("\n=== 1. 로그인 · 데모 체험 ===");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 90000 });
  await pause(page, 2000);
  await snap(
    page,
    "01-login",
    "로그인 화면",
    "3요소 인증 · Google OAuth · DEMO 체험",
    "아이디·비밀번호·관리번호 3요소 인증과 Google OAuth, DEMO 버튼을 통한 체험 로그인을 제공합니다. 승인된 회원만 운영 환경에서 세션이 발급됩니다.",
    "인증"
  );

  const demoBtn = page.getByRole("button", { name: "DEMO" });
  if ((await demoBtn.count()) > 0) {
    await demoBtn.click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30000 }).catch(() => {});
    await pause(page, 3500);
    await snap(
      page,
      "02-demo-login",
      "DEMO 로그인 완료",
      "체험판 관리번호 10000 · 즉시 대시보드 진입",
      "DEMO 버튼 클릭 시 체험판 관리번호(10000) 계정으로 즉시 로그인되어 업무 대시보드로 이동합니다. IR 시연·UI 체험에 최적화된 진입 경로입니다.",
      "인증"
    );
  } else {
    await page.request.post(`${BASE}/api/auth/demo`);
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await pause(page);
    await snap(page, "02-demo-login", "DEMO 로그인 (API)", "API 데모 세션", "DEMO UI 대신 API 데모 로그인으로 세션을 발급했습니다.", "인증");
  }

  console.log("\n=== 2. 업무 대시보드 (섹션별) ===");
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 90000 });
  await pause(page, 4000);
  await snap(
    page,
    "03-dashboard-overview",
    "업무 대시보드 전체",
    "한 화면에서 사무소 업무 현황 파악",
    "진행 사건 수, 다가오는 기일, 내 담당 사건, 결재·공지·수임료 현황을 한 화면에서 확인합니다. Framer Motion 기반 카드 UI로 직관적인 업무 우선순위를 제공합니다.",
    "대시보드"
  );

  await scrollToText(page, "공지사항");
  await snap(
    page,
    "04-dashboard-notices",
    "대시보드 — 공지사항",
    "검색·페이지네이션 · 게시판 연동",
    "테넌트 게시판과 연동된 공지사항을 대시보드에서 바로 검색·조회합니다. 클릭 시 팝업으로 상세 내용을 확인할 수 있습니다.",
    "대시보드"
  );

  await scrollToText(page, "기일 현황");
  await snap(
    page,
    "05-dashboard-deadlines",
    "대시보드 — 기일 현황",
    "오늘·3일·7일 내 기일 우선 표시",
    "법원 기일을 D-Day 기준으로 오늘·3일·7일 구간별로 시각화합니다. 긴급 기일을 놓치지 않도록 색상·배지로 강조합니다.",
    "대시보드"
  );

  await scrollToText(page, "전체 진행 사건");
  await snap(
    page,
    "06-dashboard-stats",
    "대시보드 — KPI 통계",
    "진행사건 · 결재 · 미수 · 수납",
    "전체 진행 사건, 결재 대기, 미수 청구, 이번 달 수납 등 핵심 KPI를 StatCard로 표시합니다. 재무 모듈과 실시간 연동됩니다.",
    "대시보드"
  );

  await scrollToText(page, "내 담당 사건");
  await snap(
    page,
    "07-dashboard-my-cases",
    "대시보드 — 내 담당 사건",
    "담당자 배정 사건 · D-Day · 전자사건",
    "로그인 사용자에게 배정된 사건을 테이블로 표시합니다. 사건번호 클릭 시 상세 페이지로 이동하며, 전자사건·D-Day 배지를 지원합니다.",
    "대시보드"
  );

  await scrollToText(page, "결재");
  await snap(
    page,
    "08-dashboard-approvals",
    "대시보드 — 결재 현황",
    "대기·진행·완료 결재 한눈에",
    "전자결재 모듈과 연동된 결재 대기·진행 문서를 대시보드에서 확인합니다. 기안·승인 워크플로로 바로 이동할 수 있습니다.",
    "대시보드"
  );

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await pause(page);
  await snap(
    page,
    "09-dashboard-upcoming",
    "대시보드 — 다가오는 기일",
    "14일 이내 기일 사건 목록",
    "다음 14일 이내 기일이 있는 사건을 우측 패널에 표시합니다. 기일 관리 팝업으로 바로 연결됩니다.",
    "대시보드"
  );

  console.log("\n=== 3. 핵심 업무 모듈 ===");
  const modules = [
    ["10-cases", "사건 관리", "/cases", "사건번호·당사자·담당·상태 필터", "사건번호·당사자·담당자·상태별 목록 조회, 필터, 모바일 테이블, 상세·수정·신규 등록을 지원합니다. management_number 기반 테넌트 격리.", "사건"],
    ["11-cases-new", "사건 등록", "/cases/new", "신규 사건 빠른 등록", "사건번호·의뢰인·사건명·법원·담당자 등 핵심 필드를 입력하여 신규 사건을 등록합니다.", "사건"],
    ["12-calendar", "기일 달력", "/calendar", "법원 기일·내부 일정 캘린더", "법원 기일·내부 일정을 월간 캘린더로 표시하고 기일 업로드·관리 기능을 제공합니다.", "기일"],
    ["13-approval", "전자결재", "/approval", "기안·승인·반려 워크플로", "결재 대기·진행·완료 문서를 조회하고 기안·승인·반려 워크플로를 처리합니다.", "결재"],
    ["14-finance", "회계/수납", "/finance", "수임료·입금·미수금 관리", "사건별 수임료·입금·미수금 현황을 관리합니다. 대시보드 KPI와 연동됩니다.", "재무"],
    ["15-clients", "고객 관리", "/clients", "의뢰인 CRM · 상담 메모", "의뢰인·연락처·상담 메모를 CRM 형태로 관리합니다.", "고객"],
    ["16-consultation", "상담관리", "/consultation", "상담 접수·회의실 예약", "신규 상담 접수·이력 관리·회의실(상담실) 예약 기능을 제공합니다.", "상담"],
    ["17-messenger", "메신저", "/messenger", "카카오·SMS·텔레그램 연동", "외부 메신저 채널 연동 및 사전발송 양식 관리를 지원합니다.", "메신저"],
    ["18-internal-messenger", "사내 메신저", "/internal-messenger", "직원 간 실시간 채팅", "직원 간 실시간 메시지·채팅·알림 연동을 제공합니다.", "메신저"],
    ["19-staff", "직원 관리", "/staff", "조직 구성원 · 권한", "승인된 site_users를 직원 목록으로 표시하고 조직을 관리합니다.", "조직"],
    ["20-stats", "통계/분석", "/stats", "사건·수임·업무 통계", "사건·수임·업무 통계를 차트와 표로 제공합니다.", "통계"],
    ["21-notifications", "알림 설정", "/notifications", "결재·기일·시스템 알림", "결재·기일·시스템 알림을 수신·확인합니다.", "알림"],
    ["22-settings", "시스템 설정", "/settings", "개인 프로필·환경 설정", "개인 프로필·비밀번호·환경 설정을 변경합니다.", "설정"],
  ];
  for (const [id, title, path, sub, desc, cat] of modules) {
    await visitPage(page, id, title, path, sub, desc, cat);
  }

  console.log("\n=== 4. 게시판 · AI 워크스페이스 ===");
  await visitPage(
    page,
    "23-board",
    "게시판 허브",
    "/board",
    "공지·자유게시판 · AI 워크스페이스",
    "사내 공지·자료 게시판과 AI·문서 엔진 허브를 제공합니다. 네이티브 Supabase 게시판과 G6 브릿지를 지원합니다.",
    "게시판"
  );

  const aiFeatures = [
    ["24-ai-encyclopedia", "로이고법률백과", "/board/ai/legal_encyclopedia", "특허 기반 AI 법률정보사전", "특허 기반 AI 딥러닝·순위화·온톨로지·모범답안을 다면적 프레임 UI로 제공합니다.", "AI"],
    ["25-ai-case-search", "판례 자동 추천", "/board/ai/case_search", "유사 판례·쟁점 파악", "현재 사건과 유사한 판례 검색·쟁점 파악을 AI로 지원합니다.", "AI"],
    ["26-ai-doc-summary", "판결문 PDF 요약", "/board/ai/doc_summary", "OCR · 구조화 요약", "PDF·스캔 이미지 OCR 후 구조화된 포맷으로 빠르게 요약합니다.", "AI"],
    ["27-ai-doc-draft", "법률문서 자동작성", "/board/ai/doc_draft", "검증된 서면 초안", "법률문서 형식에 맞도록 검증된 초안을 AI가 작성합니다.", "AI"],
    ["28-ai-law-search", "법률검색", "/board/ai/law_search", "법령·조문 검색", "법령·조문 검색 및 해석을 지원합니다.", "AI"],
    ["29-ai-search", "AI 검색", "/board/ai/ai_search", "자연어 통합 검색", "법률·판례 통합 자연어 질의 검색을 제공합니다.", "AI"],
  ];
  for (const [id, title, path, sub, desc, cat] of aiFeatures) {
    await visitPage(page, id, title, path, sub, desc, cat);
  }

  await visitPage(
    page,
    "30-board-notice",
    "공지사항 게시판",
    "/board/notice",
    "테넌트 공지 · 대시보드 연동",
    "사무소 공지사항 게시판입니다. 대시보드 공지 위젯과 연동됩니다.",
    "게시판"
  );

  console.log("\n=== 5. 관리자 콘솔 ===");
  const adminPages = [
    ["31-admin-hub", "관리자 허브", "/admin", "사용자·사건·보안·설정 진입점", "사용자·사건·보안·메뉴·회사그룹·통합설정 등 관리 기능 진입점입니다.", "관리자"],
    ["32-admin-users", "사용자 관리", "/admin/users", "가입승인·권한·퇴사 lifecycle", "LawTop 스타일 가입승인·권한·퇴사/제외 lifecycle 관리.", "관리자"],
    ["33-admin-cases", "사건관리 (관리자)", "/admin/cases", "대량 등록·일괄 편집", "대량 엑셀 등록, 전체 사건 목록 검색·필터, 일괄 담당 변경 등.", "관리자"],
    ["34-admin-bulk-staff", "사건담당 일괄변경", "/admin/cases/bulk-staff", "담당·보조 일괄 배정", "주담당·보조 IN/OUT·주처리자를 다수 사건에 일괄 적용합니다.", "관리자"],
    ["35-admin-boards", "게시판 관리", "/admin/g6", "네이티브 게시판 CRUD", "Supabase 네이티브 게시판·게시물을 LawyGo 관리자에서 직접 관리합니다.", "관리자"],
    ["36-admin-banners", "배너광고 관리", "/admin/banners", "법률백과 광고판", "로이고법률백과 우측 광고판 — 이미지·URL·순서·WYSIWYG 미리보기.", "관리자"],
    ["37-admin-menus", "메뉴 관리", "/admin/menus", "LNB·모바일 메뉴 편집", "이용자 화면 LNB·모바일 메뉴를 등록·편집·순서 변경합니다.", "관리자"],
    ["38-admin-settings", "시스템 설정", "/admin/settings", "테마·연동·권한", "테마, 알림, Drive·AI·법령 API 연동, 권한 등 전체 시스템 설정.", "관리자"],
    ["39-admin-company", "회사·조직 관리", "/admin/company-groups", "관리번호·구성원", "관리번호 목록·등록, 조직 폴더, 구성원 배치, Google 가입 승인.", "관리자"],
    ["40-admin-materials", "자료관리", "/admin/materials", "Drive 자료실", "Google Drive 회사·사건·백과 자료 검색·업로드·관리.", "관리자"],
  ];
  for (const [id, title, path, sub, desc, cat] of adminPages) {
    await visitPage(page, id, title, path, sub, desc, cat);
  }

  console.log("\n=== 6. 랜딩 · 마무리 ===");
  await visitPage(
    page,
    "41-landing",
    "랜딩 페이지",
    "/landing",
    "서비스 소개 · 가입 유도",
    "LawyGo 서비스 소개 및 가입 유도 랜딩 페이지입니다.",
    "마케팅"
  );

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await pause(page, 2000);
  await snap(
    page,
    "42-dashboard-final",
    "데모 시연 완료",
    "LawyGo — All-in-One 법무관리",
    "데모 로그인부터 대시보드·업무 모듈·AI·관리자까지 전 기능 시연이 완료되었습니다. LawyGo는 법률사무소의 디지털 전환을 위한 All-in-One 법무관리 SaaS입니다.",
    "마무리"
  );
}

async function main() {
  ensureDirs();
  console.log(`\n🎬 LawyGo IR 데모 자료 생성 (${BASE})`);
  console.log(`   출력: ${OUT_DIR}\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "ko-KR",
    recordVideo: { dir: VIDEO_DIR, size: { width: 1440, height: 900 } },
  });

  const page = await context.newPage();

  try {
    await runDemoFlow(page);
  } finally {
    await page.close();
    await context.close();
  }

  const videoFiles = await import("node:fs/promises").then((fs) =>
    fs.readdir(VIDEO_DIR).catch(() => [])
  );
  const webm = videoFiles.find((f) => f.endsWith(".webm"));
  if (webm) {
    copyFileSync(join(VIDEO_DIR, webm), VIDEO_PATH);
    console.log(`\n🎥 영상 저장: ${VIDEO_PATH}`);
  }

  console.log("\n=== 카드 이미지 · PDF 생성 ===");
  await buildCards(browser);
  await buildPdf(browser);

  writeFileSync(
    MANIFEST_PATH,
    JSON.stringify(
      {
        baseUrl: BASE,
        generatedAt: new Date().toISOString(),
        stepCount: STEP_META.length,
        steps: STEP_META,
        outputs: {
          screenshots: RAW_DIR,
          cards: CARD_DIR,
          pdf: PDF_PATH,
          video: existsSync(VIDEO_PATH) ? VIDEO_PATH : null,
        },
      },
      null,
      2
    ),
    "utf8"
  );

  await browser.close();

  console.log("\n✅ 완료");
  console.log(`   스크린샷: ${RAW_DIR} (${STEP_META.length}장)`);
  console.log(`   카드:     ${CARD_DIR}`);
  console.log(`   PDF:      ${PDF_PATH}`);
  if (existsSync(VIDEO_PATH)) console.log(`   영상:     ${VIDEO_PATH}`);
  console.log(`   매니페스트: ${MANIFEST_PATH}`);
}

main().catch((e) => {
  console.error("\n❌ 실패:", e);
  process.exit(1);
});
