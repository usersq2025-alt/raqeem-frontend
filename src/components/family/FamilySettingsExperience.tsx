"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { getParentAccount, type ParentAccount } from "@/lib/api/parentAccount";
import { getChildren, type ChildProfile } from "@/lib/api/children";
import { logout } from "@/lib/api/auth";
import {
  applyExperiencePrefs,
  readExperiencePrefs,
  type ExperiencePrefs,
} from "@/lib/experiencePrefs";
import {
  getChildLearningSummary,
  type ChildLearningSummary,
} from "@/lib/api/parentSummary";
import { AccountSection } from "./settings/AccountSection";
import { ChildrenSection } from "./settings/ChildrenSection";
import { LearningSection } from "./settings/LearningSection";
import { ReportsSection } from "./settings/ReportsSection";
import { AlertsSection } from "./settings/AlertsSection";
import { AppearanceSection } from "./settings/AppearanceSection";
import { SecuritySection } from "./settings/SecuritySection";
import { HelpSection } from "./settings/HelpSection";

type SectionId =
  | "account"
  | "children"
  | "learning"
  | "reports"
  | "alerts"
  | "appearance"
  | "security"
  | "help";

const SECTIONS: SectionId[] = [
  "account",
  "children",
  "learning",
  "reports",
  "alerts",
  "appearance",
  "security",
  "help",
];

type Seed = { id: number; fullName: string; email: string | null };

type Props = { seed: Seed };

