"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { StudentChromeProvider } from "@/components/StudentChrome";
import { StudentNav } from "@/components/StudentNav";
import { ExhibitionBar } from "@/components/exhibition/ExhibitionBar";
import { getChildDetail, hasChosenProfession, type ChildProfile } from "@/lib/api/children";
import { lockGuardianMode } from "@/lib/api/guardian";
import { getStreak, type StudentStreak } from "@/lib/api/student";
import { isHq3dProfession } from "@/lib/config/hq3d";
import { OfflineBanner } from "@/components/offline/OfflineBanner";
import { clearChildLocalData } from "@/lib/offline/clearChildCache";
import { fetchWithCache } from "@/lib/offline/contentCache";
import { runBackgroundPreload } from "@/lib/offline/preloader";
import { startSyncEngine } from "@/lib/offline/syncEngine";

type Props = {
  children: ReactNode;
};

export function StudentShell({ children }: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const childId = Number(searchParams.get("childId") ?? 0);
  const hideNav =
    (pathname.includes("/lessons/") && pathname.includes("/play")) || pathname.includes("/review");
  const isPathScreen = /\/units\/[^/]+\/path$/.test(pathname);
  const validChild = Number.isFinite(childId) && childId > 0;

  const [child, setChild] = useState<ChildProfile | null>(null);
  const [streak, setStreak] = useState<StudentStreak | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  // The childId a child-load attempt last settled for (success or failure) - compared
  // against the current childId below instead of a plain boolean, so switching to a new
  // childId naturally stops being "settled" without needing a synchronous reset inside
  // the effect (not allowed by this project's lint rules).
  const [settledChildId, setSettledChildId] = useState<number | null>(null);

  useEffect(() => {
    if (!validChild) return;
    lockGuardianMode().catch(() => undefined);
  }, [validChild, childId]);

  useEffect(() => {
    startSyncEngine();
  }, []);

  // A family device may be shared between children: once we're sure we've actually
  // switched (not just the first mount), clear the previous child's cached per-child
  // data so it can't linger and show through under the next one. Never touches the
  // sync outbox - see clearChildLocalData.
  const previousChildIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!validChild) return;
    const previous = previousChildIdRef.current;
    if (previous !== null && previous !== childId) {
      void clearChildLocalData(previous);
    }
    previousChildIdRef.current = childId;
  }, [childId, validChild]);

  if (!validChild && (child !== null || streak !== null || points !== null)) {
    setChild(null);
    setStreak(null);
    setPoints(null);
  }

  useEffect(() => {
    if (!validChild) return;
    let cancelled = false;
    // Cached so the whole shell (nav, points, streak) still renders on a later
    // navigation that happens offline - without this, any connectivity drop made the
    // entire student chrome disappear, not just the page content.
    Promise.all([
      fetchWithCache(`child:${childId}`, () => getChildDetail(childId)),
      fetchWithCache(`streak:${childId}`, () => getStreak(childId)),
    ])
      .then(([nextChild, nextStreak]) => {
        if (cancelled) return;
        setChild(nextChild);
        setStreak(nextStreak);
        setPoints(nextChild?.pointsBalance ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setChild(null);
        setStreak(null);
      })
      .finally(() => {
        if (!cancelled) setSettledChildId(childId);
      });
    return () => {
      cancelled = true;
    };
  }, [childId, validChild]);

  // Mirrors what every page under (student) used to check individually via
  // requireStudentChild (redirect to /children if the child doesn't exist, to
  // career-selection if no profession chosen) - centralized here so it keeps working
  // from cached data while offline instead of needing its own server round-trip per
  // page. Only acts once the load has genuinely settled for THIS childId (not just
  // "still loading" or "offline with no cache yet", which also show as child === null
  // transiently, and not a stale settlement left over from a previous childId).
  useEffect(() => {
    if (!validChild || settledChildId !== childId) return;
    if (!child) {
      router.replace("/children");
    } else if (!hasChosenProfession(child)) {
      router.replace(`/career-selection?childId=${child.id}`);
    }
  }, [child, childId, router, settledChildId, validChild]);

  useEffect(() => {
    if (!child) return;
    // Let the current screen finish its own loading before competing for bandwidth/CPU.
    const timer = window.setTimeout(() => {
      const profession = isHq3dProfession(child.professionCode) ? child.professionCode : null;
      void runBackgroundPreload(child.id, profession);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [child]);

  const chrome = useMemo(
    () => ({
      childId: validChild ? childId : 0,
      child,
      streak,
      points,
      setPoints,
    }),
    [child, childId, points, streak, validChild]
  );

  return (
    <StudentChromeProvider value={chrome}>
      <OfflineBanner />
      <div
        className={`relative ${
          isPathScreen
            ? "h-[100dvh] overflow-hidden"
            : hideNav
              ? // clip (not hidden): hidden turns this div into a scroll container and breaks the sticky "check" bar
                "min-h-screen overflow-x-clip"
              : "min-h-screen overflow-x-hidden"
        } ${
          hideNav ? "bg-[#F7FBFF]" : isPathScreen ? "bg-[#F4F7FB]" : "student-sky bg-[#F7FBFF]"
        }`}
      >
        {!hideNav && validChild && child ? <ExhibitionBar child={child} /> : null}
        {!hideNav && validChild ? <StudentNav childId={childId} /> : null}
        <div
          className={`relative min-h-screen w-full min-w-0 max-w-full ${
            !hideNav && validChild ? "md:ms-[16.75rem] md:w-[calc(100%-16.75rem)]" : ""
          } ${
            isPathScreen
              ? "flex h-[100dvh] flex-col overflow-hidden px-0 pt-0 pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-0"
              : hideNav
                ? "mx-auto w-full max-w-full px-4 pt-3 pb-6 md:max-w-3xl md:px-8"
                : "w-full max-w-full px-4 pt-3 pb-28 md:max-w-none md:px-8 md:py-6 md:pb-8"
          }`}
        >
          {children}
        </div>
      </div>
    </StudentChromeProvider>
  );
}
