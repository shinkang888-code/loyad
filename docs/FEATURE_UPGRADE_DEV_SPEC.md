# LawyGo(Loyad) 기능 업그레이드 개발명세서

> **문서 버전:** v1.0  
> **작성일:** 2026-06-16  
> **대상 저장소:** `https://github.com/Loyad/Loyad`  
> **분석 기준 코드베이스:** `LawyGo` (`C:\Users\user\.cursor\lawygo`, v0.1.0)  
> **프로덕션 URL:** `https://lawygo.vercel.app`

---

## 0. 문서 범위 및 전제

### 0.1 분석 대상

| 항목 | 상태 |
|------|------|
| Loyad GitHub 리포 (`C:\cursor\loyad\Loyad`) | **빈 저장소** (.git 메타데이터만 존재, 커밋 0건) |
| 실제 운영 코드 | **LawyGo** 프로젝트 (Next.js 16 + Supabase SaaS) |
| GitHub 원격 | Loyad/Loyad (빈 repo) · shinkang888-code/lawygo (실제 소스) |

본 명세서는 Loyad 리포에 소스가 아직 없으므로, **연관 프로젝트 LawyGo 전체 코드·DB·기획 문서(66건)를 정적 분석**하여 작성하였다. 향후 Loyad 리포에 LawyGo 소스를 이관·통합할 때 본 문서를 기준 개발명세로 사용한다.

### 0.2 목적

1. 현재 구현된 기능을 모듈별로 인벤토리화한다.
2. 코드·기획 문서·QA 결과 간 **갭(Gap)** 을 식별한다.
3. 기능 업그레이드를 **우선순위·Phase·수용 기준**과 함께 정의한다.
4. 신규 개발 시 준수해야 할 **아키텍처·테넌트·보안 규칙**을 명시한다.

### 0.3 참조 문서

| 문서 | 경로 (LawyGo 기준) |
|------|-------------------|
| LawTop GL 레거시 분석 | `docs/LAWTOP_GL_ANALYSIS.md` |
| AI 백과 통합 기획 | `docs/planning/legal-encyclopedia-unified-architecture.md` |
| HDL 원장 명세 | `docs/planning/hybrid-ledger-lawygo-spec.md` |
| 플랫폼 관리번호 전환 | `docs/planning/platform-admin-tenant-switch.md` |
| 회계 오픈뱅킹 기획 | `docs/finance-toss-api-plan.md` |
| Drive 저장 마이그레이션 | `docs/google-drive-storage-plan.md` |
| SCourt 연동 | `docs/scourt-case-search-integration.md` |
| 모바일 UI 개선 | `docs/mobile-ui-improvement-spec.md` |
| QA 결과 (18 PASS) | `docs/qa/final-qa-results.json` |

---

## 1. 제품 개요

### 1.1 제품 정의

**LawyGo**는 법무법인·로펌을 위한 **멀티테넌트 송무 ERP SaaS**이다. 구 LawTop GL(데스크톱 송무 ERP)의 핵심 모듈을 웹으로 재구현하고, AI 법률백과·대법원 기일 연동·Google Drive 자료실·하이브리드 분산 원장(HDL) 감사·구독 결제까지 확장한 **법무 운영 OS**를 목표로 한다.

### 1.2 핵심 사용자

| 역할 | 설명 |
|------|------|
| 변호사·담당자 | 사건·기일·결재·자료·AI 도구 사용 |
| 사무장·회계 | 수납·청구·계좌 매칭 |
| 테넌트 관리자 | 직원·권한·조직·설정 |
| 플랫폼 관리자 | 전체 회사 관리, 관리번호 전환, 구독·보안 |

### 1.3 테넌트 모델

- **격리 키:** `management_number` (관리번호)
- **인증:** 커스텀 세션 쿠키 (`lawygo_session`, HMAC) + `site_users` (bcrypt)
- **구독 게이트:** `tenant_subscriptions` + Stripe/Danal
- **파일 저장:** Google Drive (`{management_number}/cases/{caseId}/files`)

---

## 2. 기술 아키텍처 (As-Is)

