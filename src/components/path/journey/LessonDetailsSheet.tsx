"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/Button";
import type { JourneyNodeStatus } from "@/lib/path/journeyStatus";

export type LessonDetailsContent = {
  title: string;
  status: JourneyNodeStatus;
  statusLabel: string;
  description: string;
  questionsLabel?: string | null;
  durationLabel?: string | null;
  bestScoreLabel?: string | null;
  stars?: number | null;
  pointsHint?: string | null;
  primaryLabel: string;
  primaryDisabled?: boolean;
  closeLabel: string;
};

type Props = {
  open: boolean;
  content: LessonDetailsContent | null;
  onClose: () => void;
  onPrimary: () => void;
};

export function LessonDetailsSheet({ open, content, onClose, onPrimary }: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("button:not([disabled])")?.focus();
    }, 30);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open || !content) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 md:items-center md:justify-end md:pe-8">
      <button
        type="button"
        className="absolute inset-0 bg-[#1A2B47]/35 backdrop-blur-[2px]"
        aria-label={content.closeLabel}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="relative z-10 w-full max-w-sm rounded-t-[28px] border-[3px] border-white bg-white p-5 shadow-[0_24px_48px_-20px_rgba(26,43,71,0.45)] sm:rounded-[28px] md:me-2"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-200 sm:hidden" aria-hidden="true" />
        <p
          className={`text-center text-xs font-extrabold tracking-wide ${
            content.status === "locked"
              ? "text-text-gray"
              : content.status === "completed"
                ? "text-emerald-600"
                : "text-primary-orange"
          }`}
        >
          {content.statusLabel}
        </p>
        <h2 id={titleId} className="mt-2 text-center text-xl font-black text-text-navy">
          {content.title}
        </h2>
        <p className="mt-2 text-center text-sm font-bold leading-relaxed text-text-gray">
          {content.description}
        </p>

        <ul className="mt-4 space-y-1.5 text-center text-xs font-bold text-text-gray">
          {content.questionsLabel ? <li>{content.questionsLabel}</li> : null}
          {content.durationLabel ? <li>{content.durationLabel}</li> : null}
          {content.bestScoreLabel ? <li>{content.bestScoreLabel}</li> : null}
          {content.stars != null && content.stars > 0 ? (
            <li>
              {Array.from({ length: Math.min(3, content.stars) }, (_, i) => (
                <svg
                  key={i}
                  viewBox="0 0 20 20"
                  className="mx-0.5 inline h-4 w-4 text-amber-400"
                  aria-hidden="true"
                >
                  <path
                    fill="currentColor"
                    d="M10 1.8 12.4 7l5.6.5-4.3 3.7 1.3 5.4L10 13.8 4.9 16.6l1.3-5.4L1.9 7.5 7.6 7 10 1.8Z"
                  />
                </svg>
              ))}
            </li>
          ) : null}
          {content.pointsHint ? <li className="text-primary-orange">{content.pointsHint}</li> : null}
        </ul>

        <div className="mt-5 flex flex-col gap-2">
          <Button type="button" fullWidth onClick={onPrimary} disabled={content.primaryDisabled}>
            {content.primaryLabel}
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl py-2.5 text-sm font-extrabold text-text-gray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            {content.closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
