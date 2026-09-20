"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { LANDING_STEPS } from "@/config/landing";
import {
  BuildStepIcon,
  CareerStepIcon,
  ChildStepIcon,
  ReviewStepIcon,
  SparkIcon,
  StarIcon,
} from "@/components/landing/LandingIcons";

const STEP_ICONS = {
  child: ChildStepIcon,
  career: CareerStepIcon,
  review: ReviewStepIcon,
  build: BuildStepIcon,
} as const;

const STEP_COLORS = {
  navy: "#003890",
  coral: "#EA576B",
  teal: "#2DBEA1",
  purple: "#865EC9",
} as const;

/** Soft cubic path in viewBox 0..1000 × 0..180 (geometry drawn LTR, flipped in RTL). */
const PATH_D = "M 70 118 C 220 40, 380 160, 500 88 S 780 30, 930 108";

const AUTO_ADVANCE_MS = 50_000;
const STEP_COUNT = LANDING_STEPS.length;
const LAST_INDEX = STEP_COUNT - 1;

function clampIndex(index: number): number {
  return Math.min(LAST_INDEX, Math.max(0, index));
}

function progressFor(index: number): number {
  return LAST_INDEX <= 0 ? 0 : clampIndex(index) / LAST_INDEX;
}

export function DreamPathJourney() {
  const t = useTranslations("welcome.how");
  const locale = useLocale();
  const isRtl = locale === "ar" || locale.startsWith("ar-");
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(false);
  const [inView, setInView] = useState(false);
  const baseId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeRef = useRef(0);

  activeRef.current = active;

  /** User click/keyboard: pin that station (click same pinned station again to resume autoplay). */
  const selectStation = useCallback(
    (index: number) => {
      const next = clampIndex(index);
      if (pinned && activeRef.current === next) {
        setPinned(false);
        return;
      }
      setActive(next);
      setPinned(true);
    },
    [pinned]
  );

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setInView(Boolean(entries[0]?.isIntersecting));
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (pinned || !inView) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const timer = window.setInterval(() => {
      const next = (activeRef.current + 1) % STEP_COUNT;
      setActive(next);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [pinned, inView]);

  function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const key = event.key;
    if (key !== "ArrowLeft" && key !== "ArrowRight" && key !== "Home" && key !== "End") return;
    event.preventDefault();

    if (key === "Home") {
      selectStation(0);
      tabRefs.current[0]?.focus();
      return;
    }
    if (key === "End") {
      selectStation(LAST_INDEX);
      tabRefs.current[LAST_INDEX]?.focus();
      return;
    }

    const delta = key === "ArrowLeft" ? (isRtl ? 1 : -1) : isRtl ? -1 : 1;
    const next = clampIndex(active + delta);
    selectStation(next);
    tabRefs.current[next]?.focus();
  }

  const activeStep = LANDING_STEPS[active] ?? LANDING_STEPS[0];
  const panelId = `${baseId}-panel`;
  const progress = progressFor(active);
  const progressPct = Math.round(progress * 100);

  return (
    <section
      ref={sectionRef}
      id="how"
      className="dream-path-section relative z-10 scroll-mt-24 overflow-hidden py-9 sm:py-11 md:py-12"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <span className="dream-path-glow dream-path-glow-a" />
        <span className="dream-path-glow dream-path-glow-b" />
        <StarIcon className="absolute end-[12%] top-10 h-4 w-4 text-brand-gold/40" />
        <SparkIcon className="absolute start-[8%] bottom-16 h-5 w-5 text-brand-teal/35" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-extrabold text-brand-navy ring-1 ring-brand-navy/10 sm:text-sm">
            {t("badge")}
          </span>
          <h2 className="mt-3 font-sans text-[1.75rem] font-black leading-tight text-[#002264] sm:text-[2rem] md:text-[2.2rem]">
            {t("title")}
          </h2>
          <p className="mx-auto mt-2 max-w-[34ch] font-body text-sm font-medium leading-[1.75] text-[#6A7F99] sm:text-base md:max-w-[40ch]">
            {t("summaryLine")}
          </p>
        </div>

        {/* Desktop path + text card */}
        <div className="mt-8 hidden md:block">
          <div
            role="tablist"
            aria-label={t("pathLabel")}
            aria-orientation="horizontal"
            className="relative mx-auto max-w-4xl"
            onKeyDown={onTabKeyDown}
          >
            <div className={`relative ${isRtl ? "dream-path-mirror" : ""}`}>
              <svg viewBox="0 0 1000 180" className="dream-path-svg h-[8.75rem] w-full overflow-visible" aria-hidden="true">
                <defs>
                  <linearGradient id={`${baseId}-gold`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F8C830" />
                    <stop offset="100%" stopColor="#F29A0C" />
                  </linearGradient>
                </defs>
                <path d={PATH_D} fill="none" stroke="rgba(0,56,144,0.12)" strokeWidth="10" strokeLinecap="round" />
                <path
                  d={PATH_D}
                  fill="none"
                  stroke={`url(#${baseId}-gold)`}
                  strokeWidth="10"
                  strokeLinecap="round"
                  pathLength={100}
                  strokeDasharray={100}
                  strokeDashoffset={100 - progressPct}
                  className="dream-path-progress"
                />
                {[0.14, 0.3, 0.46, 0.62, 0.78, 0.9].map((tPos) => {
                  const pt = pointOnPath(tPos);
                  const lit = tPos <= progress + 0.04;
                  return (
                    <circle
                      key={tPos}
                      cx={pt.x}
                      cy={pt.y - 16}
                      r={tPos % 0.28 < 0.14 ? 2.4 : 1.7}
                      fill={lit ? "#F8C830" : "rgba(0,56,144,0.16)"}
                    />
                  );
                })}
              </svg>
            </div>

            <div className="mt-1 grid grid-cols-4 gap-2" style={{ direction: isRtl ? "rtl" : "ltr" }}>
              {LANDING_STEPS.map((step, index) => {
                const Icon = STEP_ICONS[step.icon];
                const color = STEP_COLORS[step.accent];
                const selected = active === index;
                const completed = index < active;
                const tabId = `${baseId}-tab-${step.key}`;
                return (
                  <button
                    key={step.key}
                    ref={(node) => {
                      tabRefs.current[index] = node;
                    }}
                    type="button"
                    role="tab"
                    id={tabId}
                    aria-selected={selected}
                    aria-controls={panelId}
                    aria-pressed={selected && pinned}
                    tabIndex={selected ? 0 : -1}
                    className="dream-path-station group relative flex min-h-11 flex-col items-center px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF6EC]"
                    onClick={() => selectStation(index)}
                  >
                    <span
                      className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-white transition-[transform,box-shadow] duration-300 ease-out ${
                        selected
                          ? "-translate-y-1 ring-[3px] ring-brand-gold"
                          : "ring-2 ring-brand-navy/10 group-hover:-translate-y-0.5 group-hover:ring-brand-gold/55"
                      }`}
                      style={
                        selected
                          ? {
                              boxShadow: pinned
                                ? `0 0 0 7px ${color}28, 0 14px 28px -14px ${color}99`
                                : `0 0 0 7px ${color}20, 0 14px 28px -14px ${color}99`,
                            }
                          : { boxShadow: "0 10px 22px -16px rgba(0,34,100,0.4)" }
                      }
                    >
                      <span className="absolute -top-1.5 left-1/2 z-[1] flex h-5 min-w-5 -translate-x-1/2 items-center justify-center rounded-full bg-brand-gold px-1 font-data text-[0.65rem] font-extrabold text-brand-navy-dark">
                        {completed ? (
                          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden="true">
                            <path
                              d="M3.5 8.2 6.4 11l6-7"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span style={{ color }}>
                        <Icon className="h-6 w-6" />
                      </span>
                    </span>
                    <span
                      className={`mt-2 max-w-[10rem] text-center text-sm font-extrabold leading-snug duration-300 ${
                        selected ? "text-brand-navy-dark" : "text-[#4A607C]"
                      }`}
                    >
                      {t(`steps.${step.key}.title`)}
                    </span>
                    <span
                      className={`dream-path-pointer mt-2 transition-opacity duration-300 ${
                        selected ? "opacity-100" : "opacity-0"
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <article
            id={panelId}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${activeStep.key}`}
            className="dream-path-panel mt-5 rounded-[28px] bg-white p-5 text-start shadow-[0_16px_36px_-24px_rgba(0,34,100,0.35)] ring-1 ring-brand-navy/8 sm:p-6"
          >
            <div key={activeStep.key} className="dream-path-fade">
              <p className="font-data text-xs font-extrabold tracking-wide text-brand-orange">
                {t("stepLabel", { n: active + 1 })}
              </p>
              <h3 className="mt-1 text-xl font-extrabold text-brand-navy-dark lg:text-2xl">
                {t(`steps.${activeStep.key}.title`)}
              </h3>
              <p className="mt-2 max-w-3xl font-body text-base font-medium leading-[1.8] text-[#3A5270] lg:text-lg">
                {t(`steps.${activeStep.key}.body`)}
              </p>
            </div>
            <div className="sr-only">
              {LANDING_STEPS.map((step) => (
                <p key={step.key}>{t(`steps.${step.key}.body`)}</p>
              ))}
            </div>
          </article>
        </div>

        {/* Mobile: path stations + text card under each */}
        <ol className="relative mt-7 space-y-3 md:hidden">
          <div className="dream-path-mobile-rail" aria-hidden="true">
            <span style={{ height: `${progress * 100}%` }} />
          </div>
          {LANDING_STEPS.map((step, index) => {
            const Icon = STEP_ICONS[step.icon];
            const color = STEP_COLORS[step.accent];
            const expanded = active === index;
            const completed = index < active;
            const itemPanelId = `${baseId}-mob-${step.key}`;
            return (
              <li key={step.key} className="relative ps-14">
                <button
                  type="button"
                  className={`absolute start-0 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white transition-transform duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
                    expanded ? "-translate-y-0.5 ring-[3px] ring-brand-gold" : "ring-2 ring-brand-navy/10"
                  }`}
                  style={expanded ? { boxShadow: `0 0 0 5px ${color}22` } : undefined}
                  aria-expanded={expanded}
                  aria-controls={itemPanelId}
                  aria-pressed={expanded && pinned}
                  aria-label={t(`steps.${step.key}.title`)}
                  onClick={() => selectStation(index)}
                >
                  <span className="absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-gold px-0.5 font-data text-[0.65rem] font-extrabold text-brand-navy-dark">
                    {completed ? "✓" : index + 1}
                  </span>
                  <span style={{ color }}>
                    <Icon className="h-5 w-5" />
                  </span>
                </button>

                <div className="overflow-hidden rounded-[22px] bg-white ring-1 ring-brand-navy/10">
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-inset"
                    aria-expanded={expanded}
                    aria-controls={itemPanelId}
                    onClick={() => selectStation(index)}
                  >
                    <span className="text-base font-extrabold text-brand-navy-dark">
                      {t(`steps.${step.key}.title`)}
                    </span>
                    <span aria-hidden="true" className="text-brand-navy/45">
                      {expanded ? "−" : "+"}
                    </span>
                  </button>
                  <div id={itemPanelId} hidden={!expanded} className="border-t border-brand-navy/8 px-4 pb-4 pt-3">
                    <p className="font-body text-base font-medium leading-[1.8] text-[#3A5270]">
                      {t(`steps.${step.key}.body`)}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function pointOnPath(t: number): { x: number; y: number } {
  const samples = [
    { x: 70, y: 118 },
    { x: 220, y: 70 },
    { x: 350, y: 120 },
    { x: 500, y: 88 },
    { x: 650, y: 55 },
    { x: 800, y: 70 },
    { x: 930, y: 108 },
  ];
  const scaled = t * (samples.length - 1);
  const i = Math.min(samples.length - 2, Math.floor(scaled));
  const f = scaled - i;
  return {
    x: samples[i].x + (samples[i + 1].x - samples[i].x) * f,
    y: samples[i].y + (samples[i + 1].y - samples[i].y) * f,
  };
}
