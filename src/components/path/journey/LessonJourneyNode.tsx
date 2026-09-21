"use client";

import type { Ref } from "react";
import Image from "next/image";
import type { JourneyNodeStatus } from "@/lib/path/journeyStatus";
import type { LabelSide } from "@/lib/path/journeyLayout";
import { LessonTitleBubble } from "./LessonTitleBubble";

export type LessonJourneyNodeProps = {
  title: string;
  status: JourneyNodeStatus;
  index: number;
  stars?: number | null;
  isFinale?: boolean;
  xPct: number;
  yPx: number;
  labelSide: LabelSide;
  meta: string;
  ariaLabel: string;
  selected?: boolean;
  onSelect: () => void;
  anchorRef?: Ref<HTMLDivElement>;
  currentColor: string;
  reduceMotion?: boolean;
  isMobile?: boolean;
  /** When current: show child avatar above node without covering the title */
  childAvatarSrc?: string | null;
  childName?: string;
  currentBadge?: string;
  compactCurrent?: boolean;
};

export function LessonJourneyNode({
  title,
  status,
  stars,
  isFinale = false,
  xPct,
  yPx,
  labelSide,
  meta,
  ariaLabel,
  selected = false,
  onSelect,
  anchorRef,
  currentColor,
  reduceMotion = false,
  isMobile = false,
  childAvatarSrc,
  childName = "",
  currentBadge,
  compactCurrent = false,
}: LessonJourneyNodeProps) {
  const locked = status === "locked";
  const completed = status === "completed";
  const current = status === "current";

  const sizePx = current ? (isMobile ? 68 : 76) : isMobile ? 58 : 64;
  const fill = locked ? "#C5CED9" : completed ? "#34C759" : current ? undefined : "#003890";

  const showAvatar = current && Boolean(childAvatarSrc);
  const titleBelow = current && isMobile && compactCurrent;

  return (
    <div
      ref={anchorRef}
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${xPct}%`, top: yPx }}
    >
      {showAvatar ? (
        <div className="pointer-events-none absolute start-1/2 bottom-[calc(100%+0.75rem)] z-20 -translate-x-1/2">
          {!compactCurrent && currentBadge ? (
            <span className="mb-1 block whitespace-nowrap rounded-full bg-[#FFF1E4] px-2 py-0.5 text-center text-[9px] font-extrabold text-primary-orange ring-1 ring-primary-orange/20">
              {currentBadge}
            </span>
          ) : null}
          <span className={`mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_6px_14px_-10px_rgba(26,43,71,0.5)] ring-2 ring-white ${reduceMotion ? "" : "journey-breathe"}`}>
            <Image
              src={childAvatarSrc!}
              alt={childName}
              width={48}
              height={48}
              unoptimized
              className="h-[88%] w-[88%] object-contain"
            />
          </span>
        </div>
      ) : null}

      {current && !reduceMotion ? (
        <span
          className="journey-pulse pointer-events-none absolute inset-[-8px] rounded-full"
          style={{ boxShadow: `0 0 0 0 ${currentColor}40` }}
          aria-hidden="true"
        />
      ) : null}

      <button
        type="button"
        onClick={onSelect}
        aria-label={ariaLabel}
        aria-disabled={locked || undefined}
        className={`relative flex min-h-11 min-w-11 items-center justify-center rounded-full text-white shadow-[0_6px_14px_-8px_rgba(26,43,71,0.42)] ring-[3px] ring-white transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 ${
          current ? "scale-105" : ""
        } ${selected ? "ring-brand-gold" : ""} ${locked ? "cursor-default" : "hover:scale-[1.03]"}`}
        style={{
          width: sizePx,
          height: sizePx,
          background: current
            ? `linear-gradient(145deg, #F8C830 0%, ${currentColor} 60%, #E56A1A 100%)`
            : fill,
        }}
      >
        {locked ? <LockIcon /> : null}
        {!locked && completed ? <CheckIcon /> : null}
        {!locked && !completed && isFinale ? <TrophyIcon /> : null}
        {!locked && !completed && !isFinale ? <PlayIcon /> : null}
      </button>

      {completed && stars != null && stars > 0 ? (
        <div
          className="pointer-events-none absolute start-1/2 top-[calc(100%+0.2rem)] flex -translate-x-1/2 gap-0.5"
          aria-hidden="true"
        >
          {Array.from({ length: Math.min(3, stars) }, (_, i) => (
            <svg key={i} viewBox="0 0 20 20" className="h-3 w-3 text-amber-400" aria-hidden="true">
              <path
                fill="currentColor"
                d="M10 1.8 12.4 7l5.6.5-4.3 3.7 1.3 5.4L10 13.8 4.9 16.6l1.3-5.4L1.9 7.5 7.6 7 10 1.8Z"
              />
            </svg>
          ))}
        </div>
      ) : null}

      <LessonTitleBubble
        title={title}
        meta={meta}
        status={status}
        side={labelSide}
        below={titleBelow}
      />
    </div>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <rect x="6" y="11" width="12" height="9" rx="2" fill="#5B6B7C" />
      <path d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11" stroke="#5B6B7C" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
      <path d="M6.5 12.5 10.2 16.2 17.5 8.5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <path d="M9 7.5v9l8-4.5-8-4.5Z" fill="white" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <path d="M8 4h8v3.2a4 4 0 0 1-8 0V4Z" fill="white" />
      <path d="M8 6.2H5.6A2.6 2.6 0 0 0 8 8.6M16 6.2h2.4A2.6 2.6 0 0 1 16 8.6" stroke="white" strokeWidth="1.8" />
      <path d="M10 14.2h4V16H10zM9 19h6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
