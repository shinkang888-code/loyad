"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExtensionDefinition, InstalledExtensionRecord } from "@/lib/extensions/types";

export function useExtensions() {
  const [catalog, setCatalog] = useState<ExtensionDefinition[]>([]);
  const [installed, setInstalled] = useState<InstalledExtensionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/extensions", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCatalog(Array.isArray(data.catalog) ? data.catalog : []);
        setInstalled(Array.isArray(data.installed) ? data.installed : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const installedIds = new Set(installed.map((r) => r.id));
  const active = catalog.filter((e) => installedIds.has(e.id));

  return { catalog, installed, active, loading, reload, installedIds };
}
