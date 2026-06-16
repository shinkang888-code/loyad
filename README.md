# LawyGo - 법무 관리 시스템

법무법인을 위한 스마트 사건 관리 플랫폼입니다.

## 🚀 빠른 시작

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
# → http://localhost:3000

# 프로덕션 빌드
npm run build
npm start
```

## 📁 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx              # SCR-01: 대시보드
│   ├── cases/
│   │   ├── page.tsx          # SCR-02: 사건 그리드
│   │   ├── [id]/page.tsx     # SCR-03: 사건 상세 (타임라인)
│   │   └── new/page.tsx      # 사건 등록 폼
│   ├── board/
│   │   ├── page.tsx          # 전문 게시판 목록 (G6 연동)
│   │   └── [boardId]/        # 게시판별 글 목록·글 상세
│   ├── api/board/            # 게시판 중간 관리자 API (브릿지)
│   ├── approval/page.tsx     # SCR-04: 전자결재
│   ├── finance/page.tsx      # SCR-04: 회계/수납 매칭
│   ├── calendar/page.tsx     # 기일 달력
│   ├── stats/page.tsx        # 통계/분석
│   ├── staff/page.tsx        # 직원 관리
│   └── settings/page.tsx     # 시스템 설정
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx       # LNB 사이드바 (접힘/펼침)
│   │   └── Header.tsx        # GNB (Omnibar + 알림)
│   ├── dashboard/
│   │   ├── PriorityCard.tsx  # 긴급 기일 카드 (Red Glow)
│   │   └── StatCard.tsx      # 통계 카드
│   ├── cases/
│   │   ├── StaffChips.tsx    # 담당자 Chip UI
│   │   ├── FilterTray.tsx    # 멀티 필터 트레이
│   │   └── CaseDrawer.tsx    # 사건 사이드 드로어
│   └── ui/
│       ├── badge.tsx         # Badge, StatusBadge, DDayBadge
│       ├── button.tsx        # Button (다양한 variant)
│       ├── skeleton.tsx      # Skeleton Shimmer 로딩
│       ├── avatar.tsx        # Avatar + AvatarGroup
│       └── toast.tsx         # Toast 알림 (sonner)
└── lib/
    ├── types.ts              # TypeScript 타입 정의
    ├── utils.ts              # 유틸리티 함수
    ├── gnuboard.ts           # 그누보드 6 API 클라이언트
    ├── boardBridge.ts        # 게시판 중간 관리자 (에러·폴백)
    ├── boardConfig.ts        # 게시판 ID/이름 설정
    └── mockData.ts           # 목 데이터 (개발용)
```

## 🎨 디자인 시스템

- **Font**: Pretendard (tabular-nums 지원)
- **Colors**: Navy Primary + Red Danger + Semantic 컬러
- **Animation**: Framer Motion (fade-up, slide-in, pulse-glow)
- **Icons**: Lucide React
- **Styling**: Tailwind CSS (4pt grid system)

## 📂 LawTop GL 구버전 참고 및 DB 스키마

- **분석 문서**: [docs/LAWTOP_GL_ANALYSIS.md](docs/LAWTOP_GL_ANALYSIS.md)  
  - 설치 경로 구조, 서브 프로그램(수납/결재/리포트/알림 등), 설정 파일, 메뉴 매핑
- **DB 스키마**: `supabase/migrations/20260306000000_lawgo_schema.sql`  
  - 테이블: `cases`, `deadlines`, `staff`, `clients`, `approvals`, `approval_steps`, `finance_entries`, `bank_transactions`, `timeline`, `notifications`, `consultations`
- **메뉴 설정**: `src/lib/menuConfig.ts` (LNB / 모바일 메뉴, LawTop 모듈 대응)
- **Supabase 사용 시**: `npm install @supabase/supabase-js` 후 아래 환경 변수 설정

### DB 연동 (Supabase)

시스템 설정·권한 관리 등에서 "DB가 연결되지 않았습니다"가 나오면 환경 변수를 설정하세요.

