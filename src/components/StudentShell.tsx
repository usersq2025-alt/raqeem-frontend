"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import { StudentChromeProvider } from "@/components/StudentChrome";
import { StudentNav } from "@/components/StudentNav";
import { getChild, type ChildProfile } from "@/lib/api/children";
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
    if (!validChild) {
      setChild(null);
      setStreak(null);
      setPoints(null);
      return;
    }
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
      <div
        className={`relative min-h-screen ${hideNav || isPathScreen ? "bg-[#F4F7FB]" : "student-sky bg-[#F7FBFF]"} ${
          hideNav ? "" : "md:flex"
        }`}
      >
        {!hideNav && validChild ? <StudentNav childId={childId} /> : null}
        <div
          className={`relative min-h-screen w-full min-w-0 ${
            isPathScreen
              ? "px-0 pt-0 pb-24 md:h-screen md:overflow-hidden md:pb-0"
              : hideNav
                ? "mx-auto max-w-lg px-4 pt-3 pb-6 md:max-w-3xl md:px-8"
                : "mx-auto max-w-lg px-4 pt-3 pb-28 md:mx-0 md:max-w-none md:px-8 md:py-6 md:pb-8"
          }`}
        >
          {children}
        </div>
      </div>
    </StudentChromeProvider>
  );
}
