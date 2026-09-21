"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { PathStation, UnitPath } from "@/lib/api/units";
import { getStoreItems } from "@/lib/api/store";
import { getLessonPathTheme } from "@/lib/config/lessonPathThemes";
import { lessonPlayPath, unitReviewPath, withChildQuery } from "@/lib/config/subjects";
import { nextRequiredStoreItem, storePathForProfession } from "@/lib/config/storeProgression";
import { professionAvatarSrc } from "@/lib/config/professions";
import { effectiveReduceMotion } from "@/lib/experiencePrefs";
import {
  countCompleted,
  findFocusStationIndex,
  resolveJourneyStatuses,
  reviewStationStatus,
  type JourneyNodeStatus,
} from "@/lib/path/journeyStatus";
import { useJourneyLayout } from "@/hooks/useJourneyLayout";
import { useScrollToCurrentLesson } from "@/hooks/useScrollToCurrentLesson";
import { useRouter } from "@/i18n/navigation";
import { UnitJourneyHeader } from "@/components/path/journey/UnitJourneyHeader";
import { UnitJourneyMap } from "@/components/path/journey/UnitJourneyMap";
import { LessonDetailsSheet, type LessonDetailsContent } from "@/components/path/journey/LessonDetailsSheet";
import {
  NextHeadquartersReward,
  type NextRewardInfo,
} from "@/components/path/journey/NextHeadquartersReward";
import { JourneyEmptyState } from "@/components/path/journey/JourneyEmptyStates";
import type { ChildGender } from "@/lib/api/children";
import type { SubjectKey } from "@/lib/config/subjects";
import { subjectKeyFromId } from "@/lib/config/lessonPathThemes";

type Props = {
  data: UnitPath;
  childId: number;
  focusLessonId?: number | null;
  childName?: string;
  professionCode?: string | null;
  gender?: ChildGender;
  pointsBalance?: number;
};

type SheetTarget =
  | { kind: "lesson"; station: PathStation; status: JourneyNodeStatus; index: number }
  | { kind: "review"; status: JourneyNodeStatus };