### 2.1 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 16.1.6 (App Router), React 19, TypeScript |
| UI | Tailwind CSS 4, Radix UI, Framer Motion, Lucide, Sonner |
| Backend/DB | Supabase (PostgreSQL), 46개 마이그레이션 |
| 파일 | Google Drive (Service Account + OAuth) |
| AI | Gemini, OpenAI (`/api/ai/*`) |
| 결제 | Stripe 22.x, Danal |
| 배포 | Vercel (Cron 2건) |
| 모바일 | PWA + Android TWA (Bubblewrap) |
| 레거시 | G6(그누보드6) — 네이티브 게시판 전환 중 |

### 2.2 규모 (정적 분석)

| 항목 | 수량 |
|------|------|
| 페이지 라우트 | 79+ |
| API Route Handlers | 148 |
| React 컴포넌트 | 135+ |
| lib 모듈 | 225+ |
| DB 마이그레이션 | 46 |
| npm test 스크립트 | 40+ |

### 2.3 시스템 구성도

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js (Vercel)                                           │
│  Pages(79) · API(148) · Components(135) · Lib(225)          │
└──────────┬──────────────┬──────────────┬────────────────────┘
           │              │              │
     Supabase PG    Google Drive    Stripe/Danal
           │              │              │
     46 migrations   OAuth/SA      구독·결제
           │
     ┌─────┴─────┬─────────────┬──────────────┐
     │           │             │              │
  SCourt Bot  Gemini/OpenAI  G6(레거시)   HDL Worker
  (Railway)   법률백과 AI    게시판       (Cron 06:30)
  Cron 06:00
