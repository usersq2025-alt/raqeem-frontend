"use client";

import { useMemo, useRef, type RefObject } from "react";
import type { PathStation } from "@/lib/api/units";
import type { LessonPathTheme } from "@/lib/config/lessonPathThemes";
import { journeyVisualStage } from "@/lib/config/lessonPathThemes";
import { completedPathRatio, type JourneyLayout } from "@/lib/path/journeyLayout";
import {
  countCompleted,
  reviewStationStatus,
  type JourneyNodeStatus,
} from "@/lib/path/journeyStatus";
import { JourneyDecorationLayer } from "./JourneyDecorationLayer";
import { JourneySvgPath } from "./JourneySvgPath";
import { JourneyStartGate } from "./JourneyStartGate";
import { LessonJourneyNode } from "./LessonJourneyNode";
import { UnitReviewStation } from "./UnitReviewStation";

type Props = {
  stations: PathStation[];
  statuses: JourneyNodeStatus[];
  layout: JourneyLayout;
  theme: LessonPathTheme;
  selectedId: number | "review" | null;
  focusIndex: number;
  childAvatarSrc: string;
  childName: string;
  reduceMotion: boolean;
  labels: {
    aria: string;
    startTitle: string;
    reviewTitle: string;
    reviewEndBadge: string;
    currentBadge: string;
    completed: string;
    locked: string;
    current: string;
    available: string;
    metaCompleted: string;
    metaLocked: string;
    metaAvailable: string;
  };
  onSelectLesson: (station: PathStation, index: number) => void;
  onSelectReview: () => void;
  onActivateStart?: () => void;
  startActivateLabel?: string;
  currentNodeRef: RefObject<HTMLDivElement | null>;
  mapRef?: RefObject<HTMLDivElement | null>;
};

export function UnitJourneyMap({
  stations,
  statuses,
  layout,
  theme,
  selectedId,
  focusIndex,
  childAvatarSrc,
  childName,
  reduceMotion,
  labels,
  onSelectLesson,
  onSelectReview,
  onActivateStart,
  startActivateLabel,
  currentNodeRef,
  mapRef,
}: Props) {
  const localRef = useRef<HTMLDivElement>(null);
  const stage = journeyVisualStage(countCompleted(stations), stations.length);
  const reviewStatusRaw = reviewStationStatus(stations);
  const reviewStatus: JourneyNodeStatus =
    reviewStatusRaw === "locked"
      ? "locked"
      : reviewStatusRaw === "completed"
        ? "completed"
        : focusIndex >= stations.length
          ? "current"
          : "available";

  const completedRatio = completedPathRatio(countCompleted(stations), stations.length);
  const lessonNodes = useMemo(
    () => layout.nodes.filter((n) => n.kind === "lesson"),
    [layout.nodes]
  );
  const startNode = layout.nodes.find((n) => n.kind === "start");
  const reviewNode = layout.nodes.find((n) => n.kind === "review");
  const compactCurrent = layout.isMobile;

  return (
    <div
      ref={mapRef ?? localRef}
      className="relative mx-auto w-full max-w-lg md:max-w-xl"
      style={{ height: layout.canvasHeight }}
      role="list"
      aria-label={labels.aria}
    >
      <JourneyDecorationLayer
        theme={theme}
        stage={stage}
        canvasHeight={layout.canvasHeight}
        isMobile={layout.isMobile}
      />
      <JourneySvgPath
        points={layout.pathPoints}
        pathColor={theme.pathColor}
        completedColor={theme.completedColor}
        completedRatio={completedRatio}
        isMobile={layout.isMobile}
      />

      {startNode ? (
        <JourneyStartGate
          xPct={startNode.xPct}
          yPx={startNode.yPx}
          title={labels.startTitle}
          onActivate={onActivateStart}
          activateLabel={startActivateLabel}
        />
      ) : null}

      {stations.map((station, index) => {
        const node = lessonNodes[index];
        if (!node) return null;
        const status = statuses[index] ?? "locked";
        const meta =
          status === "completed"
            ? labels.metaCompleted
            : status === "locked"
              ? labels.metaLocked
              : labels.metaAvailable;
        const statusWord =
          status === "completed"
            ? labels.completed
            : status === "locked"
              ? labels.locked
              : status === "current"
                ? labels.current
                : labels.available;

        return (
          <LessonJourneyNode
            key={station.lessonId}
            title={station.title}
            status={status}
            index={index}
            stars={station.stars}
            isFinale={station.isFinale}
            xPct={node.xPct}
            yPx={node.yPx}
            labelSide={node.labelSide}
            meta={meta}
            ariaLabel={`${station.title}, ${statusWord}${
              station.stars != null && station.stars > 0 ? `, ${station.stars}` : ""
            }`}
            selected={selectedId === station.lessonId}
            onSelect={() => onSelectLesson(station, index)}
            anchorRef={focusIndex === index ? currentNodeRef : undefined}
            currentColor={theme.currentColor}
            reduceMotion={reduceMotion}
            isMobile={layout.isMobile}
            childAvatarSrc={status === "current" ? childAvatarSrc : null}
            childName={childName}
            currentBadge={labels.currentBadge}
            compactCurrent={compactCurrent}
          />
        );
      })}

      {reviewNode ? (
        <UnitReviewStation
          status={reviewStatus}
          title={labels.reviewTitle}
          endBadge={labels.reviewEndBadge}
          meta={
            reviewStatus === "locked"
              ? labels.metaLocked
              : reviewStatus === "completed"
                ? labels.metaCompleted
                : labels.metaAvailable
          }
          ariaLabel={`${labels.reviewTitle}, ${
            reviewStatus === "locked"
              ? labels.locked
              : reviewStatus === "completed"
                ? labels.completed
                : labels.available
          }`}
          xPct={reviewNode.xPct}
          yPx={reviewNode.yPx}
          labelSide={reviewNode.labelSide}
          selected={selectedId === "review"}
          onSelect={onSelectReview}
          anchorRef={focusIndex >= stations.length ? currentNodeRef : undefined}
          reduceMotion={reduceMotion}
          isMobile={layout.isMobile}
        />
      ) : null}
    </div>
  );
}
