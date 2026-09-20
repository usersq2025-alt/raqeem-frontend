"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  LANDING_AI_REPORT_BULLETS,
  LANDING_AI_REPORT_PRIMARY,
  LANDING_AI_REVIEW_BULLETS,
  LANDING_AI_REVIEW_PRIMARY,
  LANDING_FAQ_KEYS,
  LANDING_FAQ_PRIMARY_COUNT,
  LANDING_MAX_WIDTH,
  LANDING_NAV,
  LANDING_PARENT_POINTS,
  LANDING_SAFETY_POINTS,
  LANDING_SHOTS,
  LANDING_SHOWCASE_TABS,
  LANDING_SUBJECTS,
  LANDING_VALUE_CARDS,
  RAQEEM_CONTACT_EMAIL,
} from "@/config/landing";
import { LandingCta } from "@/components/landing/LandingCta";
import { BeforeAfterCompare } from "@/components/landing/BeforeAfterCompare";
import { DreamPathJourney } from "@/components/landing/DreamPathJourney";
import {
  BookIcon,
  GiftIcon,
  LockIcon,
  ShieldIcon,
  SparkIcon,
  UsersIcon,
} from "@/components/landing/LandingIcons";
import { BrandLogo } from "@/components/BrandLogo";

const TINT = {
  teal: { wrap: "bg-brand-teal/12 text-brand-teal", ring: "ring-brand-teal/20" },
  coral: { wrap: "bg-brand-coral/12 text-brand-coral", ring: "ring-brand-coral/20" },
  purple: { wrap: "bg-brand-purple/12 text-brand-purple", ring: "ring-brand-purple/20" },
} as const;

