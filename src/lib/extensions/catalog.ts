/**
 * Loyad 확장 카탈로그 — GitHub 리포 분석 기반
 * (첨부 이미지 리포 + v2.0 89개 리포 교차 매핑)
 */

import type { ExtensionDefinition } from "@/lib/extensions/types";

export const EXTENSION_SETTINGS_KEY = "installed_extensions";

/** 이미지·미디어 리포 (첨부 스크린샷) */
const IMAGE_REPOS: ExtensionDefinition[] = [
  {
    id: "ai_image_gen",
    name: "AI 이미지 생성",
    description: "프롬프트로 마케팅·공지용 이미지를 생성합니다 (Gemini Imagen)",
    category: "ai_content",
    kind: "studio",
    icon: "Sparkles",
    href: "/board/studio/ai_image_gen",
    sourceRepo: {
      owner: "brycedrennan",
      name: "imaginAIry",
      stars: 8156,
      summary: "Pythonic AI generation of images — 프롬프트·스타일 패턴 참조",
    },
    defaultInstalled: true,
    requiresGemini: true,
    tags: ["imaginAIry", "생성", "마케팅"],
  },
  {
    id: "image_optimize",
    name: "이미지 최적화",
    description: "PNG/JPEG/WebP 용량을 줄이고 웹 게시용으로 변환합니다",
    category: "image",
    kind: "processor",
    icon: "Minimize2",
    href: "/board/studio/image_optimize",
    sourceRepo: {
      owner: "ImageOptim",
      name: "ImageOptim",
      stars: 9866,
      summary: "GUI image optimizer — 무손실·손실 압축 UX 참조",
    },
    defaultInstalled: true,
    tags: ["ImageOptim", "압축"],
  },
  {
    id: "image_convert",
    name: "이미지 변환",
    description: "200+ 포맷 변환·리사이즈·썸네일 생성 (ImageMagick 패턴)",
    category: "image",
    kind: "processor",
    icon: "RefreshCw",
    href: "/board/studio/image_convert",
    sourceRepo: {
      owner: "ImageMagick",
      name: "ImageMagick",
      stars: 16719,
      summary: "CLI image suite — 변환·리사이즈 파이프라인",
    },
    tags: ["ImageMagick", "sharp", "변환"],
  },
  {
    id: "image_viewer",
    name: "이미지 뷰어",
    description: "WEBP·AVIF·HEIC 등 90+ 포맷 미리보기 (ImageGlass 패턴)",
    category: "image",
    kind: "viewer",
    icon: "Images",
    href: "/board/studio/image_viewer",
    sourceRepo: {
      owner: "d2phap",
      name: "ImageGlass",
      stars: 13431,
      summary: "Modern image viewer — 갤러리·줌 UX",
    },
    defaultInstalled: true,
    tags: ["ImageGlass", "뷰어"],
  },
];

/** v2.0 89개 리포 — 콘텐츠·마케팅 확장 */
const CONTENT_REPOS: ExtensionDefinition[] = [
  {
    id: "voice_studio",
    name: "AI 보이스·오디오",
    description: "법률 콘텐츠 나레이션·오디오북 초안 (voice 리포 패턴)",
    category: "media",
    kind: "studio",
    icon: "Mic",
    href: "/board/studio/voice_studio",
    sourceRepo: { owner: "shinkang888-code", name: "voice", summary: "AI 보이스·오디오북 에디터" },
    defaultInstalled: true,
    requiresGemini: true,
    tags: ["voice", "TTS"],
  },
  {
    id: "marketing_harness",
    name: "AI 마케팅 harness",
    description: "소상공인·로펌 마케팅 워크플로 (ah-my-marketing 패턴)",
    category: "marketing",
    kind: "studio",
    icon: "Megaphone",
    href: "/board/studio/marketing_harness",
    sourceRepo: { owner: "shinkang888-code", name: "ah-my-marketing", summary: "AI-Native 마케팅 워크플로" },
    defaultInstalled: true,
    requiresGemini: true,
    tags: ["marketing"],
  },
  {
    id: "law_mcp",
    name: "한국법 MCP",
    description: "64개 법률 도구 연동 허브 (korean-law-mcp)",
    category: "integration",
    kind: "connector",
    icon: "Scale",
    href: "/board/studio/law_mcp",
    sourceRepo: { owner: "shinkang888-code", name: "korean-law-mcp", summary: "한국법 MCP 64 tools" },
    defaultInstalled: true,
    tags: ["MCP", "법률"],
  },
  {
    id: "dart_reports",
    name: "DART 공시 분석",
    description: "상장사 공시·재무 리포트 (dartlab 패턴)",
    category: "document",
    kind: "studio",
    icon: "BarChart3",
    href: "/board/studio/dart_reports",
    sourceRepo: { owner: "shinkang888-code", name: "dartlab", summary: "DART 공시 분석" },
    defaultInstalled: true,
    tags: ["DART", "재무"],
  },
];

/** 인프라 리포 — UI 확장 제외, 문서·연동 참고만 */
export const EXTENSION_INFRA_REFERENCES = [
  { owner: "actions", name: "runner-images", note: "CI 러너 이미지 — GitHub Actions 배포 파이프라인 참고" },
  { owner: "AppImage", name: "AppImageKit", note: "Linux 데스크톱 패키징 — TWA/Electron 향후" },
  { owner: "DaoCloud", name: "public-image", note: "컨테이너 레지스트리 — 셀프호스트 imaginAIry 연동 시" },
];

export const EXTENSION_CATALOG: ExtensionDefinition[] = [...IMAGE_REPOS, ...CONTENT_REPOS];

export function getExtensionById(id: string): ExtensionDefinition | undefined {
  return EXTENSION_CATALOG.find((e) => e.id === id);
}

export function getDefaultInstalledIds(): string[] {
  return EXTENSION_CATALOG.filter((e) => e.defaultInstalled).map((e) => e.id);
}
