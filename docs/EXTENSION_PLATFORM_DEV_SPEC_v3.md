# Loyad 확장 플랫폼 개발명세서 v3.0

> **문서 버전:** v3.0  
> **작성일:** 2026-06-16  
> **범위:** GitHub 이미지·콘텐츠 리포 분석 → 확장형 UI 플랫폼 → Phase 6 구현  
> **코드베이스:** `c:\cursor\loyad\Loyad`

---

## 0. v3.0 요약

| 항목 | v2.0 | v3.0 |
|------|------|------|
| 초점 | 대시보드 mock 제거·Phase 5 | **확장(Extension) 플랫폼** + 콘텐츠 생성기 |
| GitHub 분석 | 89개 리포 목록 | **첨부 7개 이미지 리포** + 89개 **교차 매핑** |
| UI | 고정 AI 4종 | **설치형 메뉴·스튜디오** (ExtensionHub) |
| 구현 | Phase 5 완료 | **Phase 6 (1~4)** 구현 완료 |

---

## 1. 첨부 GitHub 리포 분석 (이미지·미디어)

| 리포 | Stars | Loyad 확장 ID | 통합 방식 | Phase |
|------|-------|---------------|-----------|-------|
| **brycedrennan/imaginAIry** | 8.1k | `ai_image_gen` | Gemini Imagen API (`/api/ai/image-generate`) | 6-3 ✅ |
| **ImageOptim/ImageOptim** | 9.8k | `image_optimize` | sharp WebP/AVIF 압축 (`/api/extensions/image-process`) | 6-4 ✅ |
| **ImageMagick/ImageMagick** | 16.7k | `image_convert` | sharp 포맷·리사이즈 파이프라인 | 6-4 ✅ |
| **d2phap/ImageGlass** | 13.4k | `image_viewer` | 클라이언트 갤러리·줌 UI | 6-4 ✅ |
| **actions/runner-images** | 12.8k | — | CI 인프라 참고 (`.github/workflows`) | — |
| **AppImage/AppImageKit** | 9.3k | — | Linux TWA 패키징 향후 | Phase 7 |
| **DaoCloud/public-image** | — | — | 셀프호스트 imaginAIry 컨테이너 연동 참고 | Phase 7 |

### 1.1 shinkang888-code 89개 리포 — 콘텐츠 확장 매핑

| 리포 | 확장 ID | Phase |
|------|---------|-------|
| ah-my-marketing | `marketing_harness` | 7-B ✅ |
| voice | `voice_studio` | 7-A ✅ |
| korean-law-mcp | `law_mcp` | 7-C ✅ |
| dartlab | `dart_reports` | 7-D ✅ |
| naverb, ebook | WYSIWYG·EPUB | 7 |
| OpenCut, openscreen | 미디어 데모 | 8 |

---