```

### 2.4 Vercel Cron

| 스케줄 | 엔드포인트 | 용도 |
|--------|-----------|------|
| `0 6 * * *` | `/api/cron/court-deadline-sync` | 대법원 기일 자동 동기화 |
| `30 6 * * *` | `/api/cron/ledger` | HDL 원장 Merkle·앵커 워커 |

---

## 3. 현재 기능 인벤토리

### 3.1 송무 코어

| 모듈 | 경로 | 구현 상태 | DB 연동 |
|------|------|-----------|---------|
| 대시보드 | `/` | ✅ 완료 | Supabase + mock 폴백 |
| 사건 그리드 | `/cases` | ✅ 완료 | `cases`, 필터·엑셀·모바일 |
| 사건 상세 | `/cases/[id]` | ✅ 완료 | 타임라인, 당사자, 기관 |
| 사건 등록/수정 | `/cases/new`, `/cases/[id]/edit` | ✅ 완료 | |
| 기일 달력 | `/calendar` | ✅ 완료 | `deadlines` |
| SCourt 검색 | `/cases/scourt-search` | ⚠️ 부분 | 봇 연동, OpenAPI 미완 |
| 사건 변경 이력 | `/cases/history` | ✅ 완료 | `case_audit_logs` |

### 3.2 CRM·커뮤니케이션

| 모듈 | 경로 | 구현 상태 | 비고 |
|------|------|-----------|------|
| 의뢰인 관리 | `/clients` | ✅ 완료 | 엑셀 import |
| 상담 관리 | `/consultation` | ⚠️ 부분 | mockData 폴백 잔존 |
| 외부 메신저 | `/messenger` | ✅ 완료 | Kakao/SMS/Telegram |
| 사내 메신저 | `/internal-messenger` | ✅ 완료 | `internal_messages` |
| 공지 | `/notices` | ✅ 완료 | `notices` |

### 3.3 업무·재무

| 모듈 | 경로 | 구현 상태 | 비고 |
|------|------|-----------|------|
| 전자결재 | `/approval` | ✅ 완료 | LawTop 유형, soft delete |
| 회계/수납 | `/finance` | ⚠️ 부분 | UI·DB 있음, 오픈뱅킹 미연동 |
| 통계 | `/stats` | ✅ 기본 | LawTop Reports parity 미달 |
| 직원 관리 | `/staff` | ✅ 완료 | `staff` + `site_users` |

### 3.4 게시판·AI

| 모듈 | 경로 | 구현 상태 | 비고 |
|------|------|-----------|------|
| 네이티브 게시판 | `/board` | ⚠️ 전환 중 | G6 브릿지 병행 |
| AI 문서엔진 6종 | `/board/ai/[featureId]` | ⚠️ 부분 | localStorage 저장 |
| 로이고법률백과 | `legal_encyclopedia` | ✅ 기본 | Supabase `legal_*` |
| 판례 추천 | `case_search` | ✅ | |
| PDF/OCR 요약 | `doc_summary` | ✅ | |
| 서면 작성 | `doc_draft` | ✅ | |
| 법령 검색 | `law_search` | ✅ | law.go.kr API |
| AI 통합 검색 | `ai_search` | ✅ | |

### 3.5 관리자 (`/admin`)

| 모듈 | 경로 | 상태 |
|------|------|------|
| 회사·조직 | `/admin/company-groups` | ✅ |
| 사용자 관리 | `/admin/users` | ✅ LawTop lifecycle |
| 보안 SOC | `/admin/security` | ✅ |
| HDL 원장 | `/admin/ledger` | ✅ Phase 1 |
| 배너 광고 | `/admin/banners` | ✅ |
| 메뉴 관리 | `/admin/menus` | ✅ |
| 시스템 설정 | `/admin/settings/*` | ✅ 10+ 하위 설정 |
| 자료관리(Drive) | `/admin/materials` | ✅ |
| 사건 일괄 작업 | `/admin/cases/bulk-staff` | ✅ |

### 3.6 인증·온보딩·마케팅

| 모듈 | 경로 | 상태 |
|------|------|------|
| 로그인/회원가입 | `/login`, `/login/signup` | ✅ |
| Google OAuth | `/api/auth/google/*` | ✅ |
| 구독 결제 | Stripe/Danal checkout | ✅ |
| 마케팅 사이트 | `/www`, `/landing` | ✅ |
| PWA/TWA | `android-twa/` | ⚠️ 스크립트 존재, 스토어 미확인 |

---

## 4. 데이터베이스 엔티티 요약

### 4.1 도메인별 테이블

| 도메인 | 주요 테이블 |
|--------|------------|
| 송무 | `cases`, `deadlines`, `case_parties`, `case_institutions`, `case_audit_logs`, `case_folders`, `case_files` |
| CRM | `clients`, `consultations`, `staff` |
| 결재 | `approvals`, `approval_steps`, `approval_actions`, `approval_delete_audit_logs` |
| 회계 | `finance_entries`, `bank_transactions`, `linked_accounts`, `billing_items`, `billing_schedules`, `tax_documents` |
| 커뮤니케이션 | `notifications`, `notices`, `internal_messages` |
| 인증·설정 | `site_users`, `site_menus`, `app_settings`, `company_groups`, `company_organizations` |
| 사용자 관리 | `user_admin_audit_logs`, `user_memos` |
| 구독 | `tenant_subscriptions`, `subscription_payment_events` |
| AI 백과 | `legal_ontology_entries`, `legal_vectors`, `legal_usage_records`, `legal_feature_weights`, `legal_documents`, `encyclopedia_projects`, `encyclopedia_artifacts` |
| 게시판 | `boards`, `board_posts`, `board_comments` |
| 보안 | `security_events`, `security_audit_runs` |
| HDL | `identity_verification_hashes`, `ledger_transactions`, `ledger_blocks`, `ledger_anchors`, `ledger_integrity_alerts` |
| SCourt | `scourt_search_jobs` |

### 4.2 신규 테이블 추가 규칙

- 모든 테이블에 `management_number` (또는 FK를 통한 테넌트 스코프) 필수
- 마이그레이션 파일명: `YYYYMMDDHHMMSS_description.sql`
- RLS 정책 및 service role API 경계 검토 필수

---

## 5. 갭 분석 (As-Is vs To-Be)

### 5.1 Critical — 데이터 정합성·핵심 가치

| ID | 갭 | 현재 | 목표 | 근거 |
|----|-----|------|------|------|
| G-01 | AI 산출물 저장 | localStorage (`lawygo_ai_docs`) | Supabase + Drive 이중 저장 | `legal-encyclopedia-unified-architecture.md` |
| G-02 | AI 프로젝트 통합 | 6기능 독립 UI | `(의뢰인+사건)` 프로젝트 워크스페이스 | 동일 |
| G-03 | G6 게시판 의존 | G6 브릿지 + 네이티브 병행 | 네이티브 100% 전환 | `boardService.ts` 전환 진행 중 |
| G-04 | localStorage 잔존 | 상담·메모·AI·자료실 일부 | Supabase/Drive 전환 | `google-drive-storage-plan.md` |
| G-05 | SCourt OpenAPI | `scourtApi.ts` TODO | 공식 API + 봇 이중 경로 | `scourt-case-search-integration.md` |

### 5.2 High — 운영·수익

| ID | 갭 | 현재 | 목표 |
|----|-----|------|------|
| G-06 | 플랫폼 관리번호 전환 | 세션 필드만 존재 | 대시보드 전환 UI + API | `platform-admin-tenant-switch.md` |
| G-07 | 오픈뱅킹 | `linked_accounts` UI만 | 금융결제원 실거래내역 연동 | `finance-toss-api-plan.md` |
| G-08 | HDL Phase 2 | 로컬 Merkle·블록 | 외부 앵커·리플레이 복구 UI | `hybrid-ledger-lawygo-spec.md` |
| G-09 | React Query | fetch 직접 호출 | TanStack Query 캐시·동기화 | README·.cursorrules 권장 |

### 5.3 Medium — 품질·확장

| ID | 갭 | 현재 | 목표 |
|----|-----|------|------|
| G-10 | 통계 Reports | 기본 stats 페이지 | LawTop GL Reports parity |
| G-11 | 모바일 UX | 부분 개선 | `mobile-ui-improvement-spec.md` 잔여 |
| G-12 | 보안 SOC 자동화 | 수동 감사 | Cron + 알림 연동 |
| G-13 | RLS 전면 검토 | service role 의존 다수 | 클라이언트/API 경계 정리 |
| G-14 | Loyad repo 이관 | 빈 GitHub repo | LawyGo 소스 push·CI 통합 |

---

## 6. 업그레이드 로드맵

### Phase 0 — 저장소·기반 정비 (1~2주)

**목표:** Loyad 리포에 실제 소스 반영, 개발 환경 표준화

| 작업 | 상세 | 산출물 |
|------|------|--------|
| P0-1 | LawyGo → Loyad/Loyad 소스 이관 | Git push, `.env.example` 정비 |
| P0-2 | README·remote URL 통합 | Loyad org 기준 문서 |
| P0-3 | CI/CD (lint, test:final-qa) | GitHub Actions 또는 Vercel 연동 |

**수용 기준:** Loyad repo clone 시 `npm install && npm run dev` 성공, QA 18항목 PASS 유지

---

### Phase 1 — 데이터 영속성 통합 (4~6주) ★ 최우선

**목표:** localStorage·G6 의존 제거, AI·자료를 DB/Drive로 일원화

#### 1-A. AI 송무 프로젝트 통합 (G-01, G-02)

**개요:** 6개 AI 기능을 `encyclopedia_projects` 중심 워크스페이스로 통합

**기능 요구사항:**

| FR | 요구사항 |
|----|----------|
| FR-1.1 | 프로젝트 생성: `(의뢰인명 + 사건명)` 또는 기존 `cases.id` FK 연동 |
| FR-1.2 | AI 6종 산출물 → ingest 어댑터 → `legal_vectors` + `encyclopedia_artifacts` |
| FR-1.3 | Drive 자동 적재: `{mn}/cases/{caseId}/encyclopedia/` |
| FR-1.4 | 프로젝트별 학습 가중치: `legal_feature_weights`에 project_key 단위 확장 |
| FR-1.5 | localStorage `lawygo_ai_docs` 마이그레이션 스크립트 + 제거 |

**API 신규/변경:**

```
POST   /api/encyclopedia/projects              — 프로젝트 생성
GET    /api/encyclopedia/projects/[id]         — 프로젝트 + 산출물 목록
POST   /api/encyclopedia/projects/[id]/ingest — AI 결과 ingest
POST   /api/encyclopedia/projects/[id]/export-drive — Drive 적재
```

**UI 변경:**

- `/board/ai/*` → 프로젝트 선택/생성 헤더 공통화
- `LegalEncyclopediaWorkspace`를 프로젝트 허브로 확장

**수용 기준:**

- [ ] AI 기능 사용 후 localStorage 미사용
- [ ] 동일 프로젝트에서 6종 산출물 조회 가능
- [ ] Drive 폴더에 PDF/JSON 산출물 자동 저장
- [ ] `npm run test:doc-summary`, `test:ai-quick-launch` PASS

#### 1-B. localStorage → Supabase/Drive 마이그레이션 (G-04)

| 대상 | 현재 저장 | 목표 |
|------|-----------|------|
| 상담 데이터 | `consultationStorage` + mock | `consultations` 테이블 |
| 사건 메모 시드 | mockTimeline | `timeline` + board sync |
| 결재 첨부 | localStorage legacy | Drive + metadata |
| AI 문서 | localStorage | Phase 1-A |

**수용 기준:**

- [ ] `grep localStorage` 잔존 0건 (의도적 UX 설정 제외)
- [ ] Supabase 미연결 시 graceful empty state (mock 제거)

#### 1-C. 네이티브 게시판 완전 전환 (G-03)

| 작업 | 상세 |
|------|------|
| G6 브릿지 제거 | `gnuboard.ts` 호출 경로 deprecated → `boardService.ts` 단일화 |
| README 정리 | G6 설치를 optional legacy로 이동 |
| 사건 메모 동기화 | `caseMemoBoardSync.ts` 강화 |
| 관리 UI | `/admin/g6` → `/admin/boards` 명칭 정리 |

**수용 기준:**

- [ ] G6 미설정 환경에서 게시판 CRUD 100% 동작
- [ ] `npm run test:board` PASS

---

### Phase 2 — 외부 연동·플랫폼 운영 (4~5주)

#### 2-A. SCourt OpenAPI 완성 (G-05)

**현재:** Railway 봇 크롤링 + `scourtApi.ts` stub

**목표:**

| FR | 요구사항 |
|----|----------|
| FR-2.1 | SCourt OpenAPI 엔드포인트·응답 매핑 구현 |
| FR-2.2 | 봇 vs API 이중 경로: API 우선, 실패 시 봇 fallback |
| FR-2.3 | `scourt_search_jobs` 상태 머신 (pending/running/done/failed) |
| FR-2.4 | `CourtSyncPanel` UI: API/봇 소스 표시 |

**수용 기준:**

- [ ] `scourtApi.ts` TODO 0건
- [ ] Cron + 수동 sync 모두 동작
- [ ] `npm run debug:court-sync` 성공

#### 2-B. 플랫폼 관리번호 전환 UX (G-06)

**세션 모델:**

```typescript
interface SessionPayload {
  homeManagementNumber: string;    // DB 고정 (예: 00000)
  activeManagementNumber: string;  // 작업 테넌트 (예: 10000)
  tenantSwitchMode?: "platform";
}
```

**UI/API:**

| 구성요소 | 경로 |
|----------|------|
| 전환 UI | `/admin` 헤더 TenantSwitchBar |
| 전환 API | `POST /api/admin/tenant-switch` |
| 감사 로그 | `user_admin_audit_logs`에 switch 이벤트 |

**수용 기준:**

- [ ] `shinkang` 로그인 → home=00000, active=00000
- [ ] 10000 입력 전환 → 사건·고객·Drive가 10000 데이터 표시
- [ ] 일반 사용자는 전환 UI 비노출
- [ ] `npm run test:tenant-scope` PASS

#### 2-C. 오픈뱅킹 연동 Phase 1 (G-07)

**아키텍처:** 금융결제원 오픈뱅킹 (주) + 토스페이먼츠 가상계좌 (보조)

| FR | 요구사항 |
|----|----------|
| FR-2.5 | 계좌 연결 OAuth 플로우 |
| FR-2.6 | `/api/finance/accounts/[id]/transactions` 실거래내역 |
| FR-2.7 | 통합 입금 목록 → 기존 수납 매칭 UI 연동 |
| FR-2.8 | 계좌별 상세 페이지 (`/finance/accounts/[accountId]`) 실데이터 |

**수용 기준:**

- [ ] 테스트 환경에서 1개 이상 계좌 거래내역 조회
- [ ] 미매칭 입금 row에 계좌 출처 표시
- [ ] `npm run test:finance` (신규) PASS

---

### Phase 3 — 신뢰·분석·모바일 (3~4주)

#### 3-A. HDL 원장 Phase 2 (G-08)

| FR | 요구사항 |
|----|----------|
| FR-3.1 | OpenTimestamps 또는 공증 API 외부 앵커 |
| FR-3.2 | `/admin/ledger` 리플레이 복구 UI |
| FR-3.3 | 결재·재무·관리자 조작 이벤트 enqueue 범위 확대 |
| FR-3.4 | 무결성 알림 → 이메일/사내 메신저 연동 |

**수용 기준:**

- [ ] 외부 앵커 hash 검증 API
- [ ] Cron ledger worker 안정 운영 7일

#### 3-B. 통계 Reports 확장 (G-10)

- LawTop GL Reports 모듈 매핑 (`menuConfig.lawtopModule`)
- 사건별·담당자별·기간별 수납/진행 리포트
- Excel export

#### 3-C. 모바일 UX + TWA 정식 배포 (G-11)

- `mobile-ui-improvement-spec.md` 잔여 항목
- Play Store TWA 배포 (`docs/android-play-store-twa.md`)
- PWA 오프라인 범위 정의

#### 3-D. React Query 도입 (G-09)

- `@tanstack/react-query` 설치
- 사건·대시보드·결재 목록 우선 마이그레이션
- staleTime·invalidate 패턴 표준화

---

### Phase 4 — 보안·품질·운영 (2~3주)

| 작업 | 상세 |
|------|------|
| RLS 전면 검토 | service role vs anon 경계 문서화 |
| SOC Cron | `/api/cron/security-audit` 신규 |
| E2E 확대 | Playwright critical path 10+ |
| 구독 seat limit | `subscriptionGate` enforcement 강화 |

---

## 7. 비기능 요구사항

### 7.1 성능

| 항목 | 목표 |
|------|------|
| API P95 (일반 CRUD) | < 500ms |
| HDL enqueue (핫패스) | < 5ms 추가 |
| AI ingest (PDF 10MB) | < 30s |
| 대시보드 LCP | < 2.5s |

### 7.2 보안

- `management_number` 테넌트 격리 모든 API 필수 (`requireTenantSession()`)
- `SUPABASE_SERVICE_ROLE_KEY` 서버 전용, 클라이언트 노출 금지
- HDL `H_v`는 승인(approved) 사용자만 유효
- OWASP Top 10 — `docs/security/CHECKLIST.md` 준수

### 7.3 가용성

- Vercel 프로덕션 SLA 의존
- Supabase PITR 백업 + HDL 리플레이 복구 (Phase 3)
- Cron 실패 시 재시도 + admin 알림

### 7.4 테스트

| 유형 | 도구 | 기준 |
|------|------|------|
| API 스모크 | `npm run test:final-qa` | 18+ PASS |
| 도메인별 | `test:auth`, `test:board`, `test:tenant-scope` 등 | Phase별 추가 |
| E2E | Playwright | Critical path |

---

## 8. 개발 규칙 (신규 기능 공통)

### 8.1 코드 구조

- **신규 파일 우선:** 기능별 새 파일 생성 (기존 파일 최소 수정)
- **경로 명시:** 제안 코드 상단 `// filepath: ...` 형식
- **UI:** shadcn/ui + Tailwind + Lucide
- **비동기 데이터:** Phase 3 이후 React Query 권장

### 8.2 API 패턴

```typescript
// 모든 테넌트 API 공통 패턴
export async function GET(req: Request) {
  const session = await requireTenantSession(req);
  const mn = resolveManagementNumber(session);
  await assertSubscriptionActive(mn); // 필요 시
  // ... Supabase query with .eq("management_number", mn)
}
```

### 8.3 파일 저장

- 바이너리: Google Drive
- 메타데이터: Supabase (`case_files`, `encyclopedia_artifacts` 등)
- AI 산출물: DB + Drive 이중 저장 (Phase 1-A)

### 8.4 환경 변수 (필수)

| 변수 | 용도 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 API |
| `LAWYGO_SESSION_SECRET` | 세션 HMAC |
| `GOOGLE_DRIVE_*` | Drive 연동 |
| `STRIPE_*` | 구독 |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` | AI |
| `SCOURT_BOT_URL` | 대법원 봇 |

---

## 9. 우선순위 매트릭스

| 순위 | Phase | 항목 | 비즈니스 임팩트 | 기술 난이도 | 기간 |
|------|-------|------|----------------|------------|------|
| 1 | P0 | Loyad repo 이관 | ★★★★★ | ★☆☆☆☆ | 1~2주 |
| 2 | P1-A | AI 프로젝트 통합 | ★★★★★ | ★★★★☆ | 3~4주 |
| 3 | P1-B | localStorage 제거 | ★★★★☆ | ★★★☆☆ | 2주 |
| 4 | P1-C | 네이티브 게시판 | ★★★★☆ | ★★★☆☆ | 2주 |
| 5 | P2-B | 관리번호 전환 UX | ★★★★☆ | ★★☆☆☆ | 1~2주 |
| 6 | P2-A | SCourt OpenAPI | ★★★★☆ | ★★★★☆ | 2~3주 |
| 7 | P2-C | 오픈뱅킹 | ★★★★★ | ★★★★★ | 3~4주 |
| 8 | P3-A | HDL Phase 2 | ★★★☆☆ | ★★★★☆ | 2~3주 |
| 9 | P3-D | React Query | ★★★☆☆ | ★★★☆☆ | 2주 |
| 10 | P3-B~C | Reports·모바일 | ★★★☆☆ | ★★★☆☆ | 3~4주 |

**총 예상 기간:** 14~20주 (병렬 진행 시 10~14주)

---

## 10. QA·릴리스 기준

### 10.1 Phase별 Gate

| Phase | Gate 조건 |
|-------|-----------|
| P0 | Loyad repo 빌드·배포 성공 |
| P1 | localStorage 제거, AI 프로젝트 E2E, test:board PASS |
| P2 | tenant-switch, SCourt sync, finance sandbox PASS |
| P3 | HDL anchor 검증, Play Store TWA 제출 |
| P4 | security checklist 100%, QA 25+ PASS |

### 10.2 현재 QA 기준선 (2026-06-13)

- 프로덕션 `lawygo.vercel.app` 기준 **18/18 PASS**
- Phase 1 완료 후에도 기존 18항목 regression PASS 필수

---

## 11. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Loyad repo 빈 상태 지속 | 배포·협업 불가 | P0 최우선 이관 |
| SCourt OpenAPI 접근 제한 | 기일 sync 불안정 | 봇 fallback 유지 |
| 오픈뱅킹 심사 지연 | 회계 고도화 지연 | 수동 CSV import 병행 |
| AI API 비용 증가 | 마진 악화 | ingest 캐시·usage quota |
| G6 완전 제거 시 레거시 고객 | 게시판 데이터 손실 | G6→native 마이그레이션 스크립트 |
| localStorage 마이그레이션 | 기존 사용자 데이터 유실 | one-time import UI |

---

## 12. 부록

### A. API 엔드포인트 전체 (148 routes, 도메인별)

<details>
<summary>펼치기</summary>

- **인증:** `/api/auth/login`, `logout`, `session`, `me`, `signup`, `google/*`
- **사건:** `/api/cases/sync-deadlines`, `scourt-link`, `case-files/*`, `deadlines`
- **결재:** `/api/approvals`, `/api/approvals/[id]`
- **회계:** `/api/finance/*` (entries, transactions, match, accounts, billing, tax)
- **게시판:** `/api/board/*`
- **AI:** `/api/ai/gemini`, `openai`, `legal-encyclopedia`, `/api/document/ocr`
- **백과:** `/api/encyclopedia/*`
- **Drive:** `/api/drive/*`
- **메신저:** `/api/messenger/*`, `/api/internal-messages/*`
- **구독:** `/api/subscription/*`
- **관리자:** `/api/admin/*` (users, cases, security, ledger, settings, boards, banners, menus)
- **Cron:** `/api/cron/court-deadline-sync`, `ledger`, `subscription`

</details>

### B. 화면 ID 매핑 (LawTop GL 호환)

| SCR ID | 화면 | 경로 |
|--------|------|------|
| SCR-01 | 대시보드 | `/` |
| SCR-02 | 사건 그리드 | `/cases` |
| SCR-03 | 사건 상세 | `/cases/[id]` |
| SCR-04 | 전자결재/회계 | `/approval`, `/finance` |

### C. 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | 2026-06-16 | 최초 작성 — LawyGo 전체 코드·docs 정적 분석 기반 |

---

*본 문서는 Loyad/Loyad 리포의 기능 업그레이드 기준 명세서이다. Phase별 상세 UI/API 설계는 각 `docs/planning/*.md` 및 신규 하위 명세서로 분리 작성한다.*
