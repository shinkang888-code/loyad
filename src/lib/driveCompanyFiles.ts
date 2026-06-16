/**
 * 회사 자료실 — Drive 파일 통합 목록·권한 검증
 * - 사건 자료: DB 우선 (Drive 순차 스캔 제거)
 * - 검색: Drive name contains + DB ilike (전체 재귀 스캔 없음)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getDriveClient,
  listAllFilesUnderPath,
  searchFilesUnderPath,
  getFileMetadata,
  isFileUnderFolder,
  trashDriveFile,
  renameDriveFile,
  type DriveFileEntry,
} from "./googleDriveClient";
import {
  ensureCompanyDriveFolders,
  buildCompanySharedPath,
  buildCompanyProjectsPath,
  isPathUnderTenant,
  type CompanyDriveFolders,
} from "./driveCompanyFolders";

export type CompanyFileItem = {
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
  webViewLink?: string;
};

export type CompanyFilesResult = {
  available: boolean;
  folders: CompanyDriveFolders | null;
  files: CompanyFileItem[];
  total: number;
  message?: string;
  strategy?: "db" | "drive_search" | "drive_list" | "mixed";
};

export type ListCompanyFilesOptions = {
  searchQuery?: string;
  source?: "all" | CompanyFileItem["source"];
  limit?: number;
};

const DEFAULT_LIMIT = 150;
const DRIVE_LIST_LIMIT = 80;

function toCompanyItem(
  f: DriveFileEntry,
  source: CompanyFileItem["source"],
  basePath: string
): CompanyFileItem {
  const rel = f.name.startsWith(basePath) ? f.name.slice(basePath.length).replace(/^\//, "") : f.name;
  const displayName = rel.includes("/") ? rel.split("/").pop() ?? rel : rel;
  return {
    fileId: f.fileId,
    name: f.name,
    displayName,
    mimeType: f.mimeType,
    size: f.size,
    source,
    relativePath: rel,
    createdTime: f.createdTime,
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink,
  };
}

async function listCaseFilesFromDb(
  db: SupabaseClient,
  managementNumber: string,
  searchQuery?: string
): Promise<CompanyFileItem[]> {
  const { data: cases } = await db
    .from("cases")
    .select("id, case_number")
    .eq("management_number", managementNumber)
    .limit(500);

  if (!cases?.length) return [];

  const caseMap = new Map(cases.map((c) => [c.id as string, c.case_number as string]));
  const caseIds = cases.map((c) => c.id as string);
  const q = searchQuery?.trim().toLowerCase();

  let query = db
    .from("case_files")
    .select("id, file_name, mime_type, file_size, drive_file_id, case_id, created_at, updated_at")
    .in("case_id", caseIds)
    .not("drive_file_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(300);

  const { data: caseFileRows } = await query;
  const items: CompanyFileItem[] = [];

  for (const row of caseFileRows ?? []) {
    const fid = String(row.drive_file_id ?? "");
    if (!fid) continue;
    const caseId = String(row.case_id ?? "");
    const caseNumber = caseMap.get(caseId);
    if (q && caseNumber?.toLowerCase().includes(q)) {
      // 파일명 필터에 안 걸려도 사건번호로 매칭
    } else if (q && !String(row.file_name ?? "").toLowerCase().includes(q)) {
      continue;
    }
    items.push({
      fileId: fid,
      name: String(row.file_name ?? ""),
      displayName: String(row.file_name ?? ""),
      mimeType: String(row.mime_type ?? "application/octet-stream"),
      size: Number(row.file_size ?? 0) || undefined,
      source: "case_files",
      relativePath: `cases/${caseNumber ?? caseId}/${row.file_name}`,
      createdTime: row.created_at ? String(row.created_at) : undefined,
      modifiedTime: row.updated_at ? String(row.updated_at) : undefined,
      caseId,
      caseNumber,
    });
  }

  if (q) {
    const matchedCaseIds = caseIds.filter((id) => caseMap.get(id)?.toLowerCase().includes(q));
    if (matchedCaseIds.length) {
      const existing = new Set(items.map((i) => i.fileId));
      const { data: extraRows } = await db
        .from("case_files")
        .select("id, file_name, mime_type, file_size, drive_file_id, case_id, created_at, updated_at")
        .in("case_id", matchedCaseIds)
        .not("drive_file_id", "is", null)
        .order("updated_at", { ascending: false })
        .limit(100);

      for (const row of extraRows ?? []) {
        const fid = String(row.drive_file_id ?? "");
        if (!fid || existing.has(fid)) continue;
        const caseId = String(row.case_id ?? "");
        items.push({
          fileId: fid,
          name: String(row.file_name ?? ""),
          displayName: String(row.file_name ?? ""),
          mimeType: String(row.mime_type ?? "application/octet-stream"),
          size: Number(row.file_size ?? 0) || undefined,
          source: "case_files",
          relativePath: `cases/${caseMap.get(caseId) ?? caseId}/${row.file_name}`,
          createdTime: row.created_at ? String(row.created_at) : undefined,
          modifiedTime: row.updated_at ? String(row.updated_at) : undefined,
          caseId,
          caseNumber: caseMap.get(caseId),
        });
      }
    }
  }

  return items;
}

async function listDriveSourceFiles(
  drive: NonNullable<Awaited<ReturnType<typeof getDriveClient>>>,
  path: string,
  source: "company_shared" | "company_projects",
  searchQuery: string | undefined,
  limit: number
): Promise<CompanyFileItem[]> {
  const q = searchQuery?.trim();
  const result = q
    ? await searchFilesUnderPath(drive, path, q, limit)
    : await listAllFilesUnderPath(drive, path, Math.min(limit, DRIVE_LIST_LIMIT));

  return result.files.map((f) => toCompanyItem(f, source, result.basePath));
}

export async function listCompanyFiles(
  db: SupabaseClient,
  managementNumber: string,
  searchQueryOrOptions?: string | ListCompanyFilesOptions
): Promise<CompanyFilesResult> {
  const options: ListCompanyFilesOptions =
    typeof searchQueryOrOptions === "string"
      ? { searchQuery: searchQueryOrOptions }
      : (searchQueryOrOptions ?? {});

  const { searchQuery, source = "all", limit = DEFAULT_LIMIT } = options;
  const q = searchQuery?.trim();
  const folders = await ensureCompanyDriveFolders(managementNumber);
  const drive = await getDriveClient();

  if (!drive) {
    return {
      available: false,
      folders,
      files: [],
      total: 0,
      message: "Google Drive 연동이 필요합니다. 관리자 > 시스템 설정 > Google Drive에서 설정하세요.",
    };
  }

  const items: CompanyFileItem[] = [];
  const seen = new Set<string>();
  const addItems = (list: CompanyFileItem[]) => {
    for (const item of list) {
      if (seen.has(item.fileId)) continue;
      seen.add(item.fileId);
      items.push(item);
    }
  };

  const tasks: Promise<void>[] = [];

  if (source === "all" || source === "case_files") {
    tasks.push(listCaseFilesFromDb(db, managementNumber, q).then(addItems));
  }

  if (source === "all" || source === "company_shared") {
    tasks.push(
      listDriveSourceFiles(
        drive,
        buildCompanySharedPath(managementNumber),
        "company_shared",
        q,
        limit
      ).then(addItems)
    );
  }

  if (source === "all" || source === "company_projects") {
    tasks.push(
      listDriveSourceFiles(
        drive,
        buildCompanyProjectsPath(managementNumber),
        "company_projects",
        q,
        limit
      ).then(addItems)
    );
  }

  await Promise.all(tasks);

  items.sort((a, b) =>
    (b.modifiedTime ?? b.createdTime ?? "").localeCompare(a.modifiedTime ?? a.createdTime ?? "")
  );

  const strategy = q ? "drive_search" : source === "case_files" ? "db" : "mixed";

  return {
    available: true,
    folders,
    files: items.slice(0, limit),
    total: items.length,
    strategy,
  };
}

/** 파일이 해당 테넌트 소유인지 검증 (전체 목록 스캔 없음) */
export async function assertTenantOwnsDriveFile(
  db: SupabaseClient,
  managementNumber: string,
  fileId: string
): Promise<{ ok: boolean; item?: CompanyFileItem; error?: string }> {
  const drive = await getDriveClient();
  if (!drive) return { ok: false, error: "Drive 미연동" };

  const { data: caseFile } = await db
    .from("case_files")
    .select("drive_file_id, case_id, file_name")
    .eq("drive_file_id", fileId)
    .maybeSingle();

  if (caseFile?.case_id) {
    const { data: caseRow } = await db
      .from("cases")
      .select("management_number, case_number")
      .eq("id", caseFile.case_id)
      .maybeSingle();
    if (caseRow?.management_number === managementNumber) {
      return {
        ok: true,
        item: {
          fileId,
          name: String(caseFile.file_name),
          displayName: String(caseFile.file_name),
          mimeType: "application/octet-stream",
          source: "case_files",
          relativePath: String(caseFile.file_name),
          caseId: String(caseFile.case_id),
          caseNumber: caseRow.case_number ?? undefined,
        },
      };
    }
  }

  const meta = await getFileMetadata(drive, fileId);
  if (!meta) return { ok: false, error: "파일을 찾을 수 없습니다." };

  const folders = await ensureCompanyDriveFolders(managementNumber);
  if (folders.rootFolderId && (await isFileUnderFolder(drive, fileId, folders.rootFolderId))) {
    return {
      ok: true,
      item: {
        fileId,
        name: meta.name,
        displayName: meta.name,
        mimeType: meta.mimeType,
        size: meta.size,
        source: meta.name.includes("projects/") ? "company_projects" : "company_shared",
        relativePath: meta.name,
        modifiedTime: meta.modifiedTime,
        webViewLink: meta.webViewLink,
      },
    };
  }

  if (isPathUnderTenant(meta.name, managementNumber)) {
    return {
      ok: true,
      item: toCompanyItem(meta, "company_shared", buildCompanySharedPath(managementNumber)),
    };
  }

  return { ok: false, error: "이 회사의 파일이 아닙니다." };
}

