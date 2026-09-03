"use client";

import { useTranslations } from "next-intl";
import { mixHex } from "@/lib/path/layout";

export type StationVisualState = "completed" | "current" | "locked";

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
  bouncing: boolean;
  previewed?: boolean;
  onOpen: () => void;
  onPreview?: () => void;
};

export function StationMarker({
  title,
  number,
  state,
  stars,
  isFinale,
  accentColor,
  x,
  y,
  appearDelayMs,
  bouncing,
  previewed = false,
  onOpen,
  onPreview,
}: Props) {
  const t = useTranslations("student.path");
  const locked = state === "locked";
  const completed = state === "completed";
  const current = state === "current";
  const starCount = completed ? Math.max(0, Math.min(3, stars ?? 0)) : 0;
  const replayOnStart = x >= 50;
  const fill = locked
    ? "linear-gradient(180deg, #E8EAEE 0%, #C5CBD3 100%)"
    : completed
      ? `linear-gradient(180deg, ${mixHex(accentColor, "#FFE082", 0.35)} 0%, ${mixHex(accentColor, "#1A2B47", 0.12)} 100%)`
      : `linear-gradient(180deg, ${mixHex(accentColor, "#FFFFFF", 0.28)} 0%, ${mixHex(accentColor, "#1A2B47", 0.18)} 100%)`;
  const lip = locked ? "#9AA3AF" : completed ? mixHex(accentColor, "#C9A227", 0.45) : mixHex(accentColor, "#1A2B47", 0.28);

  return (
    <div
      role="listitem"
      className={`path-station-wrap absolute z-10 ${current ? "path-station-wrap-current" : ""} ${
        previewed ? "z-20" : ""
      }`}
      onPointerEnter={onPreview}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        animationDelay: `${appearDelayMs}ms`,
      }}
    >
      {starCount > 0 ? (
        <div className="pointer-events-none absolute -top-7 left-1/2 flex -translate-x-1/2 gap-0.5" aria-hidden="true">
          {Array.from({ length: starCount }, (_, i) => (
            <span key={i} className="path-station-star text-[1.05rem] leading-none">
              ⭐
            </span>
          ))}
        </div>
      ) : null}

      {completed ? (
        <button
          type="button"
          onClick={onOpen}
          className="path-replay absolute top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white"
          style={replayOnStart ? { right: "calc(100% + 0.45rem)" } : { left: "calc(100% + 0.45rem)" }}
          aria-label={t("replay")}
        >
          <ReplayIcon />
        </button>
      ) : null}

      <button
        type="button"
        disabled={locked}
        onClick={locked ? undefined : onOpen}
        aria-label={
          isFinale
            ? `${t("finale")}: ${title}`
            : `${title}. ${locked ? t("locked") : current ? t("current") : t("completed")}${
                starCount > 0 ? `. ${t("stars", { count: starCount })}` : ""
              }`
        }
        className={`path-station relative flex items-center justify-center rounded-full text-white ${
          current ? "path-station-current" : completed ? "path-station-completed" : "path-station-locked"
        } ${bouncing ? "path-station-bounce" : ""} ${locked ? "cursor-not-allowed" : "cursor-pointer"}`}
        style={{
          width: current ? "4.15rem" : "3.15rem",
          height: current ? "4.15rem" : "3.15rem",
          background: fill,
          ["--path-lip" as string]: lip,
        }}
      >
        {current ? (
          <>
            <span className="path-pulse-ring path-pulse-ring-a" aria-hidden="true" />
            <span className="path-pulse-ring path-pulse-ring-b" aria-hidden="true" />
          </>
        ) : null}
        {locked && !isFinale ? <LockIcon /> : null}
        {!locked && !isFinale ? (
          completed ? (
            <CheckIcon />
          ) : (
            <span className="text-xl font-black drop-shadow-[0_1px_0_rgba(0,0,0,0.18)]">{number}</span>
          )
        ) : null}
        {isFinale ? <TrophyIcon /> : null}
        {locked && isFinale ? (
          <span className="absolute -bottom-0.5 -end-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-sm">
            <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" aria-hidden="true">
              <rect x="6" y="11" width="12" height="9" rx="2" fill="#9AA3AF" />
              <path d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11" stroke="#9AA3AF" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </span>
        ) : null}
      </button>

      <p className="pointer-events-none absolute left-1/2 top-[calc(100%+0.45rem)] w-max max-w-[7.6rem] -translate-x-1/2 rounded-full bg-white/95 px-2.5 py-0.5 text-center text-[11px] font-extrabold leading-tight text-text-navy shadow-[0_8px_18px_-12px_rgba(26,43,71,0.55)]">
        {title}
      </p>
    </div>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2.5" fill="white" opacity="0.92" />
      <path d="M8 11V8.2a4 4 0 0 1 8 0V11" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
      <path d="M6.5 12.5 10.2 16.2 17.5 8.5" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ReplayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-text-navy" fill="none" aria-hidden="true">
      <path d="M7.2 7.2A6.8 6.8 0 1 1 5.5 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M5 5.2v4.2h4.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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
