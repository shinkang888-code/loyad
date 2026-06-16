/**
 * 공지사항 서버 저장소
 * 네이티브 게시판(notice) 우선, 레거시 notices 테이블·폴백 지원
 */

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { getAppSetting, setAppSetting } from "@/lib/appSettingsServer";
import { readLocalNotices, writeLocalNotices } from "@/lib/noticeLocalStore";
import type { BoardPost } from "@/lib/boardBridge";
import {
  NOTICE_BOARD_SLUG,
  createPost,
  getPostByNumId,
  isNativeBoardReady,
  listPosts,
  postToBoardPost,
  softDeletePost,
  updatePost,
} from "@/lib/boardService";

export const NOTICE_BOARD_ID = NOTICE_BOARD_SLUG;
const SETTINGS_KEY = "lawygo_notices";

/** Supabase 미설정 로컬 개발용 인메모리 폴백 */
let memoryNotices: NoticeRecord[] | null = null;

export type NoticeRecord = {
  id: string;
  numId: number;
  title: string;
  content: string;
  authorName: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

const SEED_TITLES = [
  "2026년 연차 일정 안내",
  "사무실 보안 정책 변경",
  "기일 달력 이용 안내",
  "사건관리 시스템 업데이트",
  "전자문서 보관 기간 안내",
  "출퇴근 기록 정책",
  "회의실 예약 이용 안내",
  "복리후생 제도 변경",
  "교육 이수 안내",
  "연말 정산 일정",
  "보안 점검 일정",
  "서류 제출 마감 안내",
  "휴가 신청 절차 변경",
  "비상 연락망 업데이트",
  "사무용품 신청 방법",
  "인터넷 사용 정책",
  "재택근무 가이드라인",
  "사건 메모 작성 안내",
  "결재함 이용 방법",
  "메신저 발송 안내",
  "문서 보안 등급 안내",
  "고객 정보 보호 정책",
  "내부 감사 일정",
  "사무소 행사 안내",
  "시스템 점검 공지",
  "비밀번호 정책 강화",
  "이메일 사용 수칙",
  "출장비 정산 절차",
  "법인카드 사용 안내",
  "인사 평가 일정",
];

function buildSeedNotices(): NoticeRecord[] {
  const authors = ["관리자", "시스템관리자", "인사팀", "행정팀"];
  const dayMs = 86400000;
  const base = new Date("2026-02-01T09:00:00.000Z").getTime();
  return SEED_TITLES.map((title, i) => {
    const createdAt = new Date(base + dayMs * i).toISOString();
    return {
      id: `seed-${i + 1}`,
      numId: i + 1,
      title,
      content: `${title}에 대한 내용입니다.\n\n세부 사항은 담당 부서에 문의해 주시기 바랍니다.\n\n감사합니다.`,
      authorName: authors[i % authors.length],
      viewCount: 0,
      createdAt,
      updatedAt: createdAt,
    };
  });
}

function postRecordToNotice(p: {
  numId: number;
  title: string;
  content: string;
  authorName: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  id: string;
}): NoticeRecord {
  return {
    id: p.id,
    numId: p.numId,
    title: p.title,
    content: p.content,
    authorName: p.authorName,
    viewCount: p.viewCount,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    deletedAt: p.deletedAt ?? null,
  };
}

async function useNativeNoticeBoard(): Promise<boolean> {
  return isNativeBoardReady();
}

function fromDbRow(r: Record<string, unknown>): NoticeRecord {
  return {
    id: String(r.id),
    numId: Number(r.num_id),
    title: String(r.title ?? ""),
    content: String(r.content ?? ""),
    authorName: String(r.author_name ?? "관리자"),
    viewCount: Number(r.view_count ?? 0),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    deletedAt: (r.deleted_at as string | null) ?? null,
  };
}

async function loadFromSettings(): Promise<NoticeRecord[]> {
  const stored = await getAppSetting<NoticeRecord[]>(SETTINGS_KEY);
  return Array.isArray(stored) ? stored : [];
}

async function saveToSettings(items: NoticeRecord[]): Promise<boolean> {
  return setAppSetting(SETTINGS_KEY, items);
}

async function useDbTable(): Promise<boolean> {
  const db = getSupabaseAdmin();
  if (!db) return false;
  const { error } = await db.from("notices").select("id").limit(1);
  return !error;
}

async function seedIfEmptyDb(): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) return;
  const { count } = await db
    .from("notices")
    .select("id", { count: "exact", head: true });
  if (count && count > 0) return;
  const seeds = buildSeedNotices();
  const { error } = await db.from("notices").insert(
    seeds.map((s) => ({
      title: s.title,
      content: s.content,
      author_name: s.authorName,
      view_count: 0,
      created_at: s.createdAt,
      updated_at: s.updatedAt,
    }))
  );
  if (error) throw new Error(error.message);
}

