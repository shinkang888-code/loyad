# LawyGo(Loyad) 확장 개발명세서 v2.0

> **문서 버전:** v2.0  
> **작성일:** 2026-06-16  
> **변경:** GitHub 전체 리포 분석 + 대시보드·콘텐츠 발행 업그레이드 Phase 5 추가 및 **구현 완료**  
> **구현 코드베이스:** `C:\Users\user\.cursor\lawygo`

---

## 0. v2.0 변경 요약

| 항목 | v1.0 | v2.0 |
|------|------|------|
| GitHub 리포 분석 | Loyad 1개 (빈 repo) | Loyad + shinkang888-code **89개** 리포 교차 분석 |
| 대시보드·콘텐츠 | 갭만 기술 | **Phase 5 즉시 구현** 8건 완료 |
| 구현 상태 | 명세만 | 코드 반영 + 테스트 |

---

## 1. GitHub 계정 리포 분석

### 1.1 Loyad (`@Loyad`)

| 리포 | 설명 | LawyGo 연계 |
|------|------|-------------|
| **Loyad/Loyad** | GitHub 프로필 설정용 (빈 repo) | 소스 이관 대상 (P0) |

### 1.2 shinkang888-code (89 public repos) — 콘텐츠·대시보드 관련

| 리포 | 재사용 아이디어 | LawyGo 적용 (Phase 5) |
|------|----------------|----------------------|
| **lawygo** | 본 프로젝트 (법무 SaaS) | 구현 기준 |
| **g6** / **nuboboard** / **reactfull** / **ant-design-pro** | 게시판·CMS·관리 콘솔 | 네이티브 게시판 전환 (P1-C) |
| **ah-my-marketing** | AI-Native 마케팅 워크플로우 | 대시보드 AI 워크스페이스 바로가기 ✅ |
| **marketingsodong** | 소상공인 AI 마케팅 | 배너·공지 발행 UX |
| **voice** | AI 보이스·오디오북 콘텐츠 에디터 | AI 산출물 artifact 패널 ✅ |
| **ebook** / **Sigil** | EPUB 에디터 | 문서 발행 확장 (향후) |
| **naverb** | Markdown WYSIWYG | 게시판 에디터 고도화 (향후) |
| **wtv** | AI 뉴스 대시보드 | 대시보드 위젯 패턴 ✅ |
| **korean-law-mcp** | 한국법 MCP 64 tools | law_search·백과 연동 강화 |
| **dartlab** | DART 공시 분석 | 재무·통계 Reports (P3-B) |
| **deer-flow** / **oh-my-claudecode** | SuperAgent harness | AI 콘텐츠 파이프라인 |
| **OpenCut** / **openscreen** | 미디어·데모 생성 | 마케팅 `/www` 연동 (향후) |

### 1.3 분석 결론

- **즉시 통합 가능:** 기존 LawyGo API·컴포넌트 연결 (mock 제거, UI 위젯 추가)
- **중기:** 게시글 draft/publish, WYSIWYG, EPUB export
- **장기:** 마케팅 harness, DART·MCP 외부 도구 연동

---

## 2. Phase 5 — 대시보드·콘텐츠 발행 업그레이드 (구현 완료)

### 5.1 대시보드 결재 실데이터 연동 ✅

| FR | 내용 | 파일 |
|----|------|------|
| FR-5.1 | `/api/approvals?tab=미결재` 연동 | `src/lib/dashboardData.ts` |
| FR-5.2 | StatCard·사이드바 mock 제거 | `src/app/page.tsx` |

**수용 기준:** 결재 대기 건수 = API 응답과 일치

### 5.2 RevenueChart 실데이터 ✅

| FR | 내용 | 파일 |
|----|------|------|
| FR-5.3 | `/api/finance/stats` → `monthlyRevenue` | `dashboardData.ts` |
| FR-5.4 | props 기반 차트, mock 제거 | `RevenueChart.tsx`, `page.tsx` |

### 5.3 공지 작성 CTA (콘텐츠 발행) ✅

