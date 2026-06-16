"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutList,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn, formatDate } from "@/lib/utils";

type BoardRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  boardKind: "post" | "data";
  sortOrder: number;
  isSystem: boolean;
  deletedAt: string | null;
};

type PostRow = {
  id: string;
  numId: number;
  title: string;
  authorName: string;
  viewCount: number;
  commentCount: number;
  deletedAt: string | null;
  updatedAt: string;
};

type Props = {
  showBackLink?: boolean;
};

export function BoardSettingsPanel({ showBackLink = true }: Props) {
  const [loading, setLoading] = useState(true);
  const [boards, setBoards] = useState<BoardRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const mapBoard = (b: Record<string, unknown>): BoardRow => ({
    id: String(b.id),
    slug: String(b.slug),
    name: String(b.name),
    description: String(b.description ?? ""),
    boardKind: (b.boardKind as "post" | "data") ?? (b.board_kind as "post" | "data") ?? "post",
    sortOrder: Number(b.sortOrder ?? b.sort_order ?? 0),
    isSystem: Boolean(b.isSystem ?? b.is_system),
    deletedAt: (b.deletedAt as string | null) ?? (b.deleted_at as string | null) ?? null,
  });

  const mapPost = (p: Record<string, unknown>): PostRow => ({
    id: String(p.id),
    numId: Number(p.numId ?? p.num_id),
    title: String(p.title),
    authorName: String(p.authorName ?? p.author_name ?? ""),
    viewCount: Number(p.viewCount ?? p.view_count ?? 0),
    commentCount: Number(p.commentCount ?? p.comment_count ?? 0),
    deletedAt: (p.deletedAt as string | null) ?? (p.deleted_at as string | null) ?? null,
    updatedAt: String(p.updatedAt ?? p.updated_at ?? ""),
  });

  const loadBoards = useCallback(async () => {
    const res = await fetch("/api/admin/boards", { credentials: "include" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "게시판 목록 조회 실패");
    const rows = (data.data ?? []).map((b: Record<string, unknown>) => mapBoard(b));
    setBoards(rows.filter((b: BoardRow) => !b.deletedAt));
    return rows;
  }, []);

  const loadPosts = useCallback(async (boardId: string) => {
    setPostsLoading(true);
    try {
      const res = await fetch(`/api/admin/boards/posts?boardId=${boardId}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "게시물 조회 실패");
      setPosts((data.data ?? []).map((p: Record<string, unknown>) => mapPost(p)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "게시물 조회 실패");
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      await loadBoards();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "새로고침 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (selectedId) loadPosts(selectedId);
    else setPosts([]);
  }, [selectedId, loadPosts]);

  const selected = boards.find((b) => b.id === selectedId) ?? null;

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("게시판 이름을 입력하세요.");
      return;
    }
    try {
      const res = await fetch("/api/admin/boards", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          slug: newSlug.trim() || undefined,
          description: newDesc.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "생성 실패");
      toast.success("게시판이 생성되었습니다.");
      setCreateOpen(false);
      setNewName("");
      setNewSlug("");
      setNewDesc("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "생성 실패");
    }
  };

  const handleEdit = async () => {
    if (!selected) return;
    try {
      const res = await fetch(`/api/admin/boards?id=${selected.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      toast.success("저장되었습니다.");
      setEditOpen(false);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 실패");
    }
  };

  const handleDelete = async () => {
    if (!selected || selected.isSystem) return;
    if (!confirm(`「${selected.name}」 게시판을 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/admin/boards?id=${selected.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "삭제 실패");
      toast.success("삭제되었습니다.");
      setSelectedId(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "삭제 실패");
    }
  };

  return (
    <div className="space-y-6">
      {showBackLink && (
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-primary-600"
        >
          ← 시스템 설정
        </Link>
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutList size={26} className="text-primary-600" />
            게시판 관리
          </h1>
          <p className="text-sm text-text-muted mt-1">
            LawyGo 네이티브 게시판 — 게시판·게시물을 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" leftIcon={<RefreshCw size={14} />} onClick={refresh}>
            새로고침
          </Button>
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
            게시판 추가
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse h-40 bg-slate-100 rounded-2xl" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 font-semibold text-slate-800">
              게시판 목록
            </div>
            <ul className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
              {boards.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(b.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors",
                      selectedId === b.id && "bg-primary-50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-900">{b.name}</span>
                      {b.isSystem && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          시스템
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">/{b.slug}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="font-semibold text-slate-800">
                {selected ? `「${selected.name}」 게시물` : "게시판을 선택하세요"}
              </span>
              {selected && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<ExternalLink size={14} />}
                    onClick={() => window.open(`/board/${selected.slug}`, "_blank")}
                  >
                    열기
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Pencil size={14} />}
                    onClick={() => {
                      setEditName(selected.name);
                      setEditDesc(selected.description);
                      setEditOpen(true);
                    }}
                  >
                    편집
                  </Button>
                  {!selected.isSystem && (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 size={14} />}
                      onClick={handleDelete}
                    >
                      삭제
                    </Button>
                  )}
                </div>
              )}
            </div>
            {postsLoading ? (
              <div className="p-6 animate-pulse h-32 bg-slate-50" />
            ) : selected ? (
              <ul className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
                {posts.length === 0 ? (
                  <li className="px-4 py-8 text-center text-sm text-text-muted">게시물이 없습니다.</li>
                ) : (
                  posts.map((p) => (
                    <li key={p.id} className="px-4 py-3">
                      <div className="flex justify-between gap-2">
                        <span className="text-sm font-medium text-slate-900 line-clamp-1">
                          {p.deletedAt ? `[삭제] ${p.title}` : p.title}
                        </span>
                        <span className="text-xs text-text-muted shrink-0">#{p.numId}</span>
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        {p.authorName} · 조회 {p.viewCount} · {formatDate(p.updatedAt)}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            ) : (
              <p className="px-4 py-8 text-sm text-text-muted text-center">
                왼쪽에서 게시판을 선택하면 게시물 목록이 표시됩니다.
              </p>
            )}
          </div>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-lg">게시판 추가</h3>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              placeholder="게시판 이름"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              placeholder="ID (slug, 선택)"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
            />
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              placeholder="설명 (선택)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                취소
              </Button>
              <Button leftIcon={<Save size={14} />} onClick={handleCreate}>
                생성
              </Button>
            </div>
          </div>
        </div>
      )}

      {editOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-lg">게시판 편집</h3>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              placeholder="설명"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                취소
              </Button>
              <Button leftIcon={<Save size={14} />} onClick={handleEdit}>
                저장
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
