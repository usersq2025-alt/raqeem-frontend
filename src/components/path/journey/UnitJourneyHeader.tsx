"use client";

import { Link } from "@/i18n/navigation";

type Props = {
  title: string;
  subjectLabel?: string | null;
  backHref: string;
  backLabel: string;
  progressLabel: string;
  completed: number;
  total: number;
  returnLabel: string;
  onReturnToCurrent: () => void;
  accentColor: string;
};

export function UnitJourneyHeader({
  title,
  subjectLabel,
  backHref,
  backLabel,
  progressLabel,
  completed,
  total,
  returnLabel,
  onReturnToCurrent,
  accentColor,
}: Props) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-brand-navy/8 bg-white/92 px-3 py-2 backdrop-blur-md">
      {/* Row 1: back + titles + return */}
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        <Link
          href={backHref}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-50 text-text-navy ring-1 ring-brand-navy/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          aria-label={backLabel}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 rtl:rotate-180" fill="none" aria-hidden="true">
            <path
              d="M14.5 6.5 9 12l5.5 5.5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>

        <div className="min-w-0 flex-1">
          {subjectLabel ? (
            <p className="truncate text-[11px] font-bold text-[#5A6B7D]">{subjectLabel}</p>
          ) : null}
          <h1 className="truncate text-sm font-extrabold text-text-navy sm:text-base">{title}</h1>
        </div>

        <button
          type="button"
          onClick={onReturnToCurrent}
          className="inline-flex min-h-10 max-w-[7.5rem] shrink-0 items-center justify-center rounded-full bg-[#FFF1E4] px-2.5 text-center text-[11px] font-extrabold leading-tight text-primary-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold sm:max-w-none sm:px-3 sm:text-xs"
        >
          {returnLabel}
        </button>
      </div>

      {/* Row 2 (mobile) / inline (desktop): single progress instance */}
      <div className="mx-auto mt-1.5 flex max-w-3xl items-center gap-2 sm:mt-1">
        <p className="min-w-0 shrink truncate text-[11px] font-semibold text-[#5A6B7D] sm:text-xs">
          {progressLabel}
        </p>
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${pct}%`, background: accentColor }}
          />
        </div>
      </div>
    </header>
  );
}
