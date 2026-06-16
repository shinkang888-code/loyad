"use client";

import { useEffect, useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MessengerTemplate } from "@/lib/messengerTemplates";

type Props = {
  open: boolean;
  mode: "create" | "edit" | "detail";
  initial?: Pick<MessengerTemplate, "title" | "content"> | null;
  onClose: () => void;
  onSave: (payload: { title: string; content: string }) => void;
};

export function MessengerTemplateEditorPopup({
  open,
  mode,
  initial,
  onClose,
  onSave,
}: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState(mode !== "detail");

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setContent(initial?.content ?? "");
    setEditing(mode !== "detail");
  }, [open, mode, initial?.title, initial?.content]);

  if (!open) return null;

  const handleSave = () => {
    if (!content.trim()) return;
    onSave({
      title: title.trim() || "제목 없음",
      content: content.trim(),
    });
    onClose();
  };

  const titleLabel =
    mode === "create" ? "양식 등록" : mode === "edit" ? "양식 수정" : "양식 상세";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="messenger-template-editor-title"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 id="messenger-template-editor-title" className="text-sm font-semibold text-slate-900">
            {titleLabel}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">양식 제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              readOnly={!editing}
              placeholder="예: 상담안내, 기일 알림"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-primary-400 outline-none read-only:bg-slate-50 read-only:text-slate-700"
              autoFocus={editing}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">발송 내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              readOnly={!editing}
              placeholder="발송할 메시지 내용을 입력하세요."
              rows={12}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-primary-400 outline-none resize-y min-h-[200px] leading-relaxed read-only:bg-slate-50 read-only:text-slate-700"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
          <Button size="sm" variant="outline" onClick={onClose}>
            취소
          </Button>
          {mode === "detail" && !editing && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Pencil size={14} />}
              onClick={() => setEditing(true)}
            >
              수정
            </Button>
          )}
          {(editing || mode !== "detail") && (
            <Button
              size="sm"
              leftIcon={<Save size={14} />}
              onClick={handleSave}
              disabled={!content.trim()}
            >
              저장
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
