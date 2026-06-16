"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { CasesListPagination } from "@/components/cases/CasesListPagination";
import { MessengerTemplateEditorPopup } from "@/components/messenger/MessengerTemplateEditorPopup";
import {
  loadTemplates,
  saveTemplate,
  searchTemplates,
  softDeleteTemplate,
  updateTemplate,
  type MessengerTemplate,
} from "@/lib/messengerTemplates";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 6;

type Props = {
  onApply: (template: MessengerTemplate) => void;
};

export function MessengerTemplatePanel({ onApply }: Props) {
  const [templates, setTemplates] = useState<MessengerTemplate[]>([]);
  const [templateSearch, setTemplateSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit" | "detail">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorInitial, setEditorInitial] = useState<Pick<
    MessengerTemplate,
    "title" | "content"
  > | null>(null);

  const refreshTemplates = useCallback(() => {
    setTemplates(
      templateSearch.trim() ? searchTemplates(templateSearch) : loadTemplates()
    );
  }, [templateSearch]);

  useEffect(() => {
    refreshTemplates();
  }, [refreshTemplates]);

  useEffect(() => {
    setPage(1);
  }, [templateSearch]);

  const totalPages = Math.max(1, Math.ceil(templates.length / PAGE_SIZE));
  const paginated = useMemo(
    () => templates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [templates, page]
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const selected = templates.find((t) => t.id === selectedId) ?? null;

  const openCreate = () => {
    setEditorMode("create");
    setEditingId(null);
    setEditorInitial({ title: "", content: "" });
    setEditorOpen(true);
  };

  const openEdit = (t: MessengerTemplate) => {
    setSelectedId(t.id);
    setEditorMode("edit");
    setEditingId(t.id);
    setEditorInitial({ title: t.title, content: t.content });
    setEditorOpen(true);
  };

  const openDetail = (t: MessengerTemplate) => {
    setSelectedId(t.id);
    setEditorMode("detail");
    setEditingId(t.id);
    setEditorInitial({ title: t.title, content: t.content });
    setEditorOpen(true);
  };

  const handleSave = (payload: { title: string; content: string }) => {
    if (editorMode === "create") {
      const created = saveTemplate(payload);
      setSelectedId(created.id);
      toast.success("양식이 등록되었습니다.");
    } else if (editingId) {
      const updated = updateTemplate(editingId, payload);
      if (!updated) {
        toast.error("양식을 찾을 수 없습니다.");
        return;
      }
      toast.success("양식이 저장되었습니다.");
    }
    refreshTemplates();
  };

  const handleDelete = () => {
    if (!selected) {
      toast.error("삭제할 양식을 목록에서 선택하세요.");
      return;
    }
    if (!confirm(`"${selected.title}" 양식을 삭제하시겠습니까?`)) return;
    if (!softDeleteTemplate(selected.id)) {
      toast.error("양식을 삭제할 수 없습니다.");
      return;
    }
    setSelectedId(null);
    refreshTemplates();
    toast.success("양식이 삭제되었습니다.");
  };

  const handleEditSelected = () => {
    if (!selected) {
      toast.error("수정할 양식을 목록에서 선택하세요.");
      return;
    }
    openEdit(selected);
  };

  return (
    <>
      <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden h-full min-h-0">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2 shrink-0">
          <h2 className="text-sm font-semibold text-slate-800">사전 발송 양식</h2>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openCreate}
              leftIcon={<Plus size={14} />}
            >
              등록
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleEditSelected}
              leftIcon={<Pencil size={14} />}
              disabled={!selected}
            >
              수정
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDelete}
              leftIcon={<Trash2 size={14} />}
              disabled={!selected}
              className="text-danger-600 hover:bg-danger-50 hover:border-danger-200 disabled:text-slate-400"
            >
              삭제
            </Button>
          </div>
        </div>

        <div className="p-3 border-b border-slate-100 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              placeholder="양식 검색 (제목·내용)"
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
          {templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-text-muted">
              <FileText size={36} className="text-slate-300 mb-2" />
              저장된 양식이 없습니다.
              <p className="text-xs mt-1">&quot;등록&quot;을 누르면 제목·내용을 작성해 추가할 수 있습니다.</p>
            </div>
          ) : (
            paginated.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "rounded-xl border bg-white transition-colors",
                  selectedId === t.id
                    ? "border-primary-400 bg-primary-50/40 ring-1 ring-primary-200"
                    : "border-slate-200 hover:border-primary-300 hover:bg-primary-50/30"
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(t.id);
                    openDetail(t);
                  }}
                  onDoubleClick={() => onApply(t)}
                  className="w-full text-left p-3"
                  title="클릭: 상세·수정 팝업 / 더블클릭: 발송 내용에 적용"
                >
                  <p className="font-medium text-slate-800 truncate">{t.title}</p>
                  <p className="text-xs text-text-muted mt-1 line-clamp-2 whitespace-pre-wrap">
                    {t.content}
                  </p>
                </button>
              </div>
            ))
          )}
        </div>

        {templates.length > 0 && (
          <CasesListPagination
            currentPage={page}
            totalPages={totalPages}
            totalCount={templates.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            className="shrink-0"
          />
        )}
      </div>

      <MessengerTemplateEditorPopup
        open={editorOpen}
        mode={editorMode}
        initial={editorInitial}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}
