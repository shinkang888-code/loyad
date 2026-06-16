import type { NoticeRecord } from "@/lib/noticeService";

export async function fetchNotices(options?: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: NoticeRecord[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.q?.trim()) params.set("q", options.q.trim());
  if (options?.page) params.set("page", String(options.page));
  if (options?.pageSize) params.set("page_size", String(options.pageSize));

  const res = await fetch(`/api/notices?${params.toString()}`, { credentials: "include" });
  const json = (await res.json()) as {
    success?: boolean;
    data?: NoticeRecord[];
    total?: number;
    error?: string;
  };
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "공지 목록을 불러올 수 없습니다.");
  }
  return {
    items: Array.isArray(json.data) ? json.data : [],
    total: typeof json.total === "number" ? json.total : 0,
  };
}
