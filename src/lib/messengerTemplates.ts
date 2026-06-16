/**
 * 메신저 사전 발송 양식 (localStorage)
 */

const STORAGE_KEY = "lawygo_messenger_templates";

export interface MessengerTemplate {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

function loadRaw(): MessengerTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return [];
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRaw(items: MessengerTemplate[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function activeOnly(items: MessengerTemplate[]): MessengerTemplate[] {
  return items.filter((t) => !t.deletedAt);
}

export function loadTemplates(): MessengerTemplate[] {
  return activeOnly(loadRaw()).sort((a, b) => {
    const aTime = a.updatedAt ?? a.createdAt;
    const bTime = b.updatedAt ?? b.createdAt;
    return bTime.localeCompare(aTime);
  });
}

export function getTemplateById(id: string): MessengerTemplate | null {
  return loadTemplates().find((t) => t.id === id) ?? null;
}

export function searchTemplates(query: string): MessengerTemplate[] {
  const q = query.trim().toLowerCase();
  if (!q) return loadTemplates();
  return loadTemplates().filter(
    (t) =>
      t.title.toLowerCase().includes(q) || t.content.toLowerCase().includes(q)
  );
}

export function saveTemplate(template: Omit<MessengerTemplate, "id" | "createdAt">): MessengerTemplate {
  const raw = loadRaw();
  const now = new Date().toISOString();
  const newItem: MessengerTemplate = {
    ...template,
    id: "tpl-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  saveRaw([newItem, ...raw]);
  return newItem;
}

export function updateTemplate(
  id: string,
  patch: { title: string; content: string }
): MessengerTemplate | null {
  const raw = loadRaw();
  const existing = raw.find((t) => t.id === id && !t.deletedAt);
  if (!existing) return null;
  const now = new Date().toISOString();
  const updated: MessengerTemplate = {
    ...existing,
    title: patch.title.trim() || "제목 없음",
    content: patch.content.trim(),
    updatedAt: now,
  };
  saveRaw(raw.map((t) => (t.id === id ? updated : t)));
  return updated;
}

/** 소프트 삭제 */
export function softDeleteTemplate(id: string): boolean {
  const raw = loadRaw();
  const existing = raw.find((t) => t.id === id && !t.deletedAt);
  if (!existing) return false;
  const now = new Date().toISOString();
  saveRaw(
    raw.map((t) =>
      t.id === id ? { ...t, deletedAt: now, updatedAt: now } : t
    )
  );
  return true;
}

/** @deprecated softDeleteTemplate 사용 */
export function deleteTemplate(id: string): void {
  softDeleteTemplate(id);
}