/** Unit Learning Journey — adventure map replacing the CSS geometric path. */
export function LessonPathCanvas({
  data,
  childId,
  focusLessonId = null,
  childName = "",
  professionCode = null,
  gender = "male",
  pointsBalance = 0,
}: Props) {
  const t = useTranslations("student");
  const tJourney = useTranslations("student.unitJourney");
  const tSubjects = useTranslations("student.subjects");
  const tDesk = useTranslations("student.desktop");
  const router = useRouter();

  const scrollRef = useRef<HTMLDivElement>(null);
  const mapMeasureRef = useRef<HTMLDivElement>(null);
  const currentNodeRef = useRef<HTMLDivElement>(null);
  const lastFocusedButton = useRef<HTMLElement | null>(null);

  const stations = data.stations;
  const statuses = useMemo(() => resolveJourneyStatuses(stations), [stations]);
  const lessonIds = useMemo(() => stations.map((s) => s.lessonId), [stations]);
  const layout = useJourneyLayout(lessonIds, mapMeasureRef);
  const theme = useMemo(
    () => getLessonPathTheme(data.subjectId, data.accentColor),
    [data.subjectId, data.accentColor]
  );

  const completed = countCompleted(stations);
  const total = stations.length;
  const focusIndex = useMemo(
    () => findFocusStationIndex(stations, statuses, focusLessonId),
    [stations, statuses, focusLessonId]
  );

  const [sheet, setSheet] = useState<SheetTarget | null>(null);
  const [selectedId, setSelectedId] = useState<number | "review" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [reward, setReward] = useState<NextRewardInfo | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  const avatarSrc =
    professionAvatarSrc(professionCode, gender) ?? "/images/brand/logo.png";

  const subjectKey = subjectKeyFromId(data.subjectId) as SubjectKey;
  const subjectLabel = tSubjects(subjectKey);

  const backHref =
    data.subjectId > 0
      ? withChildQuery(`/subjects/${data.subjectId}/units`, childId)
      : withChildQuery("/subjects", childId);

  useEffect(() => {
    setReduceMotion(effectiveReduceMotion());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(id);
  }, [toast]);

  useScrollToCurrentLesson(scrollRef, currentNodeRef, [
    layout.canvasHeight,
    focusIndex,
    data.unitId,
  ]);

  // One-shot encouragement when returning via focusLesson after progress
  useEffect(() => {
    if (!focusLessonId) return;
    const key = `raqeem:journey-celebrate:${data.unitId}:${focusLessonId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      const focused = stations.find((s) => s.lessonId === focusLessonId);
      if (!focused || focused.status !== "completed") return;
      sessionStorage.setItem(key, "1");
      setToast(tJourney("openedNext"));
    } catch {
      /* ignore */
    }
  }, [focusLessonId, data.unitId, stations, tJourney]);

  // Optional store progression — hide quietly on failure
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const catalog = await getStoreItems(childId);
        if (cancelled) return;
        const path = storePathForProfession(professionCode);
        const owned = catalog.items.filter((i) => i.isOwned).map((i) => i.slotKey).filter(Boolean) as string[];
        const nextKey = nextRequiredStoreItem(owned, path);
        if (!nextKey) {
          setReward({
            name: "",
            imageUrl: null,
            pricePoints: 0,
            pointsBalance: catalog.pointsBalance,
            allComplete: true,
          });
          return;
        }
        const item = catalog.items.find((i) => i.slotKey === nextKey);
        if (!item || item.pricePoints == null) {
          setReward(null);
          return;
        }
        setReward({
          name: item.name ?? nextKey,
          imageUrl: item.imageUrl,
          pricePoints: item.pricePoints,
          pointsBalance: catalog.pointsBalance || pointsBalance,
        });
      } catch {
        if (!cancelled) setReward(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [childId, professionCode, pointsBalance]);

  function openSheet(target: SheetTarget) {
    lastFocusedButton.current = document.activeElement as HTMLElement | null;
    setSheet(target);
    if (target.kind === "lesson") setSelectedId(target.station.lessonId);
    else setSelectedId("review");
  }

  function closeSheet() {
    setSheet(null);
    setSelectedId(null);
    window.setTimeout(() => lastFocusedButton.current?.focus?.(), 0);
  }

  function onSelectLesson(station: PathStation, index: number) {
    const status = statuses[index] ?? "locked";
    openSheet({ kind: "lesson", station, status, index });
  }

  function onSelectReview() {
    const raw = reviewStationStatus(stations);
    const status: JourneyNodeStatus =
      raw === "locked" ? "locked" : raw === "completed" ? "completed" : "available";
    openSheet({ kind: "review", status });
  }

  function onActivateStart() {
    const currentIdx = statuses.findIndex((s) => s === "current" || s === "available");
    if (currentIdx < 0) return;
    const station = stations[currentIdx];
    if (!station) return;
    onSelectLesson(station, currentIdx);
  }

  function onPrimary() {
    if (!sheet) return;
    if (sheet.kind === "review") {
      if (sheet.status === "locked") return;
      router.push(unitReviewPath(data.unitId, childId));
      return;
    }
    if (sheet.status === "locked") return;
    router.push(lessonPlayPath(sheet.station.lessonId, childId));
  }

  function scrollToCurrent() {
    const target = currentNodeRef.current;
    if (!target) return;
    target.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  const sheetContent = useMemo((): LessonDetailsContent | null => {
    if (!sheet) return null;
    if (sheet.kind === "review") {
      const locked = sheet.status === "locked";
      return {
        title: tJourney("reviewStation"),
        status: sheet.status,
        statusLabel: locked
          ? tJourney("locked")
          : sheet.status === "completed"
            ? tJourney("completed")
            : tJourney("available"),
        description: locked
          ? tJourney("reviewLockedMessage")
          : sheet.status === "completed"
            ? tJourney("reviewCompletedMessage")
            : tJourney("reviewAvailableMessage"),
        primaryLabel: locked ? tJourney("completePrevious") : tJourney("openReview"),
        primaryDisabled: locked,
        closeLabel: t("back"),
      };
    }
    const { station, status } = sheet;
    const locked = status === "locked";
    const completed = status === "completed";
    return {
      title: station.title,
      status,
      statusLabel: completed
        ? tJourney("completed")
        : locked
          ? tJourney("locked")
          : status === "current"
            ? tJourney("current")
            : tJourney("available"),
      description: locked
        ? tJourney("lockedLessonMessage")
        : completed
          ? tJourney("replayHint")
          : tJourney("startHint", { title: station.title }),
      stars: station.stars,
      pointsHint: completed ? tJourney("replayNoNewPoints") : null,
      primaryLabel: locked
        ? tJourney("completePrevious")
        : completed
          ? tDesk("replayLesson")
          : tJourney("startLesson"),
      primaryDisabled: locked,
      closeLabel: t("back"),
    };
  }, [sheet, t, tJourney, tDesk]);

  if (stations.length === 0) {
    return (
      <div className="path-screen relative mx-auto w-full max-w-3xl">
        <JourneyEmptyState
          title={tJourney("emptyUnit")}
          backLabel={tJourney("backToUnits")}
          backHref={backHref}
        />
      </div>
    );
  }

  return (
    <div
      className="path-screen relative mx-auto w-full max-w-[100vw] md:max-w-3xl"
      style={{ ["--path-accent" as string]: theme.accentColor }}
    >
      <UnitJourneyHeader
        title={data.title}
        subjectLabel={subjectLabel}
        backHref={backHref}
        backLabel={t("back")}
        progressLabel={tJourney("progress", { completed, total })}
        completed={completed}
        total={total}
        returnLabel={tJourney("returnToCurrent")}
        onReturnToCurrent={scrollToCurrent}
        accentColor={theme.accentColor}
      />

      <div ref={scrollRef} className="relative z-10 w-full pb-6 pt-2">
        <NextHeadquartersReward
          reward={reward}
          labels={{
            title: tJourney("nextHeadquartersReward"),
            remaining: tJourney("pointsRemaining"),
            progress: tJourney("rewardProgress"),
            allComplete: tJourney("allToolsComplete"),
            points: tJourney("priceAndBalance"),
          }}
        />

        <div ref={mapMeasureRef} className="relative w-full px-2 sm:px-4">
          <UnitJourneyMap
            stations={stations}
            statuses={statuses}
            layout={layout}
            theme={theme}
            selectedId={selectedId}
            focusIndex={focusIndex}
            childAvatarSrc={avatarSrc}
            childName={childName || tJourney("companion")}
            reduceMotion={reduceMotion}
            labels={{
              aria: tJourney("aria"),
              startTitle: tJourney("startOfJourney"),
              reviewTitle: tJourney("reviewShort"),
              reviewEndBadge: tJourney("reviewEndBadge"),
              currentBadge: tJourney("currentStation"),
              completed: tJourney("completed"),
              locked: tJourney("locked"),
              current: tJourney("current"),
              available: tJourney("available"),
              metaCompleted: tJourney("metaCompleted"),
              metaLocked: tJourney("metaLocked"),
              metaAvailable: tJourney("metaAvailable"),
            }}
            onSelectLesson={onSelectLesson}
            onSelectReview={onSelectReview}
            onActivateStart={onActivateStart}
            startActivateLabel={tJourney("startOfJourney")}
            currentNodeRef={currentNodeRef}
          />
        </div>
      </div>

      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-4 md:bottom-8">
          <p className="rounded-2xl bg-[#1A2B47]/90 px-4 py-2.5 text-center text-sm font-extrabold text-white shadow-lg">
            {toast}
          </p>
        </div>
      ) : null}

      <LessonDetailsSheet
        open={sheet != null}
        content={sheetContent}
        onClose={closeSheet}
        onPrimary={onPrimary}
      />
    </div>
  );
}

/** Alias matching the requested LearningPath / UnitJourneyPage name. */
export const LearningPath = LessonPathCanvas;
export const UnitJourneyPage = LessonPathCanvas;
