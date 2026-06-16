// filepath: src/components/layout/TenantSwitchBadge.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

type SwitchableTenant = { managementNumber: string; groupName: string };

type MeProfile = {
  canSwitchTenant?: boolean;
  homeManagementNumber?: string;
  activeManagementNumber?: string;
  switchableTenants?: SwitchableTenant[];
};

export function TenantSwitchBadge() {
  const router = useRouter();
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [open, setOpen] = useState(false);
  const [activeMn, setActiveMn] = useState("");
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) return;
      const json = (await res.json()) as { user?: MeProfile };
      const u = json.user;
      if (!u?.canSwitchTenant) {
        setProfile(null);
        return;
      }
      setProfile(u);
      setActiveMn(u.activeManagementNumber ?? u.homeManagementNumber ?? "");
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleSwitch = async (mn: string) => {
    if (!mn.trim() || mn === profile?.activeManagementNumber) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeManagementNumber: mn.trim() }),
      });
      const json = (await res.json()) as { error?: string; user?: MeProfile };
      if (!res.ok) {
        toast.error(json.error ?? "관리번호 전환에 실패했습니다.");
        return;
      }
      setActiveMn(mn.trim());
      if (json.user) setProfile((p) => ({ ...p, ...json.user }));
      toast.success(`작업 관리번호 ${mn}로 전환되었습니다.`);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("관리번호 전환 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (!profile?.canSwitchTenant) return null;

  const tenants = profile.switchableTenants ?? [];

  return (
    <div className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors",
          "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
        )}
        title="전체관리자 작업 관리번호"
      >
        {saving ? <Loader2 size={13} className="animate-spin" /> : <Building2 size={13} />}
        <span className="font-mono">{activeMn || "—"}</span>
        <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 animate-fade-up">
            {profile.homeManagementNumber && (
              <div className="px-3 py-2 text-[10px] text-slate-500 border-b border-slate-100">
                홈: <span className="font-mono font-semibold text-slate-700">{profile.homeManagementNumber}</span>
              </div>
            )}
            {tenants.length > 0 ? (
              tenants.map((t) => (
                <button
                  key={t.managementNumber}
                  type="button"
                  onClick={() => void handleSwitch(t.managementNumber)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors",
                    activeMn === t.managementNumber && "bg-primary-50 text-primary-700 font-semibold"
                  )}
                >
                  <span className="font-mono">{t.managementNumber}</span>
                  <span className="text-slate-500 ml-1.5 truncate">{t.groupName}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-slate-500">전환 가능한 회사가 없습니다.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
