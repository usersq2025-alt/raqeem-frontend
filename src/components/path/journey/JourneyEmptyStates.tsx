"use client";

import { Link } from "@/i18n/navigation";

export function JourneyLoadingSkeleton() {
  return (
    <div className="flex min-h-[70vh] flex-1 flex-col" aria-busy="true" aria-live="polite">
      <div className="h-14 animate-pulse border-b border-white/60 bg-white/80 px-3 py-2">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-neutral-200" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-1/2 rounded bg-neutral-200" />
            <div className="h-1.5 w-full rounded-full bg-neutral-100" />
          </div>
        </div>
      </div>
      <div className="relative flex-1 bg-[linear-gradient(180deg,#D6EAF8,#EEF8F4)] px-6 pt-10">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="mx-auto mb-16 flex items-center gap-3"
            style={{ marginInlineStart: `${20 + (i % 2) * 30}%` }}
          >
            <div className="h-14 w-14 animate-pulse rounded-full bg-white/80 shadow" />
            <div className="h-10 w-28 animate-pulse rounded-2xl bg-white/70" />
          </div>
        ))}
      </div>
    </div>
  );
}

type ErrorProps = {
  title: string;
  retryLabel: string;
  backLabel: string;
  backHref: string;
  onRetry: () => void;
};

export function JourneyErrorState({ title, retryLabel, backLabel, backHref, onRetry }: ErrorProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-lg font-extrabold text-text-navy">{title}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full bg-primary-orange px-5 py-2.5 text-sm font-extrabold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
      >
        {retryLabel}
      </button>
      <Link href={backHref} className="text-sm font-extrabold text-text-gray">
        {backLabel}
      </Link>
    </div>
  );
}

type EmptyProps = {
  title: string;
  backLabel: string;
  backHref: string;
};

export function JourneyEmptyState({ title, backLabel, backHref }: EmptyProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-lg font-extrabold text-text-navy">{title}</p>
      <Link
        href={backHref}
        className="rounded-full bg-primary-orange px-5 py-2.5 text-sm font-extrabold text-white"
      >
        {backLabel}
      </Link>
    </div>
  );
}