async function seedIfEmptySettings(): Promise<void> {
  const items = await loadFromSettings();
  if (items.length > 0) return;
  const file = await readLocalNotices();
  if (file && file.length > 0) return;
  if (memoryNotices && memoryNotices.length > 0) return;
  const seeds = buildSeedNotices();
  memoryNotices = seeds;
  await writeLocalNotices(seeds);
  await saveToSettings(seeds);
}

async function loadLocalNotices(): Promise<NoticeRecord[]> {
  const settings = await loadFromSettings();
  if (settings.length > 0) {
    memoryNotices = settings;
    return settings;
  }
  const file = await readLocalNotices();
  if (file && file.length > 0) {
    memoryNotices = file;
    return file;
  }
  if (memoryNotices && memoryNotices.length > 0) return memoryNotices;
  memoryNotices = buildSeedNotices();
  return memoryNotices;
}

async function saveLocalNotices(items: NoticeRecord[]): Promise<void> {
  memoryNotices = items;
  if (process.env.VERCEL !== "1") {
    await writeLocalNotices(items);
  }
  await saveToSettings(items);
}

export async function listNotices(options?: {
  q?: string;
  page?: number;
  pageSize?: number;
  managementNumber?: string | null;
}): Promise<{ items: NoticeRecord[]; total: number }> {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(Math.max(options?.pageSize ?? 50, 1), 100);
  const q = options?.q?.trim().toLowerCase() ?? "";
  const mgmt = options?.managementNumber?.trim() ?? "";

  if (await useNativeNoticeBoard()) {
    const sources = mgmt ? [mgmt, ""] : [""];
    const merged: NoticeRecord[] = [];
    const seen = new Set<number>();

    for (const managementNumber of sources) {
      const { items } = await listPosts(NOTICE_BOARD_SLUG, {
        page: 1,
        pageSize: 100,
        searchKeyword: q || undefined,
        managementNumber,
      });
      for (const post of items) {
        if (seen.has(post.numId)) continue;
        seen.add(post.numId);
        merged.push(postRecordToNotice(post));
      }
    }

    merged.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const total = merged.length;
    const start = (page - 1) * pageSize;
    return { items: merged.slice(start, start + pageSize), total };
  }

  if (await useDbTable()) {
    await seedIfEmptyDb();
    const db = getSupabaseAdmin()!;
    let query = db
      .from("notices")
      .select("*", { count: "exact" })
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (q) {
      query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%,author_name.ilike.%${q}%`);
    }

    const from = (page - 1) * pageSize;
    const { data, count, error } = await query.range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    return {
      items: (data ?? []).map((r) => fromDbRow(r as Record<string, unknown>)),
      total: count ?? 0,
    };
  }

  await seedIfEmptySettings();
  let items = (await loadLocalNotices()).filter((n) => !n.deletedAt);
  if (q) {
    items = items.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.authorName.toLowerCase().includes(q)
    );
  }
  items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const total = items.length;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total };
}

export async function getNoticeByNumId(
  numId: number,
  managementNumber?: string | null
): Promise<NoticeRecord | null> {
  if (await useNativeNoticeBoard()) {
    const mgmt = managementNumber?.trim() ?? "";
    const sources = mgmt ? [mgmt, ""] : [""];
    for (const mn of sources) {
      const post = await getPostByNumId(NOTICE_BOARD_SLUG, numId, mn);
      if (post) return postRecordToNotice(post);
    }
    return null;
  }

  if (await useDbTable()) {
    const db = getSupabaseAdmin()!;
    const { data, error } = await db
      .from("notices")
      .select("*")
      .eq("num_id", numId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? fromDbRow(data as Record<string, unknown>) : null;
  }

  const items = await loadLocalNotices();
  return items.find((n) => n.numId === numId && !n.deletedAt) ?? null;
}

export async function createNotice(input: {
  title: string;
  content: string;
  authorName: string;
}): Promise<NoticeRecord> {
  const now = new Date().toISOString();

  if (await useNativeNoticeBoard()) {
    const created = await createPost(NOTICE_BOARD_SLUG, {
      title: input.title,
      content: input.content,
      authorName: input.authorName,
    });
    return postRecordToNotice(created);
  }

  if (await useDbTable()) {
    const db = getSupabaseAdmin()!;
    const { data, error } = await db
      .from("notices")
      .insert({
        title: input.title.trim(),
        content: input.content.trim(),
        author_name: input.authorName.trim() || "관리자",
        updated_at: now,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return fromDbRow(data as Record<string, unknown>);
  }

  const items = await loadLocalNotices();
  const maxNum = items.reduce((m, n) => Math.max(m, n.numId), 0);
  const created: NoticeRecord = {
    id: `n-${Date.now()}`,
    numId: maxNum + 1,
    title: input.title.trim(),
    content: input.content.trim(),
    authorName: input.authorName.trim() || "관리자",
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  await saveLocalNotices([created, ...items]);
  return created;
}

export async function updateNotice(
  numId: number,
  input: { title?: string; content?: string; authorName?: string }
): Promise<NoticeRecord | null> {
  const now = new Date().toISOString();

  if (await useNativeNoticeBoard()) {
    const updated = await updatePost(NOTICE_BOARD_SLUG, numId, {
      title: input.title,
      content: input.content,
      authorName: input.authorName,
    });
    return updated ? postRecordToNotice(updated) : null;
  }

  if (await useDbTable()) {
    const db = getSupabaseAdmin()!;
    const update: Record<string, unknown> = { updated_at: now };
    if (input.title !== undefined) update.title = input.title.trim();
    if (input.content !== undefined) update.content = input.content.trim();
    if (input.authorName !== undefined) update.author_name = input.authorName.trim();
    const { data, error } = await db
      .from("notices")
      .update(update)
      .eq("num_id", numId)
      .is("deleted_at", null)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? fromDbRow(data as Record<string, unknown>) : null;
  }

  const items = await loadLocalNotices();
  let updated: NoticeRecord | null = null;
  const next = items.map((n) => {
    if (n.numId !== numId || n.deletedAt) return n;
    updated = {
      ...n,
      title: input.title !== undefined ? input.title.trim() : n.title,
      content: input.content !== undefined ? input.content.trim() : n.content,
      authorName: input.authorName !== undefined ? input.authorName.trim() : n.authorName,
      updatedAt: now,
    };
    return updated;
  });
  if (!updated) return null;
  await saveLocalNotices(next);
  return updated;
}

export async function softDeleteNotice(numId: number): Promise<boolean> {
  if (await useNativeNoticeBoard()) {
    return softDeletePost(NOTICE_BOARD_SLUG, numId);
  }

  const now = new Date().toISOString();

  if (await useDbTable()) {
    const db = getSupabaseAdmin()!;
    const { error } = await db
      .from("notices")
      .update({ deleted_at: now, updated_at: now })
      .eq("num_id", numId);
    return !error;
  }

  const items = await loadLocalNotices();
  let found = false;
  const next = items.map((n) => {
    if (n.numId !== numId || n.deletedAt) return n;
    found = true;
    return { ...n, deletedAt: now, updatedAt: now };
  });
  if (!found) return false;
  await saveLocalNotices(next);
  return true;
}

export function noticeToBoardPost(n: NoticeRecord): BoardPost {
  return {
    id: n.numId,
    subject: n.title,
    content: n.content,
    author: n.authorName,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
    hit: n.viewCount,
    commentCount: 0,
  };
}

export async function incrementNoticeView(numId: number): Promise<void> {
  if (await useNativeNoticeBoard()) {
    const post = await getPostByNumId(NOTICE_BOARD_SLUG, numId);
    if (!post) return;
    const db = getSupabaseAdmin();
    if (!db) return;
    await db
      .from("board_posts")
      .update({ view_count: post.viewCount + 1 })
      .eq("id", post.id);
    return;
  }

  if (await useDbTable()) {
    const db = getSupabaseAdmin()!;
    const row = await getNoticeByNumId(numId);
    if (!row) return;
    await db
      .from("notices")
      .update({ view_count: row.viewCount + 1 })
      .eq("num_id", numId);
    return;
  }

  const items = await loadLocalNotices();
  const next = items.map((n) =>
    n.numId === numId ? { ...n, viewCount: n.viewCount + 1 } : n
  );
  await saveLocalNotices(next);
}
