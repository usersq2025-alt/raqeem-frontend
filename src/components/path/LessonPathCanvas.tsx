"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import type { PathStation, UnitPath } from "@/lib/api/units";
import { curveSamples, mixHex, pathPointAt, smoothPath, stationPoints } from "@/lib/path/layout";
import { lessonPlayPath, withChildQuery } from "@/lib/config/subjects";
import { Link, useRouter } from "@/i18n/navigation";
import { StationMarker, type StationVisualState } from "@/components/path/StationMarker";
import { Button } from "@/components/ui/Button";

type Props = {
  data: UnitPath;
  childId: number;
  focusLessonId?: number | null;
};

export function LessonPathCanvas({ data, childId, focusLessonId = null }: Props) {
  const t = useTranslations("student");
  const tDesk = useTranslations("student.desktop");
  const tPath = useTranslations("student.path");
  const router = useRouter();
  const [bouncingId, setBouncingId] = useState<number | null>(null);
  const stations = data.stations;
  const points = useMemo(() => stationPoints(stations.length), [stations.length]);
  const fullPath = useMemo(() => smoothPath(curveSamples(48)), []);
  const lastOpenIndex = stations.reduce((last, station, index) => {
    if (station.status === "completed" || station.status === "available") return index;
    return last;
  }, -1);
  const currentIndex = stations.findIndex((station) => station.status === "available");
  const companionIndex = currentIndex >= 0 ? currentIndex : lastOpenIndex;
  const companionPoint = companionIndex >= 0 ? points[companionIndex] : null;
  const defaultPreview =
    stations.find((station) => station.status === "available") ??
    [...stations].reverse().find((station) => station.status === "completed") ??
    stations[0] ??
    null;
  const focused = focusLessonId
    ? stations.find((station) => station.lessonId === focusLessonId)
    : null;
  const [previewId, setPreviewId] = useState<number | null>(focused?.lessonId ?? defaultPreview?.lessonId ?? null);
  const preview = stations.find((station) => station.lessonId === previewId) ?? defaultPreview;
  const livePath = useMemo(() => {
    if (lastOpenIndex < 0) return "";
    const endT = stations.length <= 1 ? 0.08 : lastOpenIndex / Math.max(stations.length - 1, 1);
    const steps = Math.max(10, Math.round(48 * Math.max(endT, 0.08)));
    const live = Array.from({ length: steps + 1 }, (_, i) => pathPointAt((i / steps) * Math.max(endT, 0.08)));
    return smoothPath(live);
  }, [lastOpenIndex, stations.length]);

  function visualState(station: PathStation): StationVisualState {
    if (station.status === "completed") return "completed";
    if (station.status === "available") return "current";
    return "locked";
  }

  function openStation(station: PathStation) {
    if (station.status === "locked" || bouncingId != null) return;
    setBouncingId(station.lessonId);
    window.setTimeout(() => {
      router.push(lessonPlayPath(station.lessonId, childId));
    }, 280);
  }

  const backHref =
    data.subjectId > 0
      ? withChildQuery(`/subjects/${data.subjectId}/units`, childId)
      : withChildQuery("/subjects", childId);

  const companionFlip = companionPoint ? companionPoint.x >= 50 : false;
  const liveStroke = mixHex(data.accentColor, "#FFFFFF", 0.08);
  const liveLip = mixHex(data.accentColor, "#1A2B47", 0.22);
  const previewState = preview ? visualState(preview) : "locked";

  return (
    <div
      className="path-screen relative mx-auto w-full max-w-[26.5rem] md:mx-0 md:flex md:h-full md:max-w-none md:items-stretch md:gap-6 md:px-6 md:py-4"
      style={{ ["--path-accent" as string]: data.accentColor }}
    >
      <div className="path-canvas-stage relative aspect-[9/16] w-full shrink-0 bg-[#d9f0dc] md:h-full md:w-auto md:max-h-full">
        <div className="absolute inset-0 overflow-hidden">
          {data.pathBackgroundUrl ? (
            <Image
              src={data.pathBackgroundUrl}
              alt=""
              fill
              priority
              unoptimized
              className="object-cover object-center"
            />
          ) : null}
        </div>

        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path
            d={fullPath}
            fill="none"
            stroke="#C5CDD6"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="2.6 2.1"
            pathLength={1}
            className="path-stroke-base"
            opacity={0.55}
          />
          {lastOpenIndex >= 0 ? (
            <>
              <path
                d={livePath}
                fill="none"
                stroke={liveLip}
                strokeWidth="4.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                className="path-stroke-draw"
              />
              <path
                d={livePath}
                fill="none"
                stroke={liveStroke}
                strokeWidth="2.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                className="path-stroke-draw"
              />
            </>
          ) : null}
        </svg>

        <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-center px-3 pt-3">
          <Link
            href={backHref}
            className="absolute start-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-text-navy shadow-sm"
            aria-label={t("back")}
          >
            <BackChevron />
          </Link>
          <h1 className="max-w-[70%] truncate rounded-full bg-white/90 px-3 py-1.5 text-center text-sm font-extrabold text-text-navy shadow-sm">
            {data.title}
          </h1>
        </header>

        {data.unitIconUrl && companionPoint ? (
          <div
            className="path-companion pointer-events-none absolute z-[11] h-[4.6rem] w-[4.6rem] -translate-x-1/2 -translate-y-[118%]"
            style={{
              left: `${companionPoint.x + (companionFlip ? -16 : 16)}%`,
              top: `${companionPoint.y}%`,
              animationDelay: `${220 + Math.max(companionIndex, 0) * 140}ms`,
            }}
          >
            <Image src={data.unitIconUrl} alt={t("path.companion")} width={160} height={160} unoptimized className="h-full w-full object-contain drop-shadow-[0_8px_10px_rgba(26,43,71,0.22)]" />
          </div>
        ) : null}

        <div className="absolute inset-0" role="list" aria-label={t("path.aria")}>
          {stations.length === 0 ? (
            <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-[22px] bg-white/90 p-4 text-center font-semibold text-text-gray">
              {t("emptyLessons")}
            </p>
          ) : (
            stations.map((station, index) => {
              const point = points[index];
              if (!point) return null;
              return (
                <StationMarker
                  key={station.lessonId}
                  title={station.title}
                  number={index + 1}
                  state={visualState(station)}
                  stars={station.stars}
                  isFinale={station.isFinale}
                  accentColor={data.accentColor}
                  x={point.x}
                  y={point.y}
                  appearDelayMs={220 + index * 140}
                  bouncing={bouncingId === station.lessonId}
                  previewed={preview?.lessonId === station.lessonId}
                  onOpen={() => openStation(station)}
                  onPreview={() => setPreviewId(station.lessonId)}
                />
              );
            })
          )}
        </div>
      </div>

      <aside className="hidden min-w-[19rem] flex-1 flex-col overflow-y-auto rounded-[28px] bg-white p-5 shadow-[0_16px_36px_-24px_rgba(26,43,71,0.4)] md:flex">
        <h2 className="text-sm font-extrabold text-text-navy">{tDesk("lessonPreview")}</h2>
        {preview ? (
          <>
            <p className="mt-3 text-lg font-extrabold text-text-navy">{preview.title}</p>
            <p className="mt-1 text-sm font-bold text-text-gray">
              {preview.isFinale ? tPath("finale") : previewState === "current" ? tPath("current") : previewState === "completed" ? tPath("completed") : tPath("locked")}
            </p>
            {preview.stars != null && preview.status === "completed" ? (
              <p className="mt-1 text-sm font-extrabold text-primary-orange">{tPath("stars", { count: preview.stars })}</p>
            ) : null}
            <div className="mt-4">
              <Button
                type="button"
                fullWidth
                disabled={preview.status === "locked" || bouncingId != null}
                onClick={() => openStation(preview)}
              >
                {preview.status === "completed" ? tDesk("replayLesson") : preview.status === "locked" ? tDesk("lockedLesson") : tDesk("startLesson")}
              </Button>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm font-semibold text-text-gray">{t("emptyLessons")}</p>
        )}

        <h3 className="mt-6 text-sm font-extrabold text-text-navy">{tDesk("pathLessons")}</h3>
        <ul className="mt-3 flex flex-col gap-1.5">
          {stations.map((station, index) => {
            const active = preview?.lessonId === station.lessonId;
            return (
              <li key={station.lessonId}>
                <button
                  type="button"
                  onClick={() => setPreviewId(station.lessonId)}
                  onDoubleClick={() => openStation(station)}
                  className={`flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-start text-sm font-extrabold ${
                    active ? "bg-[#FFF1E4] text-primary-orange" : "bg-neutral-50 text-text-navy"
                  }`}
                >
                  <span className="min-w-0 truncate">
                    {index + 1}. {station.title}
                  </span>
                  <span className="shrink-0 text-[11px] font-bold text-text-gray">
                    {station.status === "available" ? tPath("current") : station.status === "completed" ? tPath("completed") : tPath("locked")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}

function BackChevron() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 rtl:rotate-180" fill="none" aria-hidden="true">
      <path d="M14.5 6.5 9 12l5.5 5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