1. 프로젝트 루트에 `.env.local` 생성 후 다음 중 하나 이상 설정:
   - **필수**: `NEXT_PUBLIC_SUPABASE_URL` — Supabase 대시보드 → Settings → API → Project URL
   - **권장(관리자 기능)**: `SUPABASE_SERVICE_ROLE_KEY` — 같은 화면에서 service_role 키 (비공개 유지)
   - **선택(클라이언트 로그인 등)**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon public 키
2. 예시는 `.env.example` 참고. (`cp .env.example .env.local` 후 값만 채우면 됨)
3. **로그인/회원가입**을 쓰려면 Supabase에 `site_users` 테이블 생성: `supabase/migrations/20260307200000_site_users.sql` 내용을 SQL Editor에서 실행.
4. `app_settings` 테이블이 없으면: `supabase/migrations/20260307100000_app_settings.sql` 실행.
5. **Vercel 배포 시**: 프로젝트 설정 → Environment Variables에 위 변수 추가 후 재배포.

**관리자 계정(shinkang) 생성**: DB 연동 후 최초 1회, 터미널에서  
`ADMIN_INITIAL_PASSWORD=원하는비밀번호 npm run seed-admin`  
실행 시 로그인 ID `shinkang`, 지정한 비밀번호, 관리번호 `00000`(또는 `ADMIN_MANAGEMENT_NUMBER` 환경 변수)인 승인된 관리자 계정이 생성됩니다.

## 🔧 프론트엔드 관리자

- **진입**: 시스템 설정 → **프론트엔드 관리자** 또는 `/admin`
- **기능**
  - **메뉴 관리** (`/admin/menus`): 이용자 화면(LNB·모바일 하단·더보기) 메뉴 등록·편집·삭제·순서 변경
  - **관리 대시보드** (`/admin`): 메뉴 관리·시스템 설정 바로가기
- **저장**: Supabase 테이블 `site_menus` 사용. 미연동 시 기본 메뉴 표시 후, "기본 메뉴를 DB에 저장"으로 한 번 저장하면 편집 가능.
- **반영**: 사이드바·모바일 네비는 `/api/menus` 응답을 사용하며, DB에 값이 있으면 DB 기준, 없으면 `menuConfig` 기본값 사용.

## 📋 전문 게시판 (G6 하이브리드)

- **메뉴**: 사이드바/모바일에서 **전문 게시판** → 게시판 목록 → 게시판별 글 목록·글 상세
- **G6 설치**: `npm run setup:g6` → `npm run dev:g6`. 자세한 절차는 [docs/g6-install.md](docs/g6-install.md) 참고
- **중간 관리자**: LawyGo는 G6를 직접 호출하지 않고 **API 브릿지**(`/api/board/*`)를 통해 통신합니다.
  - `src/lib/boardBridge.ts`: G6 호출 래핑, 에러 시 폴백·정규화
  - `src/app/api/board/`: Next.js API 라우트 (게시판 목록, 글 목록/단건, 댓글)
- G6가 꺼져 있어도 게시판 목록은 표시되며, 글 목록은 G6 연동 후 이용 가능합니다.

## 🔗 그누보드 6 연동 설정

1. `.env.local.example`을 `.env.local`로 복사
2. 그누보드 6 API URL과 키를 설정
3. `src/lib/gnuboard.ts`에서 API 함수 사용

```typescript
import { getCaseMemos, createPost } from "@/lib/gnuboard";

// 사건 메모 조회 (wr_1 = case_id 필터)
const memos = await getCaseMemos("c001");

// 메모 작성
await createPost("case_memo", {
  wr_subject: "상담 메모",
  wr_content: "내용...",
  wr_1: "c001", // case_id
});
```

## 🌐 Vercel 배포

```bash
npx vercel --prod
```

Vercel 대시보드에서 환경 변수 설정:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase 프로젝트 URL (필수)
- `SUPABASE_SERVICE_ROLE_KEY` — 서비스 롤 키 (시스템 설정·권한 관리 등)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — 공개 키 (클라이언트 로그인 등)
- `NEXT_PUBLIC_GNUBOARD_API_URL` — G6 서버 루트 (예: `http://localhost:8000`)
- `GNUBOARD_API_USERNAME` / `GNUBOARD_API_PASSWORD` — G6 API JWT 자동 발급
