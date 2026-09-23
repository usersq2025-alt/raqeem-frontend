"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { PathStation, UnitPath } from "@/lib/api/units";
import {
  curveSamples,
  mixHex,
  pathPointAt,
  pathStageHeightPx,
  smoothPath,
  stationPoints,
} from "@/lib/path/layout";
import { lessonPlayPath, withChildQuery } from "@/lib/config/subjects";
import { useRouter } from "@/i18n/navigation";
import { toIndicDigits } from "@/lib/format/indicDigits";
import { PathBackground } from "@/components/path/PathBackground";
import { PathHeader } from "@/components/path/PathHeader";
import { LessonNode, type StationVisualState } from "@/components/path/LessonNode";
import { LessonModal } from "@/components/path/LessonModal";

type Props = {
  data: UnitPath;
  childId: number;
  focusLessonId?: number | null;
};

type ModalTarget = {
  station: PathStation;
  state: StationVisualState;
  number: number;
};

type VisibleRow = {
  station: PathStation;
  /** 1-based lesson number in the full unit list */
  number: number;
};

/** Vertical Duolingo-style learning path — keeps LessonPathCanvas export for the unit page. */
export function LessonPathCanvas({ data, childId, focusLessonId = null }: Props) {
  const t = useTranslations("student");
  const tPath = useTranslations("student.path");
  const tDesk = useTranslations("student.desktop");
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentNodeRef = useRef<HTMLDivElement>(null);

  const stations = data.stations;
  const completedStations = useMemo(
    () => stations.filter((station) => station.status === "completed"),
    [stations]
  );
  const canCollapseCompleted = completedStations.length >= 2;
  const [completedOpen, setCompletedOpen] = useState(true);

  const visibleRows = useMemo((): VisibleRow[] => {
    if (!canCollapseCompleted || completedOpen) {
      return stations.map((station, index) => ({ station, number: index + 1 }));
    }
    return stations
      .map((station, index) => ({ station, number: index + 1 }))
      .filter((row) => row.station.status !== "completed");
  }, [stations, canCollapseCompleted, completedOpen]);

  const points = useMemo(() => stationPoints(visibleRows.length), [visibleRows.length]);
  const fullPath = useMemo(() => smoothPath(curveSamples(64)), []);
  const stageHeight = pathStageHeightPx(Math.max(visibleRows.length, 3));

  const lastOpenVisibleIndex = visibleRows.reduce((last, row, index) => {
    if (row.station.status === "completed" || row.station.status === "available") return index;
    return last;
  }, -1);

  const livePath = useMemo(() => {
    if (lastOpenVisibleIndex < 0) return "";
    const endT =
      visibleRows.length <= 1 ? 0.08 : lastOpenVisibleIndex / Math.max(visibleRows.length - 1, 1);
    const steps = Math.max(12, Math.round(64 * Math.max(endT, 0.08)));
    const live = Array.from({ length: steps + 1 }, (_, i) =>
      pathPointAt((i / steps) * Math.max(endT, 0.08))
    );
    return smoothPath(live);
  }, [lastOpenVisibleIndex, visibleRows.length]);

  const focusVisibleIndex = useMemo(() => {
    const current = visibleRows.findIndex((row) => row.station.status === "available");
    if (current >= 0) return current;
    for (let i = visibleRows.length - 1; i >= 0; i--) {
      if (visibleRows[i]?.station.status === "completed") return i;
    }
    return Math.max(0, visibleRows.length - 1);
  }, [visibleRows]);

  const liveStroke = mixHex(data.accentColor, "#FFFFFF", 0.08);
  const currentIndex = stations.findIndex((station) => station.status === "available");

  const [modal, setModal] = useState<ModalTarget | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [lockedToast, setLockedToast] = useState<string | null>(null);

  useEffect(() => {
    if (!lockedToast) return;
    const id = window.setTimeout(() => setLockedToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [lockedToast]);

  useEffect(() => {
    if (!focusLessonId) return;
    const station = stations.find((row) => row.lessonId === focusLessonId);
    if (!station || station.status === "locked") return;
    const index = stations.indexOf(station);
    const openCompleted = station.status === "completed";
    const timer = window.setTimeout(() => {
      if (openCompleted) setCompletedOpen(true);
      setModal({
        station,
        state: visualState(station),
        number: index + 1,
      });
      setSelectedId(station.lessonId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [focusLessonId, stations]);

  useEffect(() => {
    const scrollToCurrent = () => {
      const node = currentNodeRef.current;
      const scroller = scrollRef.current;
      if (!node || !scroller) return;
      const nodeBox = node.getBoundingClientRect();
      const scrollerBox = scroller.getBoundingClientRect();
      const nextTop =
        scroller.scrollTop + (nodeBox.top - scrollerBox.top) - scrollerBox.height * 0.38;
      const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      scroller.scrollTo({ top: Math.min(maxTop, Math.max(0, nextTop)), behavior: "smooth" });
    };
    const timer = window.setTimeout(scrollToCurrent, 180);
    return () => window.clearTimeout(timer);
  }, [visibleRows.length, completedOpen, currentIndex, data.unitId]);

  const backHref =
    data.subjectId > 0
      ? withChildQuery(`/subjects/${data.subjectId}/units`, childId)
      : withChildQuery("/subjects", childId);

  function visualState(station: PathStation): StationVisualState {
    if (station.status === "completed") return "completed";
    if (station.status === "available") return "current";
    return "locked";
  }

  function onSelect(station: PathStation, number: number) {
    const state = visualState(station);
    if (state === "locked") {
      setLockedToast(tPath("lockedHint"));
      setSelectedId(null);
      setModal(null);
      return;
    }
    setSelectedId(station.lessonId);
    setModal({ station, state, number });
  }

  function openLesson(station: PathStation) {
    router.push(lessonPlayPath(station.lessonId, childId));
  }

  return (
    <div
      className="path-screen relative mx-auto flex h-full min-h-0 w-full max-w-[100vw] flex-1 flex-col overflow-hidden md:max-w-3xl"
      style={{ ["--path-accent" as string]: data.accentColor }}
    >
      <PathBackground />

      <PathHeader title={data.title} backHref={backHref} backLabel={t("back")} />

      <div
        ref={scrollRef}
        className="path-scroll relative z-10 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain touch-pan-y"
      >
        {canCollapseCompleted ? (
          <div className="sticky top-0 z-20 mx-auto flex w-[92%] max-w-md justify-center px-1 pb-2 pt-2 md:w-[78%]">
            <button
              type="button"
              onClick={() => setCompletedOpen((open) => !open)}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/90 px-3 py-1.5 text-xs font-extrabold text-emerald-700 shadow-sm backdrop-blur-md"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white">
                ✓
              </span>
              {tPath("completedSummary", { count: toIndicDigits(completedStations.length) })}
              <span aria-hidden="true">{completedOpen ? "▴" : "▾"}</span>
            </button>
          </div>
        ) : null}

        <div
          className="path-canvas-stage relative mx-auto w-[92%] max-w-md md:w-[78%]"
          style={{ height: stageHeight }}
        >
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d={fullPath}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.45"
            />
            <path
              d={fullPath}
              fill="none"
              stroke="#7BC85A"
              strokeWidth="2.15"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.55"
              className="path-stroke-base"
            />
            {lastOpenVisibleIndex >= 0 ? (
              <path
                d={livePath}
                fill="none"
                stroke={liveStroke}
                strokeWidth="2.35"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                className="path-stroke-draw"
              />
            ) : null}
          </svg>

          <div className="absolute inset-0" role="list" aria-label={tPath("aria")}>
            {visibleRows.length === 0 ? (
              <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-[22px] bg-white/90 p-4 text-center font-semibold text-text-gray">
                {t("emptyLessons")}
              </p>
            ) : (
              visibleRows.map((row, index) => {
                const point = points[index];
                if (!point) return null;
                const state = visualState(row.station);
                return (
                  <LessonNode
                    key={row.station.lessonId}
                    title={row.station.title}
                    number={row.number}
                    state={state}
                    stars={row.station.stars}
                    isFinale={row.station.isFinale}
                    accentColor={data.accentColor}
                    x={point.x}
                    y={point.y}
                    appearDelayMs={160 + index * 90}
                    selected={selectedId === row.station.lessonId}
                    anchorRef={index === focusVisibleIndex ? currentNodeRef : undefined}
                    ariaLabel={
                      row.station.isFinale
                        ? `${tPath("finale")}: ${row.station.title}`
                        : `${row.station.title}. ${
                            state === "locked"
                              ? tPath("locked")
                              : state === "current"
                                ? tPath("current")
                                : tPath("completed")
                          }`
                    }
                    onSelect={() => onSelect(row.station, row.number)}
                  />
                );
              })
            )}
          </div>
        </div>
        {/* Extra scroll room so the first lesson (near stage bottom) clears the mobile nav. */}
        <div className="h-[7.5rem] shrink-0 md:h-10" aria-hidden="true" />
      </div>

      {lockedToast ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 z-50 flex justify-center px-4 md:bottom-8">
          <p className="rounded-2xl bg-[#1A2B47]/90 px-4 py-2.5 text-center text-sm font-extrabold text-white shadow-lg">
            {lockedToast}
          </p>
        </div>
      ) : null}

      <LessonModal
        open={modal != null}
        title={modal?.station.title ?? ""}
        state={modal?.state ?? "current"}
        description={
          modal?.state === "completed"
            ? tPath("replayHint")
            : tPath("startHint", { title: modal?.station.title ?? "" })
        }
        primaryLabel={modal?.state === "completed" ? tDesk("replayLesson") : tPath("playNow")}
        closeLabel={t("back")}
        onClose={() => {
          setModal(null);
          setSelectedId(null);
        }}
        onPrimary={() => {
          if (!modal) return;
          openLesson(modal.station);
        }}
      />
    </div>
  );
}

/** Alias matching the requested LearningPath name. */
export const LearningPath = LessonPathCanvas;
