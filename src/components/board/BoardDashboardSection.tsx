// filepath: src/components/board/BoardDashboardSection.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Settings2,
  Check,
  X,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import * as Dialog from "@radix-ui/react-dialog";
import { MAX_BOARDS } from "@/lib/boardConfig";
import {
  loadBoards,
  loadBoardsIncludingDeleted,
  reorderBoards as reorderLocalBoards,
  createBoard as createLocalBoard,
  updateBoard as updateLocalBoard,
  softDeleteBoard as softDeleteLocalBoard,
  restoreBoard as restoreLocalBoard,
  type StoredBoardItem,
  type BoardKind,
} from "@/lib/boardStorage";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type ApiBoardRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  boardKind: BoardKind;
  isSystem: boolean;
  deletedAt: string | null;
  sortOrder: number;
};

type DisplayBoard = {
  key: string;
  linkId: string;
  recordId?: string;
  name: string;
  description?: string;
  boardKind: BoardKind;
  isSystem?: boolean;
  source: "api" | "local";
};

const BOARD_KIND_LABELS: Record<BoardKind, string> = {
  post: "게시물형",
  data: "자료실형",
};

function mapLocalBoard(b: StoredBoardItem): DisplayBoard {
  return {
    key: b.id,
    linkId: b.id,
    name: b.name,
    description: b.description,
    boardKind: b.type,
    source: "local",
  };
}

function mapApiBoard(b: ApiBoardRow): DisplayBoard {
  return {
    key: b.id,
    linkId: b.slug,
    recordId: b.id,
    name: b.name,
    description: b.description || undefined,
    boardKind: b.boardKind,
    isSystem: b.isSystem,
    source: "api",
  };
}

interface BoardDashboardSectionProps {
  isAdmin: boolean;
  nativeBoard: boolean | null;
}

