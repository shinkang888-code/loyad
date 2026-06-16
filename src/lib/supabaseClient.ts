/**
 * Supabase 클라이언트 (싱글톤)
 * - LawyGo DB 스키마: supabase/migrations/20260306000000_lawgo_schema.sql
 * - LawTop GL 구버전은 별도 DB 사용; 마이그레이션 시 스키마 매핑 참고 (docs/LAWTOP_GL_ANALYSIS.md)
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function isValidSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export const supabase =
  supabaseUrl && supabaseAnonKey && isValidSupabaseUrl(supabaseUrl)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : (null as ReturnType<typeof createClient> | null);

/** 서버/Admin용 (Service Role) - API Route 등에서만 사용 */
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key || !isValidSupabaseUrl(url)) return null;
  return createClient(url, key);
}
