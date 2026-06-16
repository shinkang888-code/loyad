/**
 * Loyad 확장(Extension) 플랫폼 타입
 * — GitHub 리포 기반 콘텐츠·미디어 도구를 메뉴/대시보드에 플러그인 형태로 설치
 */

export type ExtensionCategory =
  | "ai_content"
  | "image"
  | "media"
  | "document"
  | "marketing"
  | "integration";

export type ExtensionKind = "studio" | "processor" | "viewer" | "connector";

export interface ExtensionSourceRepo {
  owner: string;
  name: string;
  stars?: number;
  summary: string;
}

export interface ExtensionDefinition {
  id: string;
  name: string;
  description: string;
  category: ExtensionCategory;
  kind: ExtensionKind;
  icon: string;
  href: string;
  sourceRepo: ExtensionSourceRepo;
  /** 기본 설치 여부 (신규 테넌트) */
  defaultInstalled?: boolean;
  /** 관리자만 설치 가능 */
  adminOnly?: boolean;
  /** Gemini 등 외부 API 필요 */
  requiresGemini?: boolean;
  tags?: string[];
}

export interface InstalledExtensionRecord {
  id: string;
  installedAt: string;
  installedBy?: string;
}

export interface ExtensionListResponse {
  catalog: ExtensionDefinition[];
  installed: InstalledExtensionRecord[];
}
