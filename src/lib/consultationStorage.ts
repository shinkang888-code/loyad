/**
 * 상담관리 — 상담실·상담 일정 localStorage
 * 테넌트(관리번호)별 분리 저장
 */

import type { ConsultationItem, ConsultationRoom } from "@/lib/types";

const ROOMS_KEY_PREFIX = "lawygo_consultation_rooms";
const ITEMS_KEY_PREFIX = "lawygo_consultation_items";

function roomsKey(tenantId: string) {
  return `${ROOMS_KEY_PREFIX}_${tenantId}`;
}

function itemsKey(tenantId: string) {
  return `${ITEMS_KEY_PREFIX}_${tenantId}`;
}

function loadJson<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function saveJson<T>(key: string, items: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(items));
}

export function loadConsultationRooms(tenantId: string): ConsultationRoom[] {
  return loadJson<ConsultationRoom>(roomsKey(tenantId)).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}

export function saveConsultationRooms(tenantId: string, rooms: ConsultationRoom[]): void {
  saveJson(roomsKey(tenantId), rooms);
}

export function loadConsultationItems(tenantId: string): ConsultationItem[] {
  return loadJson<ConsultationItem>(itemsKey(tenantId));
}

export function saveConsultationItems(tenantId: string, items: ConsultationItem[]): void {
  saveJson(itemsKey(tenantId), items);
}

export function createConsultationRoomId(): string {
  return `room-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
