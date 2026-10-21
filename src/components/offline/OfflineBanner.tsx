"use client";

import { useTranslations } from "next-intl";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";

/**
 * A persistent, unmistakable "you're offline" indicator shown app-wide while
 * navigator.onLine is false - so a data request that fails for lack of connectivity
 * reads as expected ("of course, I'm offline") instead of a confusing generic error,
 * no matter which specific fetch call failed.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const t = useTranslations("offlineBanner");
  if (online) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[70] flex min-h-8 items-center justify-center gap-1.5 bg-text-navy px-3 text-center text-xs font-extrabold text-white"
    >
      <span aria-hidden="true">📡</span>
      {t("message")}
    </div>
  );
}