export async function deleteCompanyFile(
  db: SupabaseClient,
  managementNumber: string,
  fileId: string
): Promise<{ ok: boolean; error?: string }> {
  const check = await assertTenantOwnsDriveFile(db, managementNumber, fileId);
  if (!check.ok) return { ok: false, error: check.error };

  const drive = await getDriveClient();
  if (!drive) return { ok: false, error: "Drive 미연동" };

  const trashed = await trashDriveFile(drive, fileId);
  if (!trashed) return { ok: false, error: "삭제에 실패했습니다." };

  if (check.item?.source === "case_files") {
    await db.from("case_files").delete().eq("drive_file_id", fileId);
  }

  return { ok: true };
}

/** 파일명 변경 (Drive + 사건자료 DB 동기화) */
export async function renameCompanyFile(
  db: SupabaseClient,
  managementNumber: string,
  fileId: string,
  newName: string
): Promise<{ ok: boolean; item?: CompanyFileItem; error?: string }> {
  const trimmed = newName.trim();
  if (!trimmed) return { ok: false, error: "파일명을 입력하세요." };
  if (trimmed.length > 200) return { ok: false, error: "파일명은 200자 이하여야 합니다." };

  const check = await assertTenantOwnsDriveFile(db, managementNumber, fileId);
  if (!check.ok) return { ok: false, error: check.error };

  const drive = await getDriveClient();
  if (!drive) return { ok: false, error: "Drive 미연동" };

  const renamed = await renameDriveFile(drive, fileId, trimmed);
  if (!renamed) return { ok: false, error: "파일명 변경에 실패했습니다." };

  if (check.item?.source === "case_files") {
    await db
      .from("case_files")
      .update({ file_name: renamed.name, updated_at: new Date().toISOString() })
      .eq("drive_file_id", fileId);
  }

  const updated: CompanyFileItem = {
    ...(check.item ?? {
      fileId,
      name: renamed.name,
      displayName: renamed.name,
      mimeType: renamed.mimeType,
      source: "company_shared" as const,
      relativePath: renamed.name,
    }),
    name: renamed.name,
    displayName: renamed.name,
    mimeType: renamed.mimeType,
    size: renamed.size,
    modifiedTime: renamed.modifiedTime,
    webViewLink: renamed.webViewLink,
  };

  return { ok: true, item: updated };
}
