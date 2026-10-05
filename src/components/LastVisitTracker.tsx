"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import { classifyLastVisit, saveLastVisit } from "@/lib/navigation/lastVisit";

export function LastVisitTracker() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    const href = pathname + (search ? `?${search}` : "");
    if (!classifyLastVisit(href)) return;
    let active = true;
    // Read the current account after navigation; layouts can survive login.
    void fetch("/api/auth/session", { cache: "no-store" })
      .then(response => response.json())
      .then(session => {
        if (active && Number.isSafeInteger(session.parentId) && session.parentId > 0) saveLastVisit(session.parentId, href);
      }).catch(() => undefined);
    return () => { active = false; };
  }, [pathname, search]);
  return null;
}
