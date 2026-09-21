"use client";

import type { Ref } from "react";
import type { JourneyNodeStatus } from "@/lib/path/journeyStatus";
import type { LabelSide } from "@/lib/path/journeyLayout";
import { LessonTitleBubble } from "./LessonTitleBubble";

type Props = {
  status: JourneyNodeStatus;
  title: string;
  endBadge: string;
  meta: string;
  ariaLabel: string;
  xPct: number;
  yPx: number;
  labelSide: LabelSide;
  selected?: boolean;
  onSelect: () => void;
  anchorRef?: Ref<HTMLDivElement>;
  reduceMotion?: boolean;
  isMobile?: boolean;
};

/**
 * Final unit review node — same visual system as lesson nodes, slightly larger.
 * Description lives in the details sheet, not permanently on the map.
 */
export function UnitReviewStation({
  status,
  title,
  endBadge,
  meta,
  ariaLabel,
  xPct,
  yPx,
  labelSide,
  selected = false,
  onSelect,
  anchorRef,
  reduceMotion = false,
  isMobile = false,
}: Props) {
  const locked = status === "locked";
  const completed = status === "completed";
  const available = status === "current" || status === "available";
  const size = isMobile ? 82 : 90;

  return (
    <div
      ref={anchorRef}
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${xPct}%`, top: yPx }}
    >
      {available && !reduceMotion ? (
        <span
          className="journey-pulse pointer-events-none absolute inset-[-8px] rounded-full"
          style={{ boxShadow: "0 0 0 0 rgba(248,200,48,0.4)" }}
          aria-hidden="true"
        />
      ) : null}

      <span className="pointer-events-none absolute -top-6 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-extrabold text-[#5B4B8A] ring-1 ring-[#5B4B8A]/20">
        {endBadge}
      </span>

      <button
        type="button"
        onClick={onSelect}
        aria-label={ariaLabel}
        aria-disabled={locked || undefined}
        className={`relative flex min-h-11 min-w-11 items-center justify-center rounded-full text-white shadow-[0_6px_14px_-8px_rgba(26,43,71,0.45)] ring-[3px] ring-[#F8C830] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 ${
          selected ? "ring-offset-2" : ""
        } ${locked ? "cursor-default" : "hover:scale-[1.03]"}`}
        style={{
          width: size,
          height: size,
          background: completed
            ? "#34C759"
            : locked
              ? "#A8B4C4"
              : "linear-gradient(160deg,#5B4B8A 0%,#3D4F7A 100%)",
          filter: locked ? "saturate(0.7) brightness(0.95)" : undefined,
        }}
      >
        {locked ? <LockIcon /> : completed ? <CheckIcon /> : <BookCheckIcon />}
      </button>

      <LessonTitleBubble title={title} meta={meta} status={status} side={labelSide} />
    </div>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <rect x="6" y="11" width="12" height="9" rx="2" fill="white" opacity="0.95" />
      <path d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" aria-hidden="true">
      <path d="M6.5 12.5 10.2 16.2 17.5 8.5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BookCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
      <path
        d="M6 5.5h9.5A2.5 2.5 0 0 1 18 8v11.5H8.5A2.5 2.5 0 0 0 6 21.5V5.5Z"
        fill="white"
        opacity="0.95"
      />
      <path d="M6 5.5V21.5" stroke="#5B4B8A" strokeWidth="1.4" />
      <path d="M10 12.2 12.1 14.2 16 10" stroke="#5B4B8A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
