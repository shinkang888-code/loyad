/**
 * 설치된 확장 — app_settings (테넌트별 management_number scope)
 */

import { getAppSetting, setAppSetting } from "@/lib/appSettingsServer";
import {
  EXTENSION_SETTINGS_KEY,
  getDefaultInstalledIds,
  getExtensionById,
} from "@/lib/extensions/catalog";
import type { ExtensionDefinition, InstalledExtensionRecord } from "@/lib/extensions/types";

function settingsKey(managementNumber: string): string {
  const mn = managementNumber.trim() || "global";
  return `${EXTENSION_SETTINGS_KEY}:${mn}`;
}

export async function getInstalledExtensions(
  managementNumber: string
): Promise<InstalledExtensionRecord[]> {
  const stored = await getAppSetting<InstalledExtensionRecord[]>(settingsKey(managementNumber));
  if (Array.isArray(stored) && stored.length > 0) return stored;

  const now = new Date().toISOString();
  return getDefaultInstalledIds().map((id) => ({
    id,
    installedAt: now,
    installedBy: "system",
  }));
}

export async function setInstalledExtensions(
  managementNumber: string,
  records: InstalledExtensionRecord[]
): Promise<boolean> {
  return setAppSetting(settingsKey(managementNumber), records);
}

export async function installExtension(
  managementNumber: string,
  extensionId: string,
  installedBy?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!getExtensionById(extensionId)) {
    return { ok: false, error: "알 수 없는 확장입니다." };
  }
  const current = await getInstalledExtensions(managementNumber);
  if (current.some((r) => r.id === extensionId)) {
    return { ok: true };
  }
  const next: InstalledExtensionRecord[] = [
    ...current,
    { id: extensionId, installedAt: new Date().toISOString(), installedBy },
  ];
  const saved = await setInstalledExtensions(managementNumber, next);
  return saved ? { ok: true } : { ok: false, error: "저장에 실패했습니다." };
}

export async function uninstallExtension(
  managementNumber: string,
  extensionId: string
): Promise<{ ok: boolean; error?: string }> {
  const ext = getExtensionById(extensionId);
  if (ext?.defaultInstalled) {
    return { ok: false, error: "기본 제공 확장은 제거할 수 없습니다." };
  }
  const current = await getInstalledExtensions(managementNumber);
  const next = current.filter((r) => r.id !== extensionId);
  const saved = await setInstalledExtensions(managementNumber, next);
  return saved ? { ok: true } : { ok: false, error: "저장에 실패했습니다." };
}

export async function getActiveExtensions(
  managementNumber: string
): Promise<ExtensionDefinition[]> {
  const { EXTENSION_CATALOG } = await import("@/lib/extensions/catalog");
  const installed = await getInstalledExtensions(managementNumber);
  const ids = new Set(installed.map((r) => r.id));
  return EXTENSION_CATALOG.filter((e) => ids.has(e.id));
}
