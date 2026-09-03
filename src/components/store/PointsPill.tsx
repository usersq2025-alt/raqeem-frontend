"use client";

import { useEffect, useState } from "react";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useAnimatedPoints(target: number, from?: number | null) {
  const startAt = from ?? target;
  const [value, setValue] = useState(startAt);

  useEffect(() => {
    if (from == null || from === target || prefersReducedMotion()) {
      setValue(target);
      return;
    }

    const origin = from;
    const started = performance.now();
    const duration = 880;
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(origin + (target - origin) * eased));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [from, target]);

  return value;
}

type Props = {
  count: number;
  from?: number | null;
  label: string;
};

export function PointsPill({ count, from, label }: Props) {
  const value = useAnimatedPoints(count, from);

  return (
    <span className="points-pill inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-extrabold text-text-navy shadow-[0_8px_20px_-14px_rgba(26,43,71,0.55)]">
      <span className="inline-flex h-5 w-5 items-center justify-center text-base leading-none" aria-hidden="true">
        ★
      </span>
      <span className="tabular-nums text-[#E6A800]">{value}</span>
      <span className="text-text-gray">{label}</span>
    </span>
  );
}
