"use client";

import { toIndicDigits } from "@/lib/format/indicDigits";

type Props = {
  kind: "next" | "done";
  title: string;
  subtitle: string;
  nextNumber?: number;
};

/** Full-screen celebratory beat between questions so kids feel the move forward. */
export function QuestionTransitionOverlay({ kind, title, subtitle, nextNumber }: Props) {
  return (
    <div className="play-q-transition fixed inset-0 z-[60] flex items-center justify-center px-6" role="status" aria-live="polite">
      <div className="play-q-transition-veil absolute inset-0" aria-hidden="true" />
      <div className="play-q-transition-card relative z-10 w-full max-w-sm rounded-[32px] border-[4px] border-white bg-white/95 px-6 py-8 text-center shadow-[0_28px_60px_-24px_rgba(26,43,71,0.5)]">
        <div className="play-q-transition-orbit mx-auto mb-5" aria-hidden="true">
          <span className="play-q-transition-ring" />
          <span className="play-q-transition-ring play-q-transition-ring-b" />
          <span className="play-q-transition-core">
            {kind === "done" ? "★" : nextNumber != null ? toIndicDigits(nextNumber) : "→"}
          </span>
          <span className="play-q-transition-spark play-q-transition-spark-a">✦</span>
          <span className="play-q-transition-spark play-q-transition-spark-b">✧</span>
          <span className="play-q-transition-spark play-q-transition-spark-c">✦</span>
        </div>
        <p className="text-2xl font-black text-text-navy">{title}</p>
        <p className="mt-2 text-sm font-bold leading-relaxed text-text-gray">{subtitle}</p>
        <div className="play-q-transition-bar mt-6" aria-hidden="true">
          <span className="play-q-transition-bar-fill" />
        </div>
      </div>
    </div>
  );
}
