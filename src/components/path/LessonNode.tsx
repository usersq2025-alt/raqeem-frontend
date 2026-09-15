"use client";

import type { Ref } from "react";
import { LessonLabel } from "@/components/path/LessonLabel";
import type { StationVisualState } from "@/components/path/types";
import { toIndicDigits } from "@/lib/format/indicDigits";

export type { StationVisualState };

type Props = {
  title: string;
  number: number;
  state: StationVisualState;
  stars: number | null;
  isFinale: boolean;
  accentColor: string;
  x: number;
  y: number;
  appearDelayMs: number;
  selected?: boolean;
  ariaLabel: string;
  onSelect: () => void;
  anchorRef?: Ref<HTMLDivElement>;
};

export function LessonNode({
  title,
  number,
  state,
  stars,
  isFinale,
  accentColor,
  x,
  y,
  appearDelayMs,
  selected = false,
  ariaLabel,
  onSelect,
  anchorRef,
}: Props) {
  const locked = state === "locked";
  const completed = state === "completed";
  const current = state === "current";
  const starCount = completed ? Math.max(0, Math.min(3, stars ?? 0)) : 0;
  const labelSide = x >= 50 ? "start" : "end";

  const size = current ? "4.85rem" : "3.65rem";
  const fill = locked ? "#E5E8EE" : completed ? "#34C759" : accentColor || "#2EC4A8";

  return (
    <div
      ref={anchorRef}
      role="listitem"
      className={`path-station-wrap absolute z-10 ${current ? "path-station-wrap-current z-[12]" : ""} ${
        selected ? "z-20" : ""
      }`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        animationDelay: `${appearDelayMs}ms`,
      }}
    >
      {current ? (
        <span className="path-node-sparkles pointer-events-none absolute inset-0" aria-hidden="true">
          <span className="path-sparkle path-sparkle-a">✦</span>
          <span className="path-sparkle path-sparkle-b">✧</span>
          <span className="path-sparkle path-sparkle-c">✦</span>
        </span>
      ) : null}

      {starCount > 0 ? (
        <div className="pointer-events-none absolute -top-6 left-1/2 flex -translate-x-1/2 gap-0.5" aria-hidden="true">
          {Array.from({ length: starCount }, (_, i) => (
            <span key={i} className="path-station-star text-sm leading-none text-amber-400">
              ★
            </span>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onSelect}
        aria-label={ariaLabel}
        aria-disabled={locked}
        className={`path-station path-lesson-node relative flex items-center justify-center rounded-full text-white ${
          current ? "path-station-current path-node-current" : completed ? "path-station-completed path-node-done" : "path-station-locked path-node-locked"
        } ${selected && !locked ? "path-node-selected" : ""} ${locked ? "cursor-default" : "cursor-pointer"}`}
        style={{
          width: size,
          height: size,
          background: fill,
          opacity: locked ? 0.78 : 1,
          ["--path-lip" as string]: locked ? "#C5CBD3" : completed ? "#1F9A45" : "#1A9A86",
        }}
      >
        {current ? (
          <>
            <span className="path-pulse-ring path-pulse-ring-a" aria-hidden="true" />
            <span className="path-pulse-ring path-pulse-ring-b" aria-hidden="true" />
          </>
        ) : null}

        {locked ? (
          isFinale ? (
            <>
              <TrophyIcon muted />
              <span className="absolute -bottom-0.5 -end-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm">
                <LockGlyph />
              </span>
            </>
          ) : (
            <LockGlyph large />
          )
        ) : null}

        {!locked && !isFinale ? (
          completed ? (
            <CheckIcon />
          ) : (
            <span className="path-station-number text-2xl font-black">{toIndicDigits(number)}</span>
          )
        ) : null}
        {!locked && isFinale ? <TrophyIcon /> : null}
      </button>

      <LessonLabel title={title} state={state} side={labelSide} />
    </div>
  );
}

function LockGlyph({ large = false }: { large?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={large ? "h-6 w-6" : "h-3 w-3"} fill="none" aria-hidden="true">
      <rect x="6" y="11" width="12" height="9" rx="2" fill="#9AA3AF" />
      <path d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11" stroke="#9AA3AF" strokeWidth="2.2" strokeLinecap="round" />
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

function TrophyIcon({ muted = false }: { muted?: boolean }) {
  const fill = muted ? "#9AA3AF" : "white";
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
      <path d="M8 4h8v3.2a4 4 0 0 1-8 0V4Z" fill={fill} />
      <path d="M8 6.2H5.6A2.6 2.6 0 0 0 8 8.6M16 6.2h2.4A2.6 2.6 0 0 1 16 8.6" stroke={fill} strokeWidth="1.8" />
      <path d="M10 14.2h4V16H10zM9 19h6" stroke={fill} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
