"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LayoutList,
  ChevronRight,
  Wifi,
  WifiOff,
  Sparkles,
  Search,
  Scale,
  FileStack,
  PenLine,
  Bot,
  FileCheck,
  BookOpen,
  FolderOpen,
} from "lucide-react";
import { AI_FEATURES } from "@/lib/boardConfig";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { ApprovalManagementTab } from "@/components/board/ApprovalManagementTab";
import { BoardDashboardSection } from "@/components/board/BoardDashboardSection";
import { WorkspaceFileExplorer } from "@/components/drive/WorkspaceFileExplorer";
import { cn } from "@/lib/utils";

const aiIconMap: Record<string, React.ReactNode> = {
  legal_encyclopedia: <BookOpen size={20} className="text-primary-600" />,
  case_search: <Scale size={20} className="text-primary-600" />,
  law_search: <Search size={20} className="text-primary-600" />,
  doc_summary: <FileStack size={20} className="text-primary-600" />,
  doc_draft: <PenLine size={20} className="text-primary-600" />,
  ai_search: <Bot size={20} className="text-primary-600" />,
};

type BoardTab = "boards" | "approval";

export default function BoardListPage() {
  const [activeTab, setActiveTab] = useState<BoardTab>("boards");
  const [nativeBoard, setNativeBoard] = useState<boolean | null>(null);
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null);
  const [openaiConfigured, setOpenaiConfigured] = useState<boolean | null>(null);
  const { isAdmin } = useIsAdmin();

  useEffect(() => {
    fetch("/api/board")
      .then((res) => res.json())
      .then((data) => setNativeBoard(data.nativeBoard ?? false))
      .catch(() => setNativeBoard(false));
  }, []);
  useEffect(() => {
    fetch("/api/ai/gemini")
      .then((res) => res.json())
      .then((data) => setGeminiConfigured(data.configured ?? false))
      .catch(() => setGeminiConfigured(false));
  }, []);
  useEffect(() => {
    fetch("/api/ai/openai")
      .then((res) => res.json())
      .then((data) => setOpenaiConfigured(data.configured ?? false))
      .catch(() => setOpenaiConfigured(false));
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-screen-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-8"
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <LayoutList size={24} className="text-primary-600" />
              AI 워크스페이스
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              게시판·AI문서엔진·자료실·결재관리를 한곳에서 이용합니다.
            </p>
          </div>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
            <button
              type="button"
              onClick={() => setActiveTab("boards")}
              className={cn(
                "px-4 py-3 min-h-[44px] text-sm font-medium flex items-center gap-2",
                activeTab === "boards" ? "bg-white text-primary-600 shadow-sm" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <LayoutList size={16} />
              워크스페이스
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("approval")}
              className={cn(
                "px-4 py-3 min-h-[44px] text-sm font-medium flex items-center gap-2",
                activeTab === "approval" ? "bg-white text-primary-600 shadow-sm" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <FileCheck size={16} />
              결재관리
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {nativeBoard !== null && (
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                  nativeBoard ? "bg-success-50 text-success-700" : "bg-slate-100 text-text-muted"
                )}
              >
                {nativeBoard ? <Wifi size={14} /> : <WifiOff size={14} />}
                {nativeBoard ? "게시판 연동됨" : "게시판 미준비"}
              </div>
            )}
            {geminiConfigured !== null && (
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                  geminiConfigured ? "bg-primary-50 text-primary-700" : "bg-slate-100 text-text-muted"
                )}
              >
                <Sparkles size={14} />
                {geminiConfigured ? "Gemini 연동됨" : "Gemini 미설정"}
              </div>
            )}
            {openaiConfigured !== null && (
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                  openaiConfigured ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-text-muted"
                )}
              >
                <Sparkles size={14} />
                {openaiConfigured ? "ChatGPT 연동됨" : "ChatGPT 미설정"}
              </div>
            )}
          </div>
        </div>

        {activeTab === "approval" && <ApprovalManagementTab />}

        {activeTab === "boards" && (
          <>
            <BoardDashboardSection isAdmin={isAdmin} nativeBoard={nativeBoard} />

            <section>
              <h2 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
                <Sparkles size={16} className="text-primary-500" />
                AI문서엔진 (Lawygo)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {AI_FEATURES.map((feat, i) => (
                  <motion.div
                    key={feat.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.15 + i * 0.05 }}
                  >
                    <Link href={`/board/ai/${feat.id}`}>
                      <div
                        className={cn(
                          "rounded-2xl border border-slate-100 bg-white shadow-card p-5",
                          "hover:shadow-card-hover hover:border-primary-200 transition-all duration-200",
                          "flex items-start gap-4 group"
                        )}
                      >
                        <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center shrink-0 group-hover:bg-primary-100 transition-colors">
                          {aiIconMap[feat.id] ?? <Sparkles size={20} className="text-primary-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">
                            {feat.name}
                          </h3>
                          <p className="text-sm text-text-muted mt-0.5 line-clamp-2">{feat.description}</p>
                        </div>
                        <ChevronRight size={18} className="text-slate-400 group-hover:text-primary-600 shrink-0 mt-0.5" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
                <FolderOpen size={16} className="text-indigo-600" />
                자료실
              </h2>
              <p className="text-xs text-slate-500 mb-3">
                Google Drive에 저장된 회사·사건·백과 파일을 탐색기 형태로 검색·업로드·미리보기·다운로드할 수 있습니다.
                목록은 <span className="font-medium text-slate-600">새로고침</span> 또는 검색 시에만 불러옵니다.
              </p>
              <WorkspaceFileExplorer />
            </section>
          </>
        )}
      </motion.div>
    </div>
  );
}
