"use client";

/** Compact bottom travel indicator — no modal/popup. */
export function QuestionTransitionBar({ label }: { label: string }) {
  return (
    <div
      className="play-q-travel pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-3 pt-8"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-[22px] border border-emerald-100 bg-white/95 px-4 py-3 shadow-[0_-8px_28px_-16px_rgba(26,43,71,0.35)] backdrop-blur-sm">
        <span className="play-q-travel-pulse flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-lg font-black text-white">
          →
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-text-navy">{label}</p>
          <div className="play-q-transition-bar mt-2" aria-hidden="true">
            <span className="play-q-transition-bar-fill" />
          </div>
        </div>
      </div>
    </div>
  );
}
