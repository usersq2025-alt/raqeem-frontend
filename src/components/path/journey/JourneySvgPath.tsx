"use client";

import type { JourneyPoint } from "@/lib/path/journeyLayout";
import { smoothJourneyPath } from "@/lib/path/journeyLayout";

type Props = {
  points: JourneyPoint[];
  pathColor: string;
  completedColor: string;
  completedRatio: number;
  isMobile: boolean;
};

/**
 * Path strokes use non-scaling-stroke so width stays ~56–82px even when
 * the viewBox is stretched with preserveAspectRatio="none".
 */
export function JourneySvgPath({
  points,
  pathColor,
  completedColor,
  completedRatio,
  isMobile,
}: Props) {
  const d = smoothJourneyPath(points);
  if (!d) return null;

  // Visible path width: mobile 56–68, desktop 66–82 (non-scaling px)
  const outer = isMobile ? 56 : 68;
  const inner = isMobile ? 42 : 52;
  const edge = isMobile ? 7 : 8;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="journey-path-fill" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={completedColor} />
          <stop offset={`${Math.round(completedRatio * 100)}%`} stopColor={completedColor} />
          <stop offset={`${Math.round(completedRatio * 100)}%`} stopColor={pathColor} stopOpacity="0.92" />
          <stop offset="100%" stopColor={pathColor} stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <path
        d={d}
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={outer}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={d}
        fill="none"
        stroke="url(#journey-path-fill)"
        strokeWidth={inner}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={d}
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={edge}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.28"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