export function FamilySettingsExperience({ seed }: Props) {
  const t = useTranslations("familySettings");
  const router = useRouter();
  const [section, setSection] = useState<SectionId | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [account, setAccount] = useState<ParentAccount | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [accountError, setAccountError] = useState(false);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(true);
  const [childrenError, setChildrenError] = useState(false);
  const [flash, setFlash] = useState("");
  const [prefs, setPrefs] = useState<ExperiencePrefs>(() => readExperiencePrefs());
  const [childSummaries, setChildSummaries] = useState<
    Record<number, { completedTotal: number; lastActivity: string | null }>
  >({});

  const active = section ?? "account";

  const loadAccount = useCallback(async () => {
    setAccountLoading(true);
    setAccountError(false);
    try {
      const next = await getParentAccount();
      setAccount(next);
    } catch {
      if (seed.fullName || seed.email) {
        setAccount({
          id: seed.id,
          fullName: seed.fullName,
          email: seed.email,
          phone: null,
          phoneCountryCode: null,
          preferredLocale: null,
          emailVerifiedAt: null,
          createdAt: null,
          pinSet: false,
          guardianUnlocked: true,
        });
        setAccountError(false);
      } else {
        setAccount(null);
        setAccountError(true);
      }
    } finally {
      setAccountLoading(false);
    }
  }, [seed]);

  const loadChildren = useCallback(async () => {
    setChildrenLoading(true);
    setChildrenError(false);
    try {
      const list = await getChildren();
      setChildren(list);
    } catch {
      setChildrenError(true);
    } finally {
      setChildrenLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccount();
    void loadChildren();
  }, [loadAccount, loadChildren]);

  useEffect(() => {
    if (!children.length) return;
    let cancelled = false;
    void Promise.all(
      children.map(async (child) => {
        try {
          const summary = await getChildLearningSummary(child.id);
          if (cancelled) return;
          setChildSummaries((current) => ({
            ...current,
            [child.id]: {
              completedTotal: summary.completedLessonsTotal,
              lastActivity: summary.lastActivityDate,
            },
          }));
        } catch {
          /* keep card without optional progress lines */
        }
      })
    );
    return () => {
      cancelled = true;
    };
  }, [children]);

  useEffect(() => {
    applyExperiencePrefs(prefs);
  }, [prefs]);

  function showSaved(message?: string) {
    setFlash(message ?? t("savedChanges"));
    window.setTimeout(() => setFlash(""), 1800);
  }

  function openSection(id: SectionId) {
    setSection(id);
    setMobileDetail(true);
  }

  const onSummaryLoaded = useCallback((studentId: number, summary: ChildLearningSummary) => {
    setChildSummaries((current) => ({
      ...current,
      [studentId]: {
        completedTotal: summary.completedLessonsTotal,
        lastActivity: summary.lastActivityDate,
      },
    }));
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#F3F6FA]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(248,200,48,0.06),transparent_40%)]" />
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-5 sm:px-6 md:py-8">
        <header className="flex items-center justify-between gap-3">
          <BrandLogo size="sm" />
          <Link
            href="/children"
            className="inline-flex min-h-11 items-center rounded-2xl bg-white px-4 text-sm font-extrabold text-text-navy shadow-sm ring-1 ring-brand-navy/10 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            {t("backToHub")}
          </Link>
        </header>

        <div className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_18px_40px_-28px_rgba(26,43,71,0.28)] sm:p-6">
          <h1 className="text-2xl font-extrabold text-text-navy md:text-[1.85rem]">{t("title")}</h1>
          <p className="mt-1.5 max-w-2xl text-sm font-medium leading-relaxed text-text-gray md:text-base">
            {t("subtitle")}
          </p>
          {flash ? (
            <p
              className="mt-3 rounded-2xl bg-[#E8F8F3] px-3 py-2 text-sm font-extrabold text-[#1A7A5C]"
              role="status"
            >
              {flash}
            </p>
          ) : null}

          <div className="mt-6 md:grid md:grid-cols-[15.5rem_minmax(0,1fr)] md:gap-6">
            <nav className={`${mobileDetail ? "hidden md:block" : "block"}`} aria-label={t("navAria")}>
              <ul className="space-y-1">
                {SECTIONS.map((id) => {
                  const selected = active === id;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        className={`flex min-h-11 w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
                          selected
                            ? "bg-[#FFF1E4] text-primary-orange"
                            : "text-text-navy hover:bg-neutral-50"
                        }`}
                        aria-current={selected ? "page" : undefined}
                        onClick={() => openSection(id)}
                      >
                        <SectionIcon id={id} active={selected} />
                        <span className="text-sm font-extrabold">{t(`sections.${id}`)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className={`${mobileDetail ? "block" : "hidden md:block"} min-w-0`}>
              <button
                type="button"
                className="mb-3 min-h-11 rounded-2xl bg-neutral-100 px-4 text-sm font-extrabold text-text-navy md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                onClick={() => setMobileDetail(false)}
              >
                {t("backToSections")}
              </button>

              {active === "account" ? (
                <AccountSection
                  account={account}
                  loading={accountLoading}
                  error={accountError}
                  onRetry={loadAccount}
                  onAccount={setAccount}
                  onSaved={showSaved}
                />
              ) : null}
              {active === "children" ? (
                <ChildrenSection
                  childrenList={children}
                  loading={childrenLoading}
                  error={childrenError}
                  onRetry={loadChildren}
                  onChildren={setChildren}
                  onSaved={showSaved}
                  summaries={childSummaries}
                />
              ) : null}
              {active === "learning" ? (
                <LearningSection
                  childrenList={children}
                  childrenLoading={childrenLoading}
                  childrenError={childrenError}
                  onRetryChildren={loadChildren}
                  onSaved={showSaved}
                  onSummaryLoaded={onSummaryLoaded}
                />
              ) : null}
              {active === "reports" ? (
                <ReportsSection
                  childrenList={children}
                  childrenLoading={childrenLoading}
                  childrenError={childrenError}
                  onRetryChildren={loadChildren}
                  onSummaryLoaded={onSummaryLoaded}
                />
              ) : null}
              {active === "alerts" ? <AlertsSection /> : null}
              {active === "appearance" ? (
                <AppearanceSection prefs={prefs} onPrefs={setPrefs} onSaved={showSaved} />
              ) : null}
              {active === "security" ? (
                <SecuritySection
                  account={account}
                  onAccount={setAccount}
                  onSaved={showSaved}
                  onLogout={async () => {
                    try {
                      await logout();
                    } catch {
                      /* leave */
                    }
                    router.replace("/login");
                  }}
                />
              ) : null}
              {active === "help" ? <HelpSection /> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionIcon({ id, active }: { id: SectionId; active: boolean }) {
  const stroke = active ? "#F48232" : "#5B6B82";
  const className = "h-5 w-5 shrink-0";
  if (id === "account") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <circle cx="12" cy="8" r="3.2" stroke={stroke} strokeWidth="1.8" />
        <path
          d="M5.5 18.5c1.8-3 4-4.5 6.5-4.5s4.7 1.5 6.5 4.5"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (id === "children") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <circle cx="8.5" cy="9" r="2.5" stroke={stroke} strokeWidth="1.8" />
        <circle cx="15.5" cy="9" r="2.5" stroke={stroke} strokeWidth="1.8" />
        <path
          d="M4.5 18c.8-2.2 2.2-3.3 4-3.3s3.2 1.1 4 3.3M11.5 18c.8-2.2 2.2-3.3 4-3.3s3.2 1.1 4 3.3"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (id === "learning") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <path
          d="M5 7.5h10.5A2.5 2.5 0 0 1 18 10v8.5H7.5A2.5 2.5 0 0 1 5 16V7.5Z"
          stroke={stroke}
          strokeWidth="1.8"
        />
        <path d="M5 7.5A2.5 2.5 0 0 1 7.5 5H18" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "reports") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <path d="M6 18V10M11 18V7M16 18v-5" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "alerts") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <path
          d="M12 4.5a5.5 5.5 0 0 1 5.5 5.5v2.2l1.2 2.8H5.3L6.5 12.2V10A5.5 5.5 0 0 1 12 4.5Z"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M10 18.2a2 2 0 0 0 4 0" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "appearance") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="3" stroke={stroke} strokeWidth="1.8" />
        <path
          d="M12 4.5v1.6M12 17.9v1.6M4.5 12h1.6M17.9 12h1.6"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (id === "security") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <path d="M7 10.5V8.2a5 5 0 0 1 10 0v2.3" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
        <rect x="5.5" y="10.5" width="13" height="9" rx="2.2" stroke={stroke} strokeWidth="1.8" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="7.2" stroke={stroke} strokeWidth="1.8" />
      <path d="M12 8.2v4.2M12 15.6h.01" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