## 2. 확장 플랫폼 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│  Dashboard: ExtensionHub + WorkspaceQuickLinks            │
├─────────────────────────────────────────────────────────┤
│  Sidebar: 설치된 확장 → /board/studio/[id]              │
├─────────────────────────────────────────────────────────┤
│  Admin: /admin/extensions (install / uninstall)           │
├─────────────────────────────────────────────────────────┤
│  catalog.ts (정적 카탈로그)                              │
│  extensionStoreServer.ts (app_settings per tenant)        │
│  API: GET /api/extensions, POST /api/admin/extensions     │
└─────────────────────────────────────────────────────────┘
```

### 2.1 데이터 모델

- **카탈로그:** `src/lib/extensions/catalog.ts` (버전과 함께 배포)
- **설치 상태:** `app_settings` 키 `installed_extensions:{managementNumber}`
- **테넌트:** `management_number` 단위 격리

### 2.2 확장 종류 (kind)

| kind | 설명 | 예 |
|------|------|-----|
| studio | 전용 UI 워크스페이스 | AI 이미지, 마케팅 |
| processor | API 배치 처리 | 최적화, 변환 |
| viewer | 클라이언트 뷰어 | ImageGlass |
| connector | MCP·외부 API 허브 | korean-law-mcp |

---

## 3. Phase 6 구현 (완료)

### Phase 6-1: 레지스트리·API·Admin ✅

| FR | 내용 | 파일 |
|----|------|------|
| FR-6.1 | ExtensionDefinition 타입 | `types.ts` |
| FR-6.2 | GitHub 리포 카탈로그 | `catalog.ts` |
| FR-6.3 | 테넌트별 install/uninstall | `extensionStoreServer.ts` |
| FR-6.4 | GET /api/extensions | `api/extensions/route.ts` |
| FR-6.5 | POST /api/admin/extensions | `api/admin/extensions/route.ts` |
| FR-6.6 | 확장 관리 UI | `admin/extensions/page.tsx` |

### Phase 6-2: 대시보드·LNB ✅

| FR | 내용 | 파일 |
|----|------|------|
| FR-6.7 | ExtensionHub 위젯 | `ExtensionHub.tsx` |
| FR-6.8 | 대시보드 배치 | `page.tsx` |
| FR-6.9 | Sidebar 동적 메뉴 | `Sidebar.tsx`, `useExtensions.ts` |

### Phase 6-3: AI 이미지 생성 ✅

| FR | 내용 | 파일 |
|----|------|------|
| FR-6.10 | Gemini Imagen 클라이언트 | `geminiImageClient.ts` |
| FR-6.11 | POST /api/ai/image-generate | `api/ai/image-generate/route.ts` |
| FR-6.12 | AiImageGenStudio UI | `studio/AiImageGenStudio.tsx` |

### Phase 6-4: 이미지 처리·뷰어 ✅

| FR | 내용 | 파일 |
|----|------|------|
| FR-6.13 | sharp optimize/convert | `imageProcessor.ts` |
| FR-6.14 | POST /api/extensions/image-process | `api/extensions/image-process/route.ts` |
| FR-6.15 | ImageProcessStudio, ImageViewerStudio | `studio/*.tsx` |
| FR-6.16 | 스튜디오 라우트 | `board/studio/[extensionId]/page.tsx` |

---

## 4. Phase 7 구현 (완료)

| Phase | 기능 | API | Studio |
|-------|------|-----|--------|
| 7-A | voice TTS·오디오북 | `POST /api/extensions/voice-tts` | `VoiceStudio.tsx` |
| 7-B | marketing harness | `POST /api/extensions/marketing-harness` | `MarketingHarnessStudio.tsx` |
| 7-C | korean-law-mcp (5 tools) | `POST /api/extensions/law-mcp` | `LawMcpStudio.tsx` |
| 7-D | DART 공시·재무 | `POST /api/extensions/dart-reports` | `DartReportsStudio.tsx` |

**env:** `OPENDART_API_KEY` (DART), `LAW_GO_KR_OC` (법령 API), `GOOGLE_GEMINI_API_KEY` (voice·marketing)

### Phase 8 로드맵 (미구현)

| Phase | 기능 | 근거 리포 |
|-------|------|-----------|
| 7-E | 셀프호스트 imaginAIry webhook | DaoCloud, imaginAIry |
| 8 | OpenCut·openscreen 미디어 | OpenCut |

---

## 5. 테스트 계획

| 테스트 | 명령 | 기대 |
|--------|------|------|
| Build | `npm run build` | success |
| Final QA | `npm run test:final-qa` | 18+ PASS |
| Extensions API | `npm run test:extensions` | catalog + installed |

---

## 6. 배포

- Vercel: `npx vercel --prod --yes`
- GitHub: `git push origin-loyad main`

---

## 7. 변경 파일 (Phase 6)

```
src/lib/extensions/types.ts
src/lib/extensions/catalog.ts
src/lib/extensions/extensionStoreServer.ts
src/lib/extensions/geminiImageClient.ts
src/lib/extensions/imageProcessor.ts
src/hooks/useExtensions.ts
src/components/dashboard/ExtensionHub.tsx
src/components/extensions/studio/*
src/app/board/studio/[extensionId]/page.tsx
src/app/admin/extensions/page.tsx
src/app/api/extensions/route.ts
src/app/api/admin/extensions/route.ts
src/app/api/ai/image-generate/route.ts
src/app/api/extensions/image-process/route.ts
src/components/layout/Sidebar.tsx
src/app/page.tsx
docs/EXTENSION_PLATFORM_DEV_SPEC_v3.md
scripts/test-extensions.mjs
```