function SectionShell({
  id,
  children,
  className,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={["relative z-10 scroll-mt-24 overflow-hidden py-9 sm:py-11 md:py-14", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={`mx-auto ${LANDING_MAX_WIDTH} px-5 sm:px-8 lg:px-10`}>{children}</div>
    </section>
  );
}

function SectionHeading({ title, body, light }: { title: string; body?: string; light?: boolean }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <h2
        className={[
          "text-[1.75rem] font-black leading-tight tracking-tight sm:text-[2rem] md:text-[2.2rem]",
          light ? "text-white" : "text-brand-navy-dark",
        ].join(" ")}
      >
        {title}
      </h2>
      {body ? (
        <p
          className={[
            "mx-auto mt-3 max-w-2xl font-body text-base font-medium leading-[1.8] sm:text-lg",
            light ? "text-white/90" : "text-[#334E6E]",
          ].join(" ")}
        >
          {body}
        </p>
      ) : null}
    </div>
  );
}

export function ValueCardsSection() {
  const t = useTranslations("welcome.value");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    function onScroll() {
      if (!el) return;
      const card = el.querySelector<HTMLElement>("[data-value-card]");
      if (!card) return;
      const index = Math.round(el.scrollLeft / (card.offsetWidth + 12));
      setActive(Math.max(0, Math.min(LANDING_VALUE_CARDS.length - 1, index)));
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  function scrollToIndex(index: number) {
    const el = scrollerRef.current;
    const card = el?.querySelectorAll<HTMLElement>("[data-value-card]")[index];
    card?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    setActive(index);
  }

  return (
    <SectionShell id="features" className="!py-7 sm:!py-9">
      <div className="mb-3 hidden items-center justify-end gap-2 md:flex" aria-hidden="true" />

      {/* Desktop: compact row */}
      <div className="hidden gap-4 sm:grid sm:grid-cols-3 sm:gap-4">
        {LANDING_VALUE_CARDS.map((card) => {
          const tint = TINT[card.tint];
          const Icon =
            card.key === "curriculum" ? BookIcon : card.key === "rewards" ? GiftIcon : UsersIcon;
          return (
            <article
              key={card.key}
              className={`landing-card rounded-[22px] bg-white p-4 ring-1 ${tint.ring} sm:p-5`}
            >
              <div className="flex items-center gap-3">
                <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tint.wrap}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-extrabold text-brand-navy-dark sm:text-xl">
                  {t(`${card.key}.title`)}
                </h3>
              </div>
              <p className="mt-2.5 font-body text-base font-medium leading-[1.75] text-[#334E6E]">
                {t(`${card.key}.body`)}
              </p>
            </article>
          );
        })}
      </div>

      {/* Mobile: horizontal snap */}
      <div className="sm:hidden">
        <div className="mb-2 flex items-center justify-between gap-2">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-navy ring-1 ring-brand-navy/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            aria-label={t("prev")}
            onClick={() => scrollToIndex(Math.max(0, active - 1))}
          >
            ‹
          </button>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-navy ring-1 ring-brand-navy/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            aria-label={t("next")}
            onClick={() => scrollToIndex(Math.min(LANDING_VALUE_CARDS.length - 1, active + 1))}
          >
            ›
          </button>
        </div>
        <div
          ref={scrollerRef}
          className="landing-value-snap -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2"
          tabIndex={0}
          aria-label={t("carouselLabel")}
        >
          {LANDING_VALUE_CARDS.map((card) => {
            const tint = TINT[card.tint];
            const Icon =
              card.key === "curriculum" ? BookIcon : card.key === "rewards" ? GiftIcon : UsersIcon;
            return (
              <article
                key={card.key}
                data-value-card
                className={`w-[82%] shrink-0 snap-start rounded-[22px] bg-white p-4 ring-1 ${tint.ring}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tint.wrap}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-lg font-extrabold text-brand-navy-dark">{t(`${card.key}.title`)}</h3>
                </div>
                <p className="mt-2.5 font-body text-base font-medium leading-[1.75] text-[#334E6E]">
                  {t(`${card.key}.body`)}
                </p>
              </article>
            );
          })}
        </div>
        <div className="mt-3 flex justify-center gap-2" role="tablist" aria-label={t("dotsLabel")}>
          {LANDING_VALUE_CARDS.map((card, index) => (
            <button
              key={card.key}
              type="button"
              role="tab"
              aria-selected={active === index}
              aria-label={`${index + 1}`}
              className={`h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
                active === index ? "w-6 bg-brand-navy" : "w-2.5 bg-brand-navy/25"
              }`}
              onClick={() => scrollToIndex(index)}
            />
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

export function HowItWorksSection() {
  return <DreamPathJourney />;
}

export function ProductJourneyShowcase() {
  const t = useTranslations("welcome.showcase");
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tab = LANDING_SHOWCASE_TABS[active] ?? LANDING_SHOWCASE_TABS[0];

  function onTabKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const dir = event.key === "ArrowLeft" ? 1 : -1; // RTL: left goes forward
      setActive((current) => (current + dir + LANDING_SHOWCASE_TABS.length) % LANDING_SHOWCASE_TABS.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(LANDING_SHOWCASE_TABS.length - 1);
    }
  }

  return (
    <SectionShell id="journey-showcase" className="landing-mesh-soft !py-9 sm:!py-11">
      <SectionHeading title={t("title")} body={t("body")} />

      {/* Mobile tabs */}
      <div className="mt-6 lg:hidden">
        <div
          role="tablist"
          aria-label={t("tabsLabel")}
          className="landing-value-snap -mx-1 flex gap-2 overflow-x-auto pb-2"
          onKeyDown={onTabKeyDown}
        >
          {LANDING_SHOWCASE_TABS.map((item, index) => {
            const selected = active === index;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                id={`${baseId}-tab-${item.key}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${item.key}`}
                tabIndex={selected ? 0 : -1}
                className={`min-h-11 shrink-0 rounded-full px-4 text-base font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
                  selected
                    ? "bg-brand-navy text-white"
                    : "bg-white text-[#334E6E] ring-1 ring-brand-navy/10"
                }`}
                onClick={() => setActive(index)}
              >
                {t(`tabs.${item.key}.label`)}
              </button>
            );
          })}
        </div>
        <div
          role="tabpanel"
          id={`${baseId}-panel-${tab.key}`}
          aria-labelledby={`${baseId}-tab-${tab.key}`}
          className="mt-4"
        >
          <ShowcasePanel tabKey={tab.key} />
        </div>
      </div>

      {/* Desktop accordion + sticky preview */}
      <div className="mt-8 hidden gap-8 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
        <div className="space-y-3">
          {LANDING_SHOWCASE_TABS.map((item, index) => {
            const expanded = active === index;
            const panelId = `${baseId}-desk-panel-${item.key}`;
            return (
              <div
                key={item.key}
                className={`rounded-[24px] bg-white ring-1 transition-shadow ${
                  expanded ? "ring-brand-navy/20 shadow-[0_14px_30px_-24px_rgba(0,56,144,0.45)]" : "ring-brand-navy/10"
                }`}
              >
                <button
                  type="button"
                  className="flex min-h-12 w-full items-center justify-between gap-3 px-5 py-4 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-inset"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => setActive(index)}
                >
                  <span className="text-lg font-extrabold text-brand-navy-dark">{t(`tabs.${item.key}.label`)}</span>
                  <span className="text-brand-navy/45" aria-hidden="true">
                    {expanded ? "−" : "+"}
                  </span>
                </button>
                <div id={panelId} hidden={!expanded} className="border-t border-brand-navy/8 px-5 pb-5 pt-3">
                  <h3 className="text-xl font-extrabold text-brand-navy-dark">{t(`tabs.${item.key}.title`)}</h3>
                  <p className="mt-2 font-body text-base font-medium leading-[1.8] text-[#334E6E]">
                    {t(`tabs.${item.key}.body`)}
                  </p>
                  <ShowcaseBullets tabKey={item.key} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="lg:sticky lg:top-28">
          <div className="overflow-hidden rounded-[28px] bg-white p-3 shadow-[0_16px_36px_-28px_rgba(0,56,144,0.4)] ring-1 ring-brand-navy/10">
            <div className="min-h-[280px]">
              <ShowcaseMedia tabKey={tab.key} />
            </div>
          </div>
          {tab.key === "build" ? (
            <p className="mt-3 text-center font-body text-base font-medium leading-[1.7] text-[#334E6E]">
              {t("tabs.build.caption")}
            </p>
          ) : null}
        </div>
      </div>
    </SectionShell>
  );
}

function ShowcaseBullets({ tabKey }: { tabKey: "progress" | "build" | "parent" }) {
  const t = useTranslations("welcome.showcase");
  if (tabKey === "progress") {
    return (
      <ul className="mt-4 space-y-2">
        {(["questions", "points", "progress"] as const).map((key) => (
          <li key={key} className="flex items-start gap-2 text-base font-bold text-brand-navy-dark">
            <span className="mt-0.5 text-brand-orange" aria-hidden="true">
              ✓
            </span>
            <span>{t(`tabs.progress.bullets.${key}`)}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (tabKey === "parent") {
    return (
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {LANDING_PARENT_POINTS.map((item) => (
          <li
            key={item.key}
            className="flex flex-wrap items-center gap-2 rounded-xl bg-brand-cream px-3 py-2.5 text-sm font-bold text-brand-navy-dark sm:text-base"
          >
            <span>{t(`tabs.parent.bullets.${item.key}`)}</span>
            {"badge" in item && item.badge ? (
              <span className="rounded-full bg-brand-gold/25 px-2 py-0.5 text-xs font-extrabold text-brand-orange">
                {t("soon")}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }
  return null;
}

function ShowcaseMedia({ tabKey }: { tabKey: "progress" | "build" | "parent" }) {
  const t = useTranslations("welcome.showcase");
  if (tabKey === "progress") {
    return (
      <div className="overflow-hidden rounded-[22px] bg-brand-cream">
        <Image
          src={LANDING_SHOTS.studentPath}
          alt={t("tabs.progress.imageAlt")}
          width={1200}
          height={960}
          className="h-auto w-full object-contain"
          sizes="(max-width: 1024px) 100vw, 560px"
          unoptimized
          priority
        />
      </div>
    );
  }
  if (tabKey === "build") {
    return (
      <BeforeAfterCompare
        beforeSrc={LANDING_SHOTS.hqBefore}
        afterSrc={LANDING_SHOTS.hqAfter}
        beforeAlt={t("tabs.build.beforeAlt")}
        afterAlt={t("tabs.build.afterAlt")}
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-[22px] bg-brand-cream">
      <Image
        src={LANDING_SHOTS.parentHub}
        alt={t("tabs.parent.imageAlt")}
        width={1200}
        height={960}
        className="h-auto w-full object-contain"
        sizes="(max-width: 1024px) 100vw, 560px"
        unoptimized
      />
    </div>
  );
}

function ShowcasePanel({ tabKey }: { tabKey: "progress" | "build" | "parent" }) {
  const t = useTranslations("welcome.showcase");
  return (
    <div className="rounded-[24px] bg-white p-4 ring-1 ring-brand-navy/10 sm:p-5">
      <h3 className="text-xl font-extrabold text-brand-navy-dark">{t(`tabs.${tabKey}.title`)}</h3>
      <p className="mt-2 font-body text-base font-medium leading-[1.8] text-[#334E6E]">
        {t(`tabs.${tabKey}.body`)}
      </p>
      <div className="mt-4 overflow-hidden rounded-[20px] bg-brand-cream p-2">
        <ShowcaseMedia tabKey={tabKey} />
      </div>
      <ShowcaseBullets tabKey={tabKey} />
      {tabKey === "build" ? (
        <p className="mt-3 font-body text-base font-medium leading-[1.7] text-[#334E6E]">{t("tabs.build.caption")}</p>
      ) : null}
    </div>
  );
}

/** @deprecated kept as no-op re-exports for any old imports */
export function StudentExperienceSection() {
  return null;
}
export function HeadquartersSection() {
  return null;
}
export function ParentSection() {
  return null;
}

export function SubjectsSection() {
  const t = useTranslations("welcome.subjects");

  return (
    <SectionShell id="subjects" className="bg-white/55 !py-8 sm:!py-10">
      <SectionHeading title={t("title")} body={t("note")} />
      <ul className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-3">
        {LANDING_SUBJECTS.map((subject, index) => (
          <li
            key={subject.key}
            className={`landing-card flex items-center gap-3 rounded-[18px] bg-white px-3 py-3 ring-1 ring-brand-navy/8 sm:flex-col sm:px-4 sm:py-4 sm:text-center ${
              index === LANDING_SUBJECTS.length - 1 ? "col-span-2 mx-auto w-full max-w-[calc(50%-0.3rem)] sm:col-span-1 sm:mx-0 sm:max-w-none" : ""
            }`}
          >
            <Image
              src={`/images/subjects/${subject.key}.png`}
              alt=""
              width={120}
              height={120}
              className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14"
            />
            <div className="min-w-0 flex-1 sm:flex-none">
              <p className="truncate text-base font-extrabold text-brand-navy-dark sm:whitespace-normal">
                {t(`items.${subject.key}`)}
              </p>
              <span className="mt-1 inline-flex rounded-full bg-brand-teal/15 px-2 py-0.5 text-xs font-extrabold text-brand-teal">
                {t("status.available")}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

export function SafetySection() {
  const t = useTranslations("welcome.safety");
  const [open, setOpen] = useState(true);
  const panelId = useId();

  return (
    <SectionShell className="!py-7 sm:!py-8">
      <div className="rounded-[24px] bg-white/95 px-5 py-5 ring-1 ring-brand-navy/8 sm:px-7 sm:py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
          <div className="flex items-start gap-3 md:max-w-md md:shrink-0">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-navy/8 text-brand-navy">
              <ShieldIcon className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-brand-navy-dark sm:text-[1.35rem]">{t("title")}</h2>
              <p className="mt-1.5 font-body text-base font-medium leading-[1.75] text-[#334E6E]">{t("body")}</p>
            </div>
          </div>

          <ul className="hidden flex-1 gap-3 md:grid md:grid-cols-3">
            {LANDING_SAFETY_POINTS.map((item) => (
              <li key={item.key} className="rounded-2xl bg-brand-cream px-3 py-3 text-sm font-bold leading-snug text-brand-navy-dark">
                <span className="mb-1.5 inline-flex text-brand-navy">
                  {item.key === "protection" ? <LockIcon className="h-4 w-4" /> : <ShieldIcon className="h-4 w-4" />}
                </span>
                <span className="block">{t(`points.${item.key}`)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-3 md:hidden">
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-between rounded-2xl bg-brand-cream px-4 py-3 text-start text-base font-extrabold text-brand-navy-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
          >
            {t("accordionTitle")}
            <span aria-hidden="true">{open ? "−" : "+"}</span>
          </button>
          <ul id={panelId} hidden={!open} className="mt-2 space-y-2">
            {LANDING_SAFETY_POINTS.map((item) => (
              <li key={item.key} className="rounded-xl bg-brand-cream/80 px-3 py-3 text-base font-bold text-brand-navy-dark">
                {t(`points.${item.key}`)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionShell>
  );
}

export function AiSection() {
  const t = useTranslations("welcome.ai");
  const [open, setOpen] = useState<"reports" | "review" | null>("reports");
  const [deskExtra, setDeskExtra] = useState<"reports" | "review" | null>(null);

  return (
    <SectionShell id="ai" className="bg-gradient-to-br from-[#003890] via-[#0848A8] to-[#4A3E9A] text-white !py-9 sm:!py-11">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-gold/40 bg-brand-gold/15 px-4 py-1.5 text-base font-extrabold text-brand-gold">
          <SparkIcon className="h-4 w-4" />
          {t("badge")}
        </span>
        <h2 className="mt-3 text-[1.75rem] font-black leading-tight sm:text-[2rem] md:text-[2.2rem]">{t("title")}</h2>
        <p className="mx-auto mt-3 max-w-2xl font-body text-base font-medium leading-[1.8] text-white/90 sm:text-lg">
          {t("body")}
        </p>
      </div>

      {/* Desktop */}
      <div className="mt-8 hidden gap-4 lg:grid lg:grid-cols-2">
        {(
          [
            { key: "reports" as const, bullets: LANDING_AI_REPORT_PRIMARY, all: LANDING_AI_REPORT_BULLETS },
            { key: "review" as const, bullets: LANDING_AI_REVIEW_PRIMARY, all: LANDING_AI_REVIEW_BULLETS },
          ] as const
        ).map((card) => {
          const expanded = deskExtra === card.key;
          return (
            <article
              key={card.key}
              className="rounded-[24px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm sm:p-6"
            >
              <p className="text-sm font-extrabold text-brand-gold">{t("badge")}</p>
              <h3 className="mt-1 text-xl font-extrabold text-white">{t(`${card.key}.title`)}</h3>
              <p className="mt-2 font-body text-base font-medium leading-[1.75] text-white/85">
                {t(`${card.key}.body`)}
              </p>
              <ul className="mt-4 space-y-2">
                {card.bullets.map((key) => (
                  <li key={key} className="flex items-start gap-2 text-base font-bold text-white/90">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" aria-hidden="true" />
                    <span>{t(`${card.key}.bullets.${key}`)}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="mt-4 min-h-11 text-base font-extrabold text-brand-gold underline decoration-brand-gold/50 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                aria-expanded={expanded}
                onClick={() => setDeskExtra(expanded ? null : card.key)}
              >
                {expanded ? t("showLess") : t("learnMore")}
              </button>
              {expanded ? (
                <ul className="mt-3 space-y-2 border-t border-white/15 pt-3">
                  {card.all
                    .filter((key) => !(card.bullets as readonly string[]).includes(key))
                    .map((key) => (
                      <li key={key} className="flex items-start gap-2 text-base font-bold text-white/90">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-teal" aria-hidden="true" />
                        <span>{t(`${card.key}.bullets.${key}`)}</span>
                      </li>
                    ))}
                </ul>
              ) : null}
            </article>
          );
        })}
      </div>

      {/* Mobile accordion */}
      <div className="mt-6 space-y-3 lg:hidden">
        {(["reports", "review"] as const).map((key) => {
          const expanded = open === key;
          const panelId = `ai-${key}`;
          return (
            <div key={key} className="rounded-[22px] border border-white/15 bg-white/10">
              <button
                type="button"
                className="flex min-h-12 w-full items-start justify-between gap-3 px-4 py-3.5 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-inset"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : key)}
              >
                <span>
                  <span className="block text-sm font-extrabold text-brand-gold">{t("badge")}</span>
                  <span className="mt-0.5 block text-lg font-extrabold text-white">{t(`${key}.title`)}</span>
                </span>
                <span aria-hidden="true">{expanded ? "−" : "+"}</span>
              </button>
              <div id={panelId} hidden={!expanded} className="border-t border-white/10 px-4 pb-4 pt-2">
                <p className="font-body text-base font-medium leading-[1.8] text-white/90">{t(`${key}.body`)}</p>
                <ul className="mt-3 space-y-2">
                  {(key === "reports" ? LANDING_AI_REPORT_BULLETS : LANDING_AI_REVIEW_BULLETS).map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2 text-base font-bold text-white/90">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" aria-hidden="true" />
                      <span>{t(`${key}.bullets.${bullet}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

export function FaqSection() {
  const t = useTranslations("welcome.faq");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? LANDING_FAQ_KEYS : LANDING_FAQ_KEYS.slice(0, LANDING_FAQ_PRIMARY_COUNT);

  return (
    <SectionShell id="faq" className="bg-white/55 !py-8 sm:!py-10">
      <SectionHeading title={t("title")} />
      <div className="mx-auto mt-6 max-w-3xl space-y-2.5">
        {visible.map((key) => {
          const expanded = openKey === key;
          const panelId = `faq-${key}`;
          return (
            <div
              key={key}
              className="landing-faq rounded-[18px] bg-white ring-1 ring-brand-navy/10 open:shadow-[0_12px_28px_-22px_rgba(0,56,144,0.35)]"
            >
              <button
                type="button"
                className="flex min-h-12 w-full items-center justify-between gap-4 px-4 py-3.5 text-start text-lg font-extrabold text-brand-navy-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-inset sm:px-5"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpenKey(expanded ? null : key)}
              >
                <span>{t(`items.${key}.q`)}</span>
                <span
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-cream text-brand-navy"
                  aria-hidden="true"
                >
                  {expanded ? "−" : "+"}
                </span>
              </button>
              <div
                id={panelId}
                hidden={!expanded}
                className="border-t border-brand-navy/8 px-4 pb-4 pt-2 font-body text-base font-medium leading-[1.8] text-[#334E6E] sm:px-5"
              >
                {t(`items.${key}.a`)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex justify-center">
        <button
          type="button"
          className="min-h-11 rounded-full bg-white px-5 text-base font-extrabold text-brand-navy ring-1 ring-brand-navy/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          onClick={() => setShowAll((value) => !value)}
        >
          {showAll ? t("showLess") : t("showAll")}
        </button>
      </div>
    </SectionShell>
  );
}

export function FinalCtaSection() {
  const t = useTranslations("welcome");

  return (
    <SectionShell className="!py-6 md:!py-8">
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-brand-navy-dark via-brand-navy to-brand-navy-light px-5 py-8 text-center sm:px-8 sm:py-10">
        <h2 className="relative text-[1.7rem] font-black leading-tight text-white sm:text-[2rem]">
          {t("finalCta.title")}
        </h2>
        <p className="relative mx-auto mt-3 max-w-xl font-body text-base font-medium leading-[1.75] text-brand-cream/95 sm:text-lg">
          {t("finalCta.body")}
        </p>
        <div className="relative mt-6 flex justify-center">
          <LandingCta href="/register">{t("ctaPrimary")}</LandingCta>
        </div>
      </div>
    </SectionShell>
  );
}

export function LandingFooter() {
  const t = useTranslations("welcome");
  const year = 2026;
  const [openGroup, setOpenGroup] = useState<"sections" | "account" | "legal" | null>(null);

  function FooterGroup({
    id,
    title,
    children,
  }: {
    id: "sections" | "account" | "legal";
    title: string;
    children: React.ReactNode;
  }) {
    const expanded = openGroup === id;
    const panelId = `footer-${id}`;
    return (
      <div className="border-b border-brand-navy/10 lg:border-none">
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-between py-3 text-start text-sm font-extrabold text-brand-navy-dark lg:pointer-events-none lg:cursor-default lg:py-0"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setOpenGroup(expanded ? null : id)}
        >
          {title}
          <span className="lg:hidden" aria-hidden="true">
            {expanded ? "−" : "+"}
          </span>
        </button>
        <div id={panelId} className={`${expanded ? "block" : "hidden"} pb-3 lg:block lg:pb-0`}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <footer className="border-t border-brand-navy/10 bg-white/70 pb-8 pt-8">
      <div
        className={`mx-auto grid ${LANDING_MAX_WIDTH} gap-6 px-5 sm:px-8 lg:grid-cols-[1.2fr_1fr_1fr_1fr] lg:gap-8 lg:px-10`}
      >
        <div>
          <BrandLogo size="sm" />
          <p className="mt-3 max-w-sm font-body text-base font-medium leading-[1.75] text-[#334E6E]">
            {t("footer.blurb")}
          </p>
          <a
            href={`mailto:${RAQEEM_CONTACT_EMAIL}`}
            className="mt-3 inline-flex text-base font-bold text-brand-navy underline decoration-brand-gold/70 underline-offset-4 hover:text-brand-navy-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            {RAQEEM_CONTACT_EMAIL}
          </a>
        </div>

        <FooterGroup id="sections" title={t("footer.sections")}>
          <ul className="space-y-2">
            {LANDING_NAV.map((item) =>
              item.href.startsWith("#") ? (
                <li key={item.id}>
                  <a
                    href={item.href}
                    className="inline-flex min-h-10 items-center text-sm font-bold text-[#334E6E] underline-offset-4 hover:text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                  >
                    {t(`nav.${item.id}`)}
                  </a>
                </li>
              ) : (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-10 items-center text-sm font-bold text-[#334E6E] underline-offset-4 hover:text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                  >
                    {t(`nav.${item.id}`)}
                  </Link>
                </li>
              )
            )}
          </ul>
        </FooterGroup>

        <FooterGroup id="account" title={t("footer.account")}>
          <ul className="space-y-2">
            <li>
              <Link
                href="/login"
                className="inline-flex min-h-10 items-center text-sm font-bold text-[#334E6E] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
              >
                {t("login")}
              </Link>
            </li>
            <li>
              <Link
                href="/register"
                className="inline-flex min-h-10 items-center text-sm font-bold text-[#334E6E] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
              >
                {t("register")}
              </Link>
            </li>
          </ul>
        </FooterGroup>

        <FooterGroup id="legal" title={t("footer.legal")}>
          <ul className="space-y-2">
            <li>
              <Link
                href="/privacy"
                className="inline-flex min-h-10 items-center text-sm font-bold text-[#334E6E] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
              >
                {t("footer.privacy")}
              </Link>
            </li>
            <li>
              <Link
                href="/terms"
                className="inline-flex min-h-10 items-center text-sm font-bold text-[#334E6E] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
              >
                {t("footer.terms")}
              </Link>
            </li>
          </ul>
        </FooterGroup>
      </div>
      <p
        className={`mx-auto mt-6 ${LANDING_MAX_WIDTH} px-5 font-body text-sm font-medium text-[#4A6078] sm:px-8 lg:px-10`}
      >
        {t("footer.rights", { year })}
      </p>
    </footer>
  );
}
