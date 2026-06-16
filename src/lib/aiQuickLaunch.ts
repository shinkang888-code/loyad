/**
 * AI 문서엔진 헤더 퀵런치 설정
 */
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Scale,
  FileStack,
  PenLine,
  Search,
  Bot,
} from "lucide-react";

export type AiQuickLaunchItem = {
  id: string;
  shortName: string;
  name: string;
  icon: LucideIcon;
  /** 새 창 기본 크기 */
  windowWidth?: number;
  windowHeight?: number;
};

export const AI_QUICK_LAUNCH: AiQuickLaunchItem[] = [
  {
    id: "legal_encyclopedia",
    shortName: "법률백과",
    name: "로이고법률백과",
    icon: BookOpen,
    windowWidth: 1400,
    windowHeight: 900,
  },
  {
    id: "case_search",
    shortName: "판례추천",
    name: "판례 자동 추천",
    icon: Scale,
  },
  {
    id: "doc_summary",
    shortName: "PDF요약",
    name: "판결문 PDF·이미지 요약",
    icon: FileStack,
  },
  {
    id: "doc_draft",
    shortName: "서면작성",
    name: "법률문서 자동작성",
    icon: PenLine,
  },
  {
    id: "law_search",
    shortName: "법령검색",
    name: "법률검색",
    icon: Search,
  },
  {
    id: "ai_search",
    shortName: "AI검색",
    name: "AI 검색",
    icon: Bot,
  },
];

export function openAiFeatureWindow(item: AiQuickLaunchItem): void {
  const url = `/board/ai/${item.id}`;
  const w = item.windowWidth ?? 1280;
  const h = item.windowHeight ?? 860;
  const features = [
    "noopener",
    "noreferrer",
    `width=${w}`,
    `height=${h}`,
    "menubar=no",
    "toolbar=no",
    "location=yes",
    "status=no",
    "scrollbars=yes",
    "resizable=yes",
  ].join(",");
  window.open(url, `lawygo_ai_${item.id}`, features);
}