export function BoardDashboardSection({ isAdmin, nativeBoard }: BoardDashboardSectionProps) {
  const [editMode, setEditMode] = useState(false);
  const [boards, setBoards] = useState<DisplayBoard[]>([]);
  const [deletedBoards, setDeletedBoards] = useState<DisplayBoard[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createType, setCreateType] = useState<BoardKind>("post");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editType, setEditType] = useState<BoardKind>("post");
  const [saving, setSaving] = useState(false);

  const useApi = nativeBoard === true;

  const refreshLocal = useCallback(() => {
    setBoards(loadBoards().map(mapLocalBoard));
    if (isAdmin) {
      setDeletedBoards(
        loadBoardsIncludingDeleted()
          .filter((b) => b.deletedAt)
          .map(mapLocalBoard)
      );
    }
  }, [isAdmin]);

  const refreshApi = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/boards", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "게시판 목록 실패");
      const rows = (data.data ?? []) as ApiBoardRow[];
      const active = rows
        .filter((b) => !b.deletedAt)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(mapApiBoard);
      setBoards(active);
      if (isAdmin) {
        setDeletedBoards(rows.filter((b) => b.deletedAt).map(mapApiBoard));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "게시판 목록을 불러올 수 없습니다.");
    }
  }, [isAdmin]);

  const refresh = useCallback(async () => {
    if (useApi && isAdmin) {
      await refreshApi();
      return;
    }
    if (useApi) {
      try {
        const res = await fetch("/api/board", { credentials: "include" });
        const data = await res.json();
        if (data.nativeBoard && Array.isArray(data.data)) {
          setBoards(
            data.data.map((b: { id: string; name: string; description?: string; boardKind?: BoardKind }) =>
              mapLocalBoard({
                id: b.id,
                name: b.name,
                description: b.description,
                type: b.boardKind ?? "post",
                order: 0,
              })
            )
          );
          return;
        }
      } catch {
        /* fallback */
      }
    }
    refreshLocal();
  }, [useApi, isAdmin, refreshApi, refreshLocal]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedBoard = boards.find((b) => b.key === selectedKey) ?? null;

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !editMode) return;
    const ordered = Array.from(boards);
    const [removed] = ordered.splice(result.source.index, 1);
    ordered.splice(result.destination.index, 0, removed);
    setBoards(ordered);

    if (useApi && isAdmin) {
      const ids = ordered.map((b) => b.recordId).filter(Boolean) as string[];
      try {
        const res = await fetch("/api/admin/boards/reorder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ orderedIds: ids }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        toast.success("순서가 저장되었습니다.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "순서 저장 실패");
        void refresh();
      }
    } else {
      reorderLocalBoards(ordered.map((b) => b.key));
      toast.success("순서가 변경되었습니다.");
    }
  };

  const handleCreate = async () => {
    if (!createName.trim()) {
      toast.error("게시판 이름을 입력해 주세요.");
      return;
    }
    if (boards.length >= MAX_BOARDS) {
      toast.error(`게시판은 최대 ${MAX_BOARDS}개까지 등록할 수 있습니다.`);
      return;
    }
    setSaving(true);
    try {
      if (useApi && isAdmin) {
        const res = await fetch("/api/admin/boards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: createName.trim(),
            description: createDesc.trim() || undefined,
            boardKind: createType,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      } else {
        createLocalBoard({ name: createName.trim(), description: createDesc.trim(), type: createType });
      }
      setCreateOpen(false);
      setCreateName("");
      setCreateDesc("");
      setCreateType("post");
      toast.success("게시판이 생성되었습니다.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = () => {
    if (!selectedBoard) {
      toast.error("편집할 게시판을 선택해 주세요.");
      return;
    }
    setEditName(selectedBoard.name);
    setEditDesc(selectedBoard.description ?? "");
    setEditType(selectedBoard.boardKind);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!selectedBoard || !editName.trim()) {
      toast.error("게시판 이름을 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      if (useApi && isAdmin && selectedBoard.recordId) {
        const res = await fetch(`/api/admin/boards?id=${encodeURIComponent(selectedBoard.recordId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: editName.trim(),
            description: editDesc.trim(),
            boardKind: editType,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      } else {
        updateLocalBoard(selectedBoard.key, {
          name: editName.trim(),
          description: editDesc.trim(),
          type: editType,
        });
      }
      setEditOpen(false);
      setSelectedKey(null);
      toast.success("수정되었습니다.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "수정 실패");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBoard) {
      toast.error("삭제할 게시판을 선택해 주세요.");
      return;
    }
    if (selectedBoard.isSystem) {
      toast.error("시스템 게시판은 삭제할 수 없습니다.");
      return;
    }
    if (!confirm(`「${selectedBoard.name}」 게시판을 삭제하시겠습니까?`)) return;
    setSaving(true);
    try {
      if (useApi && isAdmin && selectedBoard.recordId) {
        const res = await fetch(`/api/admin/boards?id=${encodeURIComponent(selectedBoard.recordId)}`, {
          method: "DELETE",
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      } else {
        softDeleteLocalBoard(selectedBoard.key);
      }
      setSelectedKey(null);
      toast.success("게시판이 삭제되었습니다.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (board: DisplayBoard) => {
    setSaving(true);
    try {
      if (useApi && isAdmin && board.recordId) {
        const res = await fetch("/api/admin/boards/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id: board.recordId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      } else {
        restoreLocalBoard(board.key);
      }
      toast.success("게시판이 복구되었습니다.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "복구 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-600">게시판</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {boards.length}/{MAX_BOARDS}개 · 드래그로 순서 변경
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant={editMode ? "primary" : "outline"}
              leftIcon={editMode ? <Check size={14} /> : <Settings2 size={14} />}
              onClick={() => {
                setEditMode((v) => !v);
                if (editMode) setSelectedKey(null);
              }}
            >
              {editMode ? "편집 완료" : "편집"}
            </Button>
            {editMode && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Plus size={14} />}
                  onClick={() => setCreateOpen(true)}
                  disabled={boards.length >= MAX_BOARDS}
                >
                  만들기
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Pencil size={14} />}
                  onClick={openEdit}
                  disabled={!selectedKey}
                >
                  이름 변경
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Trash2 size={14} />}
                  onClick={() => void handleDelete()}
                  disabled={!selectedKey || selectedBoard?.isSystem}
                  className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
                >
                  삭제
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <DragDropContext onDragEnd={(r) => void handleDragEnd(r)}>
        <Droppable droppableId="workspace-boards" direction="horizontal">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {boards.map((board, i) => (
                <Draggable
                  key={board.key}
                  draggableId={board.key}
                  index={i}
                  isDragDisabled={!editMode || !isAdmin}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={cn(
                        "rounded-2xl border bg-white shadow-card p-5 relative flex items-start gap-3 group",
                        snapshot.isDragging && "shadow-lg ring-2 ring-primary-200 z-10",
                        editMode && selectedKey === board.key
                          ? "border-primary-400 ring-2 ring-primary-100"
                          : "border-slate-100 hover:shadow-card-hover hover:border-primary-200"
                      )}
                    >
                      {editMode && isAdmin && (
                        <div
                          {...provided.dragHandleProps}
                          className="shrink-0 pt-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
                          title="드래그하여 순서 변경"
                        >
                          <GripVertical size={18} />
                        </div>
                      )}
                      {editMode && isAdmin && (
                        <label
                          className="absolute top-3 right-3 z-10 flex items-center gap-1 text-xs text-slate-500 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedKey === board.key}
                            onChange={() =>
                              setSelectedKey(selectedKey === board.key ? null : board.key)
                            }
                            className="rounded border-slate-300"
                          />
                        </label>
                      )}
                      <Link
                        href={`/board/${board.linkId}`}
                        className="flex items-start gap-4 flex-1 min-w-0"
                        onClick={(e) => editMode && e.preventDefault()}
                      >
                        <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-primary-50 transition-colors">
                          <FileText size={20} className="text-slate-600" />
                        </div>
                        <div className="flex-1 min-w-0 pr-6">
                          <h3 className="text-base font-semibold text-slate-900 group-hover:text-primary-600 transition-colors truncate">
                            {board.name}
                          </h3>
                          {board.description && (
                            <p className="text-sm text-text-muted mt-0.5 line-clamp-2">{board.description}</p>
                          )}
                          <p className="text-xs text-text-muted mt-1">
                            {BOARD_KIND_LABELS[board.boardKind]}
                            {board.isSystem && " · 시스템"}
                          </p>
                        </div>
                        {!editMode && (
                          <ChevronRight
                            size={18}
                            className="text-slate-400 group-hover:text-primary-600 shrink-0 mt-0.5"
                          />
                        )}
                      </Link>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {editMode && boards.length < MAX_BOARDS && (
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-5 flex flex-col items-center justify-center gap-2 min-h-[120px] text-slate-500 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50/30 transition-colors"
                >
                  <Plus size={24} />
                  <span className="text-sm font-medium">게시판 추가</span>
                </button>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {editMode && isAdmin && (
        <p className="text-xs text-text-muted mt-2">
          편집 모드: 카드를 선택한 뒤 이름 변경·삭제하거나, 드래그하여 위치를 바꿀 수 있습니다.
        </p>
      )}

      {editMode && isAdmin && deletedBoards.length > 0 && (
        <div className="mt-6 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
          <h3 className="text-sm font-semibold text-slate-600 mb-2">삭제된 게시판</h3>
          <ul className="space-y-2">
            {deletedBoards.map((b) => (
              <li key={b.key} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-slate-700">{b.name}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleRestore(b)}
                  disabled={saving || boards.length >= MAX_BOARDS}
                >
                  복구
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <BoardFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="게시판 만들기"
        name={createName}
        desc={createDesc}
        kind={createType}
        onNameChange={setCreateName}
        onDescChange={setCreateDesc}
        onKindChange={setCreateType}
        onSubmit={() => void handleCreate()}
        submitLabel="만들기"
        saving={saving}
      />

      <BoardFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="게시판 이름 변경"
        name={editName}
        desc={editDesc}
        kind={editType}
        onNameChange={setEditName}
        onDescChange={setEditDesc}
        onKindChange={setEditType}
        onSubmit={() => void handleEdit()}
        submitLabel="저장"
        saving={saving}
      />
    </section>
  );
}

function BoardFormDialog({
  open,
  onOpenChange,
  title,
  name,
  desc,
  kind,
  onNameChange,
  onDescChange,
  onKindChange,
  onSubmit,
  submitLabel,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  name: string;
  desc: string;
  kind: BoardKind;
  onNameChange: (v: string) => void;
  onDescChange: (v: string) => void;
  onKindChange: (v: BoardKind) => void;
  onSubmit: () => void;
  submitLabel: string;
  saving: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-slate-900">{title}</Dialog.Title>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">종류</label>
              <div className="flex gap-2">
                {(["post", "data"] as BoardKind[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onKindChange(t)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors",
                      kind === t
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {t === "post" ? "게시물형" : "자료실형"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">게시판 이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="예: 자유게시판"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">설명 (선택)</label>
              <input
                type="text"
                value={desc}
                onChange={(e) => onDescChange(e.target.value)}
                placeholder="예: 업무·자료 공유"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <Button size="sm" onClick={onSubmit} disabled={saving}>
              {submitLabel}
            </Button>
            <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
