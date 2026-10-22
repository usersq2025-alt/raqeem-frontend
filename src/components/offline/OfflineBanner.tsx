"use client";

import { useTranslations } from "next-intl";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";
import { useStuckSyncCount } from "@/lib/offline/useSyncHealth";

/**
 * A persistent, unmistakable "you're offline" indicator shown app-wide while
 * navigator.onLine is false - so a data request that fails for lack of connectivity
 * reads as expected ("of course, I'm offline") instead of a confusing generic error,
 * no matter which specific fetch call failed.
 *
 * Also covers the opposite, more confusing gap: navigator.onLine can stay true while
 * the backend itself is unreachable (see offlineLessonPlay.ts's isConnectivityError
 * doc comment) or genuinely rejects a sync batch - from the child's point of view that
 * looks like "I have internet but my progress still won't save", which is worse than a
 * plain offline banner because nothing here says why. useStuckSyncCount surfaces that.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const stuckCount = useStuckSyncCount();
  const t = useTranslations("offlineBanner");

  if (!online) {
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

  if (stuckCount > 0) {
    return (
      <div
        role="status"
        className="fixed inset-x-0 top-0 z-[70] flex min-h-8 items-center justify-center gap-1.5 bg-primary-orange px-3 text-center text-xs font-extrabold text-white"
      >
        <span aria-hidden="true">⏳</span>
        {t("syncIssue")}
      </div>
    );
  }

  return null;
}