| FR | 내용 | 파일 |
|----|------|------|
| FR-5.5 | 관리자에게 "공지 작성" 버튼 | `page.tsx` → `/board/notice/write` |

### 5.4 AI 콘텐츠 워크스페이스 위젯 ✅

| FR | 내용 | 파일 |
|----|------|------|
| FR-5.6 | AI 4종 바로가기 카드 | `WorkspaceQuickLinks.tsx` (신규) |

**근거 리포:** ah-my-marketing, wtv 대시보드 패턴

### 5.5 Header 테넌트 전환 ✅

| FR | 내용 | 파일 |
|----|------|------|
| FR-5.7 | 전체관리자 관리번호 dropdown | `TenantSwitchBadge.tsx` (신규) |
| FR-5.8 | `PATCH /api/auth/me` 연동 | `Header.tsx` |

**근거:** platform-admin-tenant-switch.md (v1.0 G-06)

### 5.6 백과 프로젝트 산출물·보관 ✅

| FR | 내용 | 파일 |
|----|------|------|
| FR-5.9 | artifact 목록 패널 | `ProjectArtifactsPanel.tsx` (신규) |
| FR-5.10 | `action: archive` API | `encyclopediaProjectDb.ts`, `api/.../projects/[id]` |

**근거 리포:** voice (콘텐츠 에디터·히스토리)

### 5.7 레거시 공지 리다이렉트 ✅

| FR | 내용 | 파일 |
|----|------|------|
| FR-5.11 | `/notices` → `/board/notice` | `src/app/notices/page.tsx` |

---

## 3. v1.0 로드맵 유지 (미구현)

Phase 0~4는 v1.0 명세(`FEATURE_UPGRADE_DEV_SPEC.md`)와 동일:

- P0: Loyad repo 이관
- P1: AI 프로젝트 통합, localStorage 제거, G6 전환
- P2: SCourt OpenAPI, 오픈뱅킹
- P3: HDL Phase 2, Reports, React Query
- P4: 보안 SOC

### Phase 5 후속 (명세만)

| ID | 기능 | 근거 |
|----|------|------|
| P5-F | 게시글 draft/publish | g6, nuboboard, ant-design-pro |
| P5-G | WYSIWYG 에디터 | naverb, ebook |
| P5-H | 배너 tenant scope + 스케줄 | marketingsodong |
| P5-I | DART·korean-law-mcp 연동 | dartlab, korean-law-mcp |

---

## 4. 테스트 계획

| 테스트 | 명령 | 기대 |
|--------|------|------|
| Final QA | `npm run test:final-qa` | 18+ PASS |
| 대시보드 | `npm run test:dashboard-quick-actions` | PASS |
| Lint | `npm run lint` | 0 error |
| Build | `npm run build` | success |

---

## 5. 변경 파일 목록 (v2.0 구현)

```
src/lib/dashboardData.ts                          — 결재·월별수납 fetch
src/app/page.tsx                                  — 대시보드 위젯 통합
src/components/dashboard/RevenueChart.tsx         — 실데이터 props
src/components/dashboard/WorkspaceQuickLinks.tsx  — 신규
src/components/layout/TenantSwitchBadge.tsx       — 신규
src/components/layout/Header.tsx                  — 테넌트 배지
src/components/board/ai/encyclopedia/ProjectArtifactsPanel.tsx — 신규
src/components/board/ai/LegalEncyclopediaWorkspace.tsx
src/lib/legalEncyclopedia/encyclopediaProjectDb.ts — archiveProject
src/app/api/encyclopedia/projects/[id]/route.ts
src/app/notices/page.tsx                          — redirect
```

---

## 6. 변경 이력

| 버전 | 일자 | 내용 |
|------|------|------|
| v1.0 | 2026-06-16 | LawyGo 전체 분석, Phase 0~4 |
| v2.0 | 2026-06-16 | GitHub 89 repo 분석, Phase 5 구현 |

---

*v1.0 전체 명세는 `FEATURE_UPGRADE_DEV_SPEC.md` 참조.*
