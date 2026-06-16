// filepath: src/components/drive/WorkspaceFileExplorer.tsx
"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  HardDrive,
  Search,
  Upload,
  Trash2,
  Download,
  Pencil,
  RefreshCw,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  File,
  FolderOpen,
  Folder,
  Check,
  X,
  Loader2,
  Eye,
  ChevronRight,
  Settings,
  LayoutGrid,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { isPreviewableMime } from "@/lib/pdfPreview";

type CompanyFileItem = {
  fileId: string;
  name: string;
  displayName: string;
  mimeType: string;
  size?: number;
  source: "company_shared" | "company_projects" | "case_files";
  relativePath: string;
  createdTime?: string;
  modifiedTime?: string;
  caseId?: string;
  caseNumber?: string;
};

type FolderInfo = {
  managementNumber: string;
  driveFolderUrl: string | null;
  rootPath: string;
  sharedPath: string;
  projectsPath?: string;
  available: boolean;
};

type SourceFilter = "all" | CompanyFileItem["source"];
type ViewMode = "list" | "grid";

const SOURCE_LABEL: Record<CompanyFileItem["source"], string> = {
  company_shared: "회사 자료실",
  company_projects: "백과 프로젝트",
  case_files: "사건 자료",
};

const NAV_ITEMS: { id: SourceFilter; label: string; icon: typeof Folder }[] = [
  { id: "all", label: "전체 파일", icon: HardDrive },
  { id: "company_shared", label: "회사 자료실", icon: Folder },
  { id: "case_files", label: "사건 자료", icon: FolderOpen },
  { id: "company_projects", label: "백과 프로젝트", icon: Folder },
];

