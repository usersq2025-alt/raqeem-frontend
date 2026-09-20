"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

type Props = {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
  width?: number;
  height?: number;
};

const MIN = 0;
const MAX = 100;
const STEP = 4;

function clampRatio(value: number): number {
  return Math.min(MAX, Math.max(MIN, value));
}

export function BeforeAfterCompare({
  beforeSrc,
  afterSrc,
  beforeAlt,
  afterAlt,
  width = 1024,
  height = 682,
}: Props) {
  const t = useTranslations("welcome.showcase.compare");
  const locale = useLocale();
  const isRtl = locale === "ar" || locale.startsWith("ar-");
  const [ratio, setRatio] = useState(50);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [nudgeActive, setNudgeActive] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const labelId = useId();
  const hintId = useId();
  const introPlayed = useRef(false);

  const markInteracted = useCallback(() => {
    setHasInteracted(true);
    setNudgeActive(false);
  }, []);

  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return;
      // Physical left→right: 0% … 100%. In RTL, "before" lives on the inline-start (right).
      const fromLeft = ((clientX - rect.left) / rect.width) * 100;
      const next = isRtl ? 100 - fromLeft : fromLeft;
      setRatio(clampRatio(next));
    },
    [isRtl]
  );

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    markInteracted();
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setFromClientX(event.clientX);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    setFromClientX(event.clientX);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const key = event.key;
    if (key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown" || key === "Home" || key === "End") {
      markInteracted();
      event.preventDefault();
    }

    // Physical arrows: Left decreases the before-share from inline-start in LTR,
    // and mirrors in RTL so the handle still moves with the pressed arrow.
    if (key === "ArrowLeft") {
      setRatio((value) => clampRatio(value + (isRtl ? STEP : -STEP)));
    } else if (key === "ArrowRight") {
      setRatio((value) => clampRatio(value + (isRtl ? -STEP : STEP)));
    } else if (key === "ArrowDown") {
      setRatio((value) => clampRatio(value - STEP));
    } else if (key === "ArrowUp") {
      setRatio((value) => clampRatio(value + STEP));
    } else if (key === "Home") {
      setRatio(MIN);
    } else if (key === "End") {
      setRatio(MAX);
    }
  }

  useEffect(() => {
    const el = trackRef.current;
    if (!el || introPlayed.current || hasInteracted) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      introPlayed.current = true;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || introPlayed.current || hasInteracted) return;
        introPlayed.current = true;
        setNudgeActive(true);
        observer.disconnect();
      },
      { threshold: 0.45 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasInteracted]);

  useEffect(() => {
    if (!nudgeActive || hasInteracted) return;
    const timers = [
      window.setTimeout(() => setRatio(62), 180),
      window.setTimeout(() => setRatio(38), 620),
      window.setTimeout(() => {
        setRatio(50);
        setNudgeActive(false);
      }, 1060),
    ];
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [nudgeActive, hasInteracted]);

  const beforeClip = isRtl
    ? `inset(0 0 0 ${100 - ratio}%)`
    : `inset(0 ${100 - ratio}% 0 0)`;

  // Physical left position so translateX(-50%) always centers the handle on the split.
  const splitLeft = isRtl ? 100 - ratio : ratio;

  return (
    <div className="w-full">
      <p id={hintId} className="sr-only">
        {t("hint")}
      </p>
      <div
        ref={trackRef}
        className="landing-compare relative w-full touch-none overflow-hidden rounded-[22px] bg-brand-cream ring-1 ring-brand-navy/10 select-none"
        style={{ aspectRatio: `${width} / ${height}` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* After = full base layer */}
        <Image
          src={afterSrc}
          alt={afterAlt}
          width={width}
          height={height}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain object-center"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 560px"
          unoptimized
          draggable={false}
          priority
        />

        {/* Before = clipped overlay, same box / object-fit / position */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ clipPath: beforeClip }}
          aria-hidden="true"
        >
          <Image
            src={beforeSrc}
            alt=""
            width={width}
            height={height}
            className="h-full w-full object-contain object-center"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 560px"
            unoptimized
            draggable={false}
          />
        </div>

        <span
          className="pointer-events-none absolute start-2.5 top-2.5 z-[1] max-w-[42%] truncate rounded-full bg-white/90 px-2.5 py-1 text-xs font-extrabold text-brand-navy-dark shadow-sm ring-1 ring-brand-navy/10 sm:start-3 sm:top-3 sm:px-3 sm:text-sm"
          id={labelId}
        >
          {t("before")}
        </span>
        <span className="pointer-events-none absolute end-2.5 top-2.5 z-[1] max-w-[42%] truncate rounded-full bg-white/90 px-2.5 py-1 text-xs font-extrabold text-brand-navy-dark shadow-sm ring-1 ring-brand-navy/10 sm:end-3 sm:top-3 sm:px-3 sm:text-sm">
          {t("after")}
        </span>

        {/* Divider line */}
        <span
          className="pointer-events-none absolute top-0 z-[2] h-full w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(0,56,144,0.18)]"
          style={{ left: `${splitLeft}%` }}
          aria-hidden="true"
        />

        <button
          type="button"
          role="slider"
          aria-valuemin={MIN}
          aria-valuemax={MAX}
          aria-valuenow={Math.round(ratio)}
          aria-valuetext={t("valueText", { percent: Math.round(ratio) })}
          aria-label={t("sliderLabel")}
          aria-describedby={hintId}
          aria-orientation="horizontal"
          className="landing-compare-handle absolute top-1/2 z-[3] flex h-11 w-11 min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand-navy text-white shadow-[0_8px_20px_-8px_rgba(0,34,100,0.65)] ring-[2.5px] ring-brand-gold transition-[box-shadow,transform] hover:scale-105 hover:shadow-[0_10px_24px_-8px_rgba(0,34,100,0.75)] focus-visible:outline-none focus-visible:ring-[2.5px] focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-cream active:scale-100"
          style={{ left: `${splitLeft}%` }}
          onKeyDown={onKeyDown}
          onPointerDown={(event) => {
            // Let the track handler own capture; still mark interaction.
            markInteracted();
            event.stopPropagation();
            dragging.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            setFromClientX(event.clientX);
          }}
          onPointerMove={(event) => {
            if (!dragging.current) return;
            setFromClientX(event.clientX);
          }}
          onPointerUp={(event) => {
            dragging.current = false;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          onPointerCancel={() => {
            dragging.current = false;
          }}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
            <path
              d="M9 8 5 12l4 4M15 8l4 4-4 4"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <p className="mt-3 text-center font-body text-sm font-semibold leading-relaxed text-[#334E6E] sm:text-base">
        {t("hint")}
      </p>
    </div>
  );
}
