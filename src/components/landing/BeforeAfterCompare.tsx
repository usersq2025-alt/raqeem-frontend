"use client";

import { useCallback, useId, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

type Props = {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
  width?: number;
  height?: number;
};

export function BeforeAfterCompare({
  beforeSrc,
  afterSrc,
  beforeAlt,
  afterAlt,
  width = 1024,
  height = 682,
}: Props) {
  const t = useTranslations("welcome.showcase.compare");
  const [ratio, setRatio] = useState(50);
  const [mobileMode, setMobileMode] = useState<"before" | "after">("before");
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const labelId = useId();

  const setFromClientX = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setRatio(Math.min(96, Math.max(4, next)));
  }, []);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setFromClientX(event.clientX);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    setFromClientX(event.clientX);
  }

  function onPointerUp() {
    dragging.current = false;
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      setRatio((value) => Math.max(4, value - 4));
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      setRatio((value) => Math.min(96, value + 4));
    } else if (event.key === "Home") {
      event.preventDefault();
      setRatio(4);
    } else if (event.key === "End") {
      event.preventDefault();
      setRatio(96);
    }
  }

  return (
    <div className="w-full">
      <div className="md:hidden">
        <div
          role="group"
          aria-labelledby={labelId}
          className="mb-3 grid grid-cols-2 gap-1 rounded-full bg-brand-cream p-1 ring-1 ring-brand-navy/10"
        >
          <span id={labelId} className="sr-only">
            {t("toggleLabel")}
          </span>
          {(["before", "after"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={mobileMode === mode}
              onClick={() => setMobileMode(mode)}
              className={`min-h-11 rounded-full px-3 text-base font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
                mobileMode === mode
                  ? "bg-white text-brand-navy-dark shadow-sm"
                  : "text-[#334E6E]"
              }`}
            >
              {t(mode)}
            </button>
          ))}
        </div>
        <div
          className="relative overflow-hidden rounded-[22px] bg-brand-cream ring-1 ring-brand-navy/10"
          style={{ aspectRatio: `${width} / ${height}` }}
        >
          <Image
            src={beforeSrc}
            alt={beforeAlt}
            width={width}
            height={height}
            className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-500 motion-reduce:transition-none ${
              mobileMode === "before" ? "opacity-100" : "opacity-0"
            }`}
            sizes="100vw"
            unoptimized
          />
          <Image
            src={afterSrc}
            alt={afterAlt}
            width={width}
            height={height}
            className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-500 motion-reduce:transition-none ${
              mobileMode === "after" ? "opacity-100" : "opacity-0"
            }`}
            sizes="100vw"
            unoptimized
          />
        </div>
      </div>

      <div className="hidden md:block">
        <div
          ref={trackRef}
          className="landing-compare relative touch-none overflow-hidden rounded-[22px] bg-brand-cream ring-1 ring-brand-navy/10 select-none"
          style={{ aspectRatio: `${width} / ${height}` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <Image
            src={afterSrc}
            alt={afterAlt}
            width={width}
            height={height}
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            sizes="(max-width: 1200px) 50vw, 560px"
            unoptimized
            draggable={false}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ clipPath: `inset(0 ${100 - ratio}% 0 0)` }}
            aria-hidden="true"
          >
            <Image
              src={beforeSrc}
              alt=""
              width={width}
              height={height}
              className="h-full w-full object-contain"
              sizes="(max-width: 1200px) 50vw, 560px"
              unoptimized
              draggable={false}
            />
          </div>

          <span className="pointer-events-none absolute start-3 top-3 rounded-full bg-white/90 px-3 py-1 text-sm font-extrabold text-brand-navy-dark shadow-sm">
            {t("before")}
          </span>
          <span className="pointer-events-none absolute end-3 top-3 rounded-full bg-white/90 px-3 py-1 text-sm font-extrabold text-brand-navy-dark shadow-sm">
            {t("after")}
          </span>

          <button
            type="button"
            aria-valuemin={4}
            aria-valuemax={96}
            aria-valuenow={Math.round(ratio)}
            aria-label={t("sliderLabel")}
            className="absolute top-1/2 z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand-navy text-white shadow-lg ring-2 ring-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2"
            style={{ left: `${ratio}%` }}
            onKeyDown={onKeyDown}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
              <path
                d="M8 12H4m0 0 3-3M4 12l3 3M16 12h4m0 0-3-3m3 3-3 3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="pointer-events-none absolute left-1/2 top-1/2 h-[200vmax] w-0.5 -translate-x-1/2 -translate-y-1/2 bg-white shadow-[0_0_0_1px_rgba(0,56,144,0.2)]"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