function formatSize(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function FileTypeIcon({ mimeType, size = 18 }: { mimeType: string; size?: number }) {
  if (mimeType.startsWith("image/")) return <ImageIcon size={size} className="text-emerald-600" />;
  if (mimeType.includes("pdf")) return <FileText size={size} className="text-red-500" />;
  return <File size={size} className="text-slate-500" />;
}

export function WorkspaceFileExplorer() {
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [files, setFiles] = useState<CompanyFileItem[]>([]);
  const [folderInfo, setFolderInfo] = useState<FolderInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [available, setAvailable] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [showFolderInfo, setShowFolderInfo] = useState(false);

  const loadFiles = useCallback(
    async (q?: string, source?: SourceFilter) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        const term = q?.trim();
        const src = source ?? sourceFilter;
        if (term) params.set("q", term);
        if (src !== "all") params.set("source", src);
        const qs = params.toString();
        const res = await fetch(`/api/drive/company-files${qs ? `?${qs}` : ""}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "목록을 불러올 수 없습니다.");
        setFiles(Array.isArray(data.files) ? data.files : []);
        setAvailable(data.available !== false);
        setMessage(data.message ?? null);
        if (data.folders) {
          setFolderInfo({
            managementNumber: data.folders.managementNumber,
            driveFolderUrl: data.folders.driveFolderUrl,
            rootPath: data.folders.rootPath,
            sharedPath: data.folders.sharedPath,
            projectsPath: data.folders.projectsPath,
            available: Boolean(data.folders.rootFolderId),
          });
        }
        setLoaded(true);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "자료 목록 로드 실패");
        setFiles([]);
      } finally {
        setLoading(false);
      }
    },
    [sourceFilter]
  );

  const filteredFiles = useMemo(() => {
    if (sourceFilter === "all") return files;
    return files.filter((f) => f.source === sourceFilter);
  }, [files, sourceFilter]);

  const handleSourceChange = (next: SourceFilter) => {
    setSourceFilter(next);
    if (loaded) void loadFiles(query, next);
  };

  const previewFile = useMemo(
    () => files.find((f) => f.fileId === previewId) ?? null,
    [files, previewId]
  );

  const previewUrl = previewId
    ? `/api/drive/company-files/download/${previewId}?inline=1`
    : null;

  const addressPath = useMemo(() => {
    const parts = ["자료실"];
    if (folderInfo?.managementNumber) parts.push(`관리번호 ${folderInfo.managementNumber}`);
    if (sourceFilter !== "all") parts.push(SOURCE_LABEL[sourceFilter]);
    if (query) parts.push(`검색: ${query}`);
    return parts;
  }, [folderInfo, sourceFilter, query]);

  const handleSearch = () => {
    setQuery(searchInput);
    void loadFiles(searchInput, sourceFilter);
  };

  const handlePreview = (file: CompanyFileItem) => {
    setPreviewId(file.fileId);
    if (!isPreviewableMime(file.mimeType, file.displayName)) {
      toast.info("PDF·이미지·텍스트 파일만 미리보기 패널에서 볼 수 있습니다.");
    }
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setUploading(true);
    let ok = 0;
    for (const file of Array.from(fileList)) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/drive/company-files/upload", {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        ok++;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `${file.name} 업로드 실패`);
      }
    }
    if (ok > 0) {
      toast.success(`${ok}개 파일이 업로드되었습니다.`);
      void loadFiles(query, sourceFilter);
    }
    setUploading(false);
  };

  const handleDelete = async (file: CompanyFileItem) => {
    if (!confirm(`「${file.displayName}」을(를) 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/drive/company-files/${file.fileId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("삭제되었습니다.");
      if (previewId === file.fileId) setPreviewId(null);
      void loadFiles(query, sourceFilter);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "삭제 실패");
    }
  };

  const saveRename = async (fileId: string) => {
    const name = editName.trim();
    if (!name) {
      toast.error("파일명을 입력하세요.");
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch(`/api/drive/company-files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("파일명이 변경되었습니다.");
      setEditingId(null);
      setEditName("");
      void loadFiles(query, sourceFilter);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "이름 변경 실패");
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden flex flex-col min-h-[480px]">
      {/* 탐색기 리본 툴바 */}
      <div className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="px-3 py-2 flex flex-wrap items-center gap-1.5">
          <label>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                void handleUpload(e.target.files);
                e.target.value = "";
              }}
            />
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer",
                uploading
                  ? "opacity-50 pointer-events-none border-slate-200 text-slate-400"
                  : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              )}
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              업로드
            </span>
          </label>
          <ToolbarBtn
            icon={<Download size={14} />}
            label="다운로드"
            disabled={!previewFile}
            onClick={() => {
              if (previewFile) window.open(`/api/drive/company-files/download/${previewFile.fileId}`, "_blank");
            }}
          />
          <ToolbarBtn
            icon={<Pencil size={14} />}
            label="이름 변경"
            disabled={!previewFile}
            onClick={() => {
              if (previewFile) {
                setEditingId(previewFile.fileId);
                setEditName(previewFile.displayName);
              }
            }}
          />
          <ToolbarBtn
            icon={<Trash2 size={14} />}
            label="삭제"
            disabled={!previewFile}
            danger
            onClick={() => previewFile && void handleDelete(previewFile)}
          />
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <ToolbarBtn
            icon={<RefreshCw size={14} className={cn(loading && "animate-spin")} />}
            label="새로고침"
            onClick={() => void loadFiles(query, sourceFilter)}
          />
          <ToolbarBtn
            icon={<Settings size={14} />}
            label="폴더 설정"
            onClick={() => setShowFolderInfo((v) => !v)}
          />
          {folderInfo?.driveFolderUrl && (
            <a
              href={folderInfo.driveFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <ExternalLink size={14} />
              Drive에서 열기
            </a>
          )}
          <div className="flex-1" />
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              type="button"
              title="목록"
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5",
                viewMode === "list" ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <List size={14} />
            </button>
            <button
              type="button"
              title="아이콘"
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5",
                viewMode === "grid" ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>

        {/* 주소 표시줄 */}
        <div className="px-3 pb-2 flex items-center gap-1 text-xs text-slate-600 overflow-x-auto">
          <HardDrive size={13} className="text-indigo-600 shrink-0" />
          {addressPath.map((part, i) => (
            <span key={i} className="flex items-center gap-1 shrink-0">
              {i > 0 && <ChevronRight size={12} className="text-slate-400" />}
              <span className={i === addressPath.length - 1 ? "font-medium text-slate-800" : ""}>
                {part}
              </span>
            </span>
          ))}
        </div>

        {/* 검색 */}
        <div className="px-3 pb-3 flex gap-2">
          <div className="flex-1 flex gap-1">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="파일명·경로·사건번호 검색"
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white"
            />
            <Button variant="outline" size="sm" className="h-8" onClick={handleSearch}>
              <Search size={14} />
            </Button>
          </div>
        </div>
      </div>

      {showFolderInfo && folderInfo && (
        <div className="mx-3 mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
          <p>
            <span className="font-medium">루트:</span> {folderInfo.rootPath}
          </p>
          <p>
            <span className="font-medium">자료실:</span> {folderInfo.sharedPath}
          </p>
          {folderInfo.projectsPath && (
            <p>
              <span className="font-medium">백과:</span> {folderInfo.projectsPath}
            </p>
          )}
          <Link href="/admin/settings/drive" className="text-indigo-700 underline inline-block mt-1">
            Drive 연동 설정
          </Link>
        </div>
      )}

      {!available && message && (
        <div className="mx-3 mt-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          {message}
          <p className="text-xs mt-1">
            <Link href="/admin/settings/drive" className="text-indigo-700 underline">
              Google Drive 설정
            </Link>
            에서 연결하세요.
          </p>
        </div>
      )}

      <div className="flex flex-1 min-h-0 border-t border-slate-100">
        {/* 왼쪽 탐색 트리 */}
        <aside className="w-44 shrink-0 border-r border-slate-100 bg-slate-50/50 p-2 hidden sm:block">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-2 mb-1">
            위치
          </p>
          <nav className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const count =
                item.id === "all"
                  ? files.length
                  : files.filter((f) => f.source === item.id).length;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSourceChange(item.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left transition-colors",
                    sourceFilter === item.id
                      ? "bg-indigo-100 text-indigo-800 font-medium"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <Icon size={14} className="shrink-0" />
                  <span className="truncate flex-1">{item.label}</span>
                  <span className="text-[10px] text-slate-400">{count}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* 파일 목록 */}
        <div className="flex-1 min-w-0 flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              <Loader2 size={24} className="animate-spin mr-2 text-indigo-500" />
              불러오는 중…
            </div>
          ) : !loaded ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <FolderOpen size={40} className="text-slate-300 mb-2" />
              <p className="text-sm text-slate-600">파일 목록이 아직 불러와지지 않았습니다.</p>
              <p className="text-xs text-slate-400 mt-1">
                상단 <span className="font-medium text-slate-600">새로고침</span> 또는 검색을 눌러 Drive 파일을 조회하세요.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                leftIcon={<RefreshCw size={14} />}
                onClick={() => void loadFiles(query, sourceFilter)}
              >
                새로고침
              </Button>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <FolderOpen size={40} className="text-slate-300 mb-2" />
              <p className="text-sm text-slate-600">파일이 없습니다.</p>
              <p className="text-xs text-slate-400 mt-1">업로드하거나 검색 조건을 변경해 보세요.</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {filteredFiles.map((f) => (
                <button
                  key={f.fileId}
                  type="button"
                  onClick={() => handlePreview(f)}
                  onDoubleClick={() => handlePreview(f)}
                  className={cn(
                    "p-3 rounded-xl border text-left hover:bg-slate-50 transition-colors",
                    previewId === f.fileId ? "border-indigo-300 bg-indigo-50" : "border-slate-100"
                  )}
                >
                  <FileTypeIcon mimeType={f.mimeType} size={28} />
                  <p className="text-xs font-medium text-slate-900 truncate mt-2">{f.displayName}</p>
                  <p className="text-[10px] text-slate-400">{formatSize(f.size)}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50/95 border-b border-slate-100 z-10">
                  <tr className="text-left text-xs text-slate-500">
                    <th className="px-3 py-2 font-medium">이름</th>
                    <th className="px-2 py-2 font-medium hidden md:table-cell">구분</th>
                    <th className="px-2 py-2 font-medium hidden sm:table-cell">크기</th>
                    <th className="px-2 py-2 font-medium hidden lg:table-cell">수정일</th>
                    <th className="px-3 py-2 font-medium text-right w-28">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((f) => (
                    <tr
                      key={f.fileId}
                      className={cn(
                        "border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer",
                        previewId === f.fileId && "bg-indigo-50/60"
                      )}
                      onClick={() => setPreviewId(f.fileId)}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileTypeIcon mimeType={f.mimeType} />
                          {editingId === f.fileId ? (
                            <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") void saveRename(f.fileId);
                                  if (e.key === "Escape") setEditingId(null);
                                }}
                                className="flex-1 text-xs border border-indigo-300 rounded px-2 py-1"
                                autoFocus
                              />
                              <button type="button" onClick={() => void saveRename(f.fileId)} disabled={savingName}>
                                <Check size={14} className="text-emerald-600" />
                              </button>
                              <button type="button" onClick={() => setEditingId(null)}>
                                <X size={14} className="text-slate-500" />
                              </button>
                            </div>
                          ) : (
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-900 truncate">{f.displayName}</p>
                              <p className="text-[10px] text-slate-400 truncate">{f.relativePath}</p>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-[11px] text-slate-600 hidden md:table-cell">
                        {SOURCE_LABEL[f.source]}
                      </td>
                      <td className="px-2 py-2 text-[11px] text-slate-500 hidden sm:table-cell">
                        {formatSize(f.size)}
                      </td>
                      <td className="px-2 py-2 text-[11px] text-slate-500 hidden lg:table-cell">
                        {formatDate(f.modifiedTime ?? f.createdTime)}
                      </td>
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-0.5">
                          <IconBtn title="미리보기" onClick={() => handlePreview(f)}>
                            <Eye size={13} />
                          </IconBtn>
                          <IconBtn
                            title="이름 변경"
                            onClick={() => {
                              setEditingId(f.fileId);
                              setEditName(f.displayName);
                            }}
                          >
                            <Pencil size={13} />
                          </IconBtn>
                          <a
                            href={`/api/drive/company-files/download/${f.fileId}`}
                            title="다운로드"
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                          >
                            <Download size={13} />
                          </a>
                          <IconBtn title="삭제" danger onClick={() => void handleDelete(f)}>
                            <Trash2 size={13} />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-3 py-1.5 border-t border-slate-100 text-[11px] text-slate-500">
            {filteredFiles.length}개 항목
          </div>
        </div>

        {/* 미리보기 패널 */}
        {previewFile && (
          <aside className="w-56 lg:w-64 shrink-0 border-l border-slate-200 bg-white flex flex-col hidden md:flex">
            <div className="px-3 py-2 border-b border-slate-100 text-xs font-semibold text-slate-800 truncate">
              {previewFile.displayName}
            </div>
            <div className="flex-1 overflow-auto p-2">
              {previewUrl && isPreviewableMime(previewFile.mimeType, previewFile.displayName) ? (
                previewFile.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="" className="max-w-full rounded border border-slate-200" />
                ) : (
                  <iframe src={previewUrl} title="preview" className="w-full h-56 border rounded" />
                )
              ) : (
                <div className="text-center py-8 text-[11px] text-slate-500">
                  <File size={32} className="mx-auto mb-2 text-slate-300" />
                  미리보기 미지원 형식
                </div>
              )}
              <dl className="mt-3 space-y-1 text-[10px] text-slate-500">
                <div>
                  <dt className="inline font-medium">구분: </dt>
                  <dd className="inline">{SOURCE_LABEL[previewFile.source]}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">크기: </dt>
                  <dd className="inline">{formatSize(previewFile.size)}</dd>
                </div>
                {previewFile.caseNumber && (
                  <div>
                    <dt className="inline font-medium">사건: </dt>
                    <dd className="inline">{previewFile.caseNumber}</dd>
                  </div>
                )}
              </dl>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function ToolbarBtn({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
        disabled && "opacity-40 pointer-events-none",
        danger
          ? "border-red-100 text-red-600 hover:bg-red-50"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "p-1.5 rounded hover:bg-slate-100 text-slate-600",
        danger && "hover:bg-red-50 text-red-500"
      )}
    >
      {children}
    </button>
  );
}
