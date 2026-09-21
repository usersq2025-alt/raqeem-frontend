"use client";

import type { ReactNode } from "react";

export function SectionIntro({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-4">
      <h2 className="text-xl font-extrabold text-text-navy">{title}</h2>
      <p className="mt-1.5 text-sm font-medium leading-relaxed text-text-gray">{description}</p>
    </header>
  );
}

export function SkeletonBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-[22px] bg-neutral-100" />
      ))}
    </div>
  );
}

export function ErrorBlock({
  message,
  retryLabel,
  onRetry,
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-[22px] bg-red-50 p-4 ring-1 ring-red-100">
      <p className="text-sm font-semibold text-red-700">{message}</p>
      <button
        type="button"
        className="mt-3 min-h-11 rounded-2xl bg-white px-4 text-sm font-extrabold text-text-navy ring-1 ring-brand-navy/10 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
        onClick={onRetry}
      >
        {retryLabel}
      </button>
    </div>
  );
}

export function EmptyBlock({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[22px] bg-neutral-50 p-5 text-center ring-1 ring-brand-navy/5">
      <p className="text-base font-extrabold text-text-navy">{title}</p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-text-gray">{body}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ComingSoonCard({
  badge,
  title,
  body,
  note,
}: {
  badge: string;
  title: string;
  body: string;
  note?: string;
}) {
  return (
    <div className="rounded-[22px] bg-[#F8FAFC] p-5 ring-1 ring-brand-navy/8">
      <span className="inline-flex rounded-full bg-[#FFF1E4] px-3 py-1 text-xs font-extrabold text-primary-orange">
        {badge}
      </span>
      <h3 className="mt-3 text-base font-extrabold text-text-navy">{title}</h3>
      <p className="mt-2 text-sm font-medium leading-relaxed text-text-gray">{body}</p>
      {note ? <p className="mt-3 text-xs font-semibold text-text-navy/80">{note}</p> : null}
    </div>
  );
}

export function CardShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[22px] bg-neutral-50 p-4 ring-1 ring-brand-navy/5 sm:p-5 ${className}`}>
      {children}
    </div>
  );
}
