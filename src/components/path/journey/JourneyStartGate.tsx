"use client";

type Props = {
  xPct: number;
  yPx: number;
  title: string;
  onActivate?: () => void;
  activateLabel?: string;
};

/** Simple gold start marker — not a lesson, not counted in progress. */
export function JourneyStartGate({ xPct, yPx, title, onActivate, activateLabel }: Props) {
  const marker = (
    <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-b from-[#F8C830] to-[#F48232] shadow-[0_4px_12px_-6px_rgba(244,130,50,0.55)] ring-2 ring-white">
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" aria-hidden="true">
        <path
          d="M6 19V5l10 4.5L6 14"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M6 19v0" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </span>
  );

  return (
    <div
      className="absolute z-[6] w-[8.5rem] -translate-x-1/2 -translate-y-1/2 text-center"
      style={{ left: `${xPct}%`, top: yPx }}
    >
      {onActivate ? (
        <button
          type="button"
          onClick={onActivate}
          className="mx-auto block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2"
          aria-label={activateLabel ?? title}
        >
          {marker}
        </button>
      ) : (
        <div className="pointer-events-none">{marker}</div>
      )}
      <p className="mt-1.5 text-[11px] font-extrabold text-text-navy drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]">
        {title}
      </p>
    </div>
  );
}
