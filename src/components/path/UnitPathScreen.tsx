"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getUnitPath, type UnitPath } from "@/lib/api/units";
import { fetchWithCache } from "@/lib/offline/contentCache";
import { LessonPathCanvas } from "@/components/path/LessonPathCanvas";

type Props = {
  childId: number;
  unitId: number;
  focusLessonId?: number | null;
};

/**
 * Used to be a Server Component page fetching the unit path directly from Laravel
 * during render - see SubjectsHome.tsx's doc comment for why that never worked offline.
 * Fetches it here instead, with a cache fallback, so the path/lesson-map screen - the
 * main way a student opens a lesson - keeps working once it's been loaded once.
 */
export function UnitPathScreen({ childId, unitId, focusLessonId = null }: Props) {
  const t = useTranslations("student");
  const [data, setData] = useState<UnitPath | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchWithCache(`path:${unitId}:${childId}`, () => getUnitPath(unitId, childId))
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [unitId, childId]);

  if (failed) {
    return (
      <p className="flex h-[100dvh] items-center justify-center px-6 text-center font-bold text-text-gray">
        {t("offlineNoCache")}
      </p>
    );
  }
  if (!data) return <UnitPathSkeleton />;
  return <LessonPathCanvas data={data} childId={childId} focusLessonId={focusLessonId} />;
}

function UnitPathSkeleton() {
  return (
    <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 px-6" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-16 w-16 animate-pulse rounded-full bg-white/60" />
      ))}
    </div>
  );
}
