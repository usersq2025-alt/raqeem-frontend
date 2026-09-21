"use client";

import type { JourneyNodeStatus } from "@/lib/path/journeyStatus";
import type { LabelSide } from "@/lib/path/journeyLayout";

type Props = {
  title: string;
  meta: string;
  status: JourneyNodeStatus;
  side: LabelSide;
  /** Mobile: place title under the cluster to avoid collision */
  below?: boolean;
  /** Shift down so a current-lesson avatar above the node cannot cover the title */
  avoidAvatar?: boolean;
};

export function LessonTitleBubble({
  title,
  meta,
  status,
  side,
  below = false,
  avoidAvatar = false,
}: Props) {
  const tone =
    status === "current"
      ? "bg-[#FFF8F1] ring-primary-orange/30"
      : status === "completed"
        ? "bg-white ring-emerald-100"
        : "bg-white/95 ring-brand-navy/10";

  if (below) {
    return (
      <div className="pointer-events-none absolute start-1/2 top-[calc(100%+0.7rem)] z-[5] w-[min(12.5rem,82vw)] -translate-x-1/2 text-center">
        <div className={`rounded-[16px] px-3 py-2 shadow-[0_6px_14px_-12px_rgba(26,43,71,0.35)] ring-1 ${tone}`}>
          <p className="line-clamp-2 text-[14.5px] font-extrabold leading-snug text-text-navy sm:text-[16.5px]">
            {title}
          </p>
          <p className="mt-0.5 text-[11px] font-bold text-[#3D4F61] sm:text-[12px]">{meta}</p>
        </div>
      </div>
    );
  }

  const vertical = avoidAvatar ? "top-[72%] -translate-y-1/2" : "top-1/2 -translate-y-1/2";

  return (
    <div
      className={`pointer-events-none absolute z-[5] w-[9rem] max-w-[11rem] sm:w-[10.75rem] sm:max-w-[11rem] ${vertical} ${
        side === "left" ? "end-[calc(100%+0.85rem)] text-end" : "start-[calc(100%+0.85rem)] text-start"
      }`}
    >
      <div className={`rounded-[16px] px-3 py-2 shadow-[0_6px_14px_-12px_rgba(26,43,71,0.35)] ring-1 ${tone}`}>
        <p className="line-clamp-2 text-[14.5px] font-extrabold leading-snug text-text-navy sm:text-[16.5px]">
          {title}
        </p>
        <p className="mt-0.5 text-[11px] font-bold text-[#3D4F61] sm:text-[12px]">{meta}</p>
      </div>
      <span
        className={`absolute top-1/2 h-px w-3 -translate-y-1/2 bg-brand-navy/15 ${
          side === "left" ? "end-[-0.65rem]" : "start-[-0.65rem]"
        }`}
        aria-hidden="true"
      />
    </div>
  );
}
