"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import { StudentChromeProvider } from "@/components/StudentChrome";
import { StudentNav } from "@/components/StudentNav";
import { ExperiencePrefsBootstrap } from "@/components/experience/ExperiencePrefsBootstrap";
import { getChild, type ChildProfile } from "@/lib/api/children";
import { lockGuardianMode } from "@/lib/api/guardian";
import { getStreak, type StudentStreak } from "@/lib/api/student";

type Props = {
  children: ReactNode;
};

export function StudentShell({ children }: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const childId = Number(searchParams.get("childId") ?? 0);
  const hideNav =
    (pathname.includes("/lessons/") && pathname.includes("/play")) || pathname.includes("/review");
  const isPathScreen = /\/units\/[^/]+\/path$/.test(pathname);
  const validChild = Number.isFinite(childId) && childId > 0;

  const [child, setChild] = useState<ChildProfile | null>(null);
  const [streak, setStreak] = useState<StudentStreak | null>(null);
  const [points, setPoints] = useState<number | null>(null);

  useEffect(() => {
    if (!validChild) return;
    lockGuardianMode().catch(() => undefined);
  }, [validChild, childId]);

  if (!validChild && (child !== null || streak !== null || points !== null)) {
    setChild(null);
    setStreak(null);
    setPoints(null);
  }

  useEffect(() => {
    if (!validChild) return;
    let cancelled = false;
    Promise.all([getChild(childId), getStreak(childId)])
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
      });
    return () => {
      cancelled = true;
    };
  }, [childId, validChild]);

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
      <ExperiencePrefsBootstrap />
      <div
        className={`relative ${
          isPathScreen
            ? "h-[100dvh] overflow-hidden"
            : "min-h-screen overflow-x-hidden"
        } ${
          hideNav ? "bg-[#F7FBFF]" : isPathScreen ? "bg-[#F4F7FB]" : "student-sky bg-[#F7FBFF]"
        }`}
      >
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
