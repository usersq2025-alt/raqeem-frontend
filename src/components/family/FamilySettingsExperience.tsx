"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { BrandLogo } from "@/components/BrandLogo";
import {
  changeParentPassword,
  getParentAccount,
  ParentAccountApiError,
  updateChildProfile,
  updateParentAccount,
  updateStudentWeeklyGoal,
  type ParentAccount,
} from "@/lib/api/parentAccount";
import { getChildren, hasChosenProfession, type ChildProfile } from "@/lib/api/children";
import { setGuardianPin } from "@/lib/api/guardian";
import { logout } from "@/lib/api/auth";
import { professionAvatarSrc } from "@/lib/config/professions";
import { GRADE_IDS } from "@/lib/config/grades";
import {
  applyExperiencePrefs,
  readExperiencePrefs,
  writeExperiencePrefs,
  type ExperiencePrefs,
  type TextSizePref,
} from "@/lib/experiencePrefs";

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

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#F3F6FA]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(248,200,48,0.08),transparent_42%)]" />
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-5 sm:px-6 md:py-8">
        <header className="flex items-center justify-between gap-3">
          <BrandLogo size="sm" />
          <Link
            href="/children"
            className="inline-flex min-h-11 items-center rounded-2xl bg-white px-4 text-sm font-extrabold text-text-navy shadow-sm ring-1 ring-brand-navy/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
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
            <p className="mt-3 rounded-2xl bg-[#E8F8F3] px-3 py-2 text-sm font-extrabold text-[#1A7A5C]" role="status">
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
              <SectionPanel
                id={active}
                account={account}
                accountLoading={accountLoading}
                accountError={accountError}
                onRetryAccount={loadAccount}
                childrenList={children}
                childrenLoading={childrenLoading}
                childrenError={childrenError}
                onRetryChildren={loadChildren}
                prefs={prefs}
                onPrefs={(next) => {
                  setPrefs(next);
                  writeExperiencePrefs(next);
                  applyExperiencePrefs(next);
                  showSaved();
                }}
                onAccount={setAccount}
                onChildren={setChildren}
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
        <path d="M5.5 18.5c1.8-3 4-4.5 6.5-4.5s4.7 1.5 6.5 4.5" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "children") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <circle cx="8.5" cy="9" r="2.5" stroke={stroke} strokeWidth="1.8" />
        <circle cx="15.5" cy="9" r="2.5" stroke={stroke} strokeWidth="1.8" />
        <path d="M4.5 18c.8-2.2 2.2-3.3 4-3.3s3.2 1.1 4 3.3M11.5 18c.8-2.2 2.2-3.3 4-3.3s3.2 1.1 4 3.3" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "learning") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <path d="M5 7.5h10.5A2.5 2.5 0 0 1 18 10v8.5H7.5A2.5 2.5 0 0 1 5 16V7.5Z" stroke={stroke} strokeWidth="1.8" />
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
        <path d="M12 4.5a5.5 5.5 0 0 1 5.5 5.5v2.2l1.2 2.8H5.3L6.5 12.2V10A5.5 5.5 0 0 1 12 4.5Z" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M10 18.2a2 2 0 0 0 4 0" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "appearance") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="3" stroke={stroke} strokeWidth="1.8" />
        <path d="M12 4.5v1.6M12 17.9v1.6M4.5 12h1.6M17.9 12h1.6" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
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

function SectionPanel(props: {
  id: SectionId;
  account: ParentAccount | null;
  accountLoading: boolean;
  accountError: boolean;
  onRetryAccount: () => void;
  childrenList: ChildProfile[];
  childrenLoading: boolean;
  childrenError: boolean;
  onRetryChildren: () => void;
  prefs: ExperiencePrefs;
  onPrefs: (p: ExperiencePrefs) => void;
  onAccount: (a: ParentAccount) => void;
  onChildren: (c: ChildProfile[]) => void;
  onSaved: (message?: string) => void;
  onLogout: () => void;
}) {
  const {
    id,
    account,
    accountLoading,
    accountError,
    onRetryAccount,
    childrenList,
    childrenLoading,
    childrenError,
    onRetryChildren,
    prefs,
    onPrefs,
    onAccount,
    onChildren,
    onSaved,
    onLogout,
  } = props;
  const t = useTranslations("familySettings");
  const tGrades = useTranslations("child.grades");
  const router = useRouter();
  const [name, setName] = useState(account?.fullName ?? "");
  const [learningChildId, setLearningChildId] = useState<number | null>(null);
  const [customGoal, setCustomGoal] = useState("5");
  const [editChild, setEditChild] = useState<ChildProfile | null>(null);
  const [editName, setEditName] = useState("");
  const [editGrade, setEditGrade] = useState<number | null>(null);
  const [gradeConfirm, setGradeConfirm] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pinPassword, setPinPassword] = useState("");
  const [pinValue, setPinValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(account?.fullName ?? "");
  }, [account?.fullName]);

  useEffect(() => {
    if (childrenList.length && learningChildId === null) {
      setLearningChildId(childrenList[0].id);
    }
  }, [childrenList, learningChildId]);

  const dirtyName = Boolean(account && name.trim() && name.trim() !== account.fullName);

  if (id === "reports" || id === "alerts") {
    return (
      <div className="rounded-[22px] bg-[#F8FAFC] p-5 ring-1 ring-brand-navy/8">
        <span className="inline-flex rounded-full bg-[#FFF1E4] px-3 py-1 text-xs font-extrabold text-primary-orange">
          {t("comingSoonBadge")}
        </span>
        <h3 className="mt-3 text-lg font-extrabold text-text-navy">
          {t(`sections.${id}`)}
        </h3>
        <p className="mt-2 text-sm font-medium leading-relaxed text-text-gray">{t("comingSoon")}</p>
        <p className="mt-3 text-sm font-semibold text-text-navy">
          {id === "reports" ? t("reportsDisclaimer") : t("alertsDisclaimer")}
        </p>
      </div>
    );
  }

  if (id === "account") {
    if (accountLoading) {
      return <SkeletonBlock rows={4} />;
    }
    if (accountError || !account) {
      return (
        <ErrorBlock
          message={t("loadError")}
          retryLabel={t("retry")}
          onRetry={onRetryAccount}
        />
      );
    }
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E8EEF7] ring-1 ring-brand-navy/10">
            <Image src="/images/brand/logo.png" alt="" width={44} height={44} className="object-contain p-1.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold text-text-navy">{account.fullName || t("account.unnamed")}</p>
            {account.email ? (
              <p className="truncate text-sm font-semibold text-text-gray">{account.email}</p>
            ) : (
              <p className="text-sm font-semibold text-text-gray">{t("account.noEmail")}</p>
            )}
          </div>
        </div>
        {account.phone ? (
          <p className="text-sm font-semibold text-text-gray">
            {account.phoneCountryCode ?? ""} {account.phone}
          </p>
        ) : null}
        {account.createdAt ? (
          <p className="text-xs font-semibold text-text-gray">
            {t("account.memberSince", { date: new Date(account.createdAt).toLocaleDateString() })}
          </p>
        ) : null}
        <p className="rounded-2xl bg-[#FFF8F1] px-3 py-2 text-sm font-semibold text-text-navy">{t("account.emailGap")}</p>
        <label className="block text-sm font-semibold text-text-gray" htmlFor="parent-name">
          {t("account.nameLabel")}
        </label>
        <input
          id="parent-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-h-11 w-full rounded-2xl border border-neutral-200 px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
        />
        <div>
          <p className="mb-2 text-sm font-semibold text-text-gray">{t("account.locale")}</p>
          <LanguageSwitcher />
        </div>
        <button
          type="button"
          disabled={busy || !dirtyName}
          className="min-h-11 rounded-2xl bg-primary-orange px-5 text-sm font-extrabold text-white disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const next = await updateParentAccount({ fullName: name.trim() });
              onAccount(next);
              onSaved();
            } catch (caught) {
              const code = caught instanceof ParentAccountApiError ? caught.code : "ERROR";
              setError(code === "GUARDIAN_LOCKED" ? t("errors.guardianLocked") : t("account.saveError"));
            } finally {
              setBusy(false);
            }
          }}
        >
          {t("account.saveName")}
        </button>
        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
      </div>
    );
  }

  if (id === "children") {
    if (childrenLoading) return <SkeletonBlock rows={3} />;
    if (childrenError) {
      return <ErrorBlock message={t("loadError")} retryLabel={t("retry")} onRetry={onRetryChildren} />;
    }
    if (!childrenList.length) {
      return (
        <div className="rounded-[22px] bg-neutral-50 p-5 text-center">
          <p className="text-sm font-extrabold text-text-navy">{t("children.empty")}</p>
          <Link
            href="/add-child"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary-orange px-4 text-sm font-extrabold text-white"
          >
            {t("children.add")}
          </Link>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {childrenList.map((child) => {
          const avatar =
            professionAvatarSrc(child.professionCode, child.gender) ?? "/images/brand/logo.png";
          const gradeKey = String(child.gradeId) as "1" | "2" | "3" | "4" | "5" | "6";
          return (
            <article
              key={child.id}
              className="flex flex-col gap-3 rounded-[22px] bg-neutral-50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="relative flex h-12 w-12 overflow-hidden rounded-full bg-white ring-1 ring-brand-navy/10">
                  <Image src={avatar} alt="" width={48} height={48} unoptimized className="object-contain p-1" />
                </span>
                <div>
                  <p className="font-extrabold text-text-navy">{child.fullName}</p>
                  <p className="text-xs font-semibold text-text-gray">
                    {child.gradeId >= 1 && child.gradeId <= 6 ? tGrades(gradeKey) : ""}
                    {hasChosenProfession(child) ? ` · ${child.professionCode}` : ` · ${t("children.noProfession")}`}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="min-h-11 rounded-2xl bg-white px-4 text-sm font-extrabold text-text-navy ring-1 ring-brand-navy/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                  onClick={() => {
                    setEditChild(child);
                    setEditName(child.fullName);
                    setEditGrade(child.gradeId);
                    setGradeConfirm(false);
                    setError("");
                  }}
                >
                  {t("children.manage")}
                </button>
                <button
                  type="button"
                  className="min-h-11 rounded-2xl bg-primary-orange px-4 text-sm font-extrabold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                  onClick={() => {
                    router.push(
                      hasChosenProfession(child)
                        ? `/subjects?childId=${child.id}`
                        : `/career-selection?childId=${child.id}`
                    );
                  }}
                >
                  {t("children.enter")}
                </button>
              </div>
            </article>
          );
        })}
        <Link
          href="/add-child"
          className="flex min-h-11 items-center justify-center rounded-2xl bg-[#FFF1E4] px-4 text-sm font-extrabold text-primary-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
        >
          {t("children.add")}
        </Link>

        {editChild ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
            <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-[28px] bg-white p-5">
              <h3 className="text-lg font-extrabold text-text-navy">{t("children.editTitle")}</h3>
              <label className="mt-3 block text-sm font-semibold" htmlFor="edit-child-name">
                {t("children.name")}
              </label>
              <input
                id="edit-child-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-2xl border border-neutral-200 px-3"
              />
              <label className="mt-3 block text-sm font-semibold" htmlFor="edit-child-grade">
                {t("children.grade")}
              </label>
              <select
                id="edit-child-grade"
                value={editGrade ?? ""}
                onChange={(e) => {
                  setEditGrade(Number(e.target.value));
                  setGradeConfirm(false);
                }}
                className="mt-1 min-h-11 w-full rounded-2xl border border-neutral-200 px-3"
              >
                {GRADE_IDS.map((g) => (
                  <option key={g} value={g}>
                    {tGrades(String(g) as "1")}
                  </option>
                ))}
              </select>
              {editGrade !== editChild.gradeId && !gradeConfirm ? (
                <div className="mt-3 rounded-2xl bg-[#FFF8F1] p-3 text-sm font-semibold text-text-navy">
                  <p>{t("children.gradeWarn")}</p>
                  <button
                    type="button"
                    className="mt-2 min-h-11 rounded-2xl bg-white px-3 font-extrabold ring-1 ring-brand-navy/10"
                    onClick={() => setGradeConfirm(true)}
                  >
                    {t("children.gradeConfirm")}
                  </button>
                </div>
              ) : null}
              {error ? <p className="mt-2 text-sm font-semibold text-red-600">{error}</p> : null}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  className="min-h-11 flex-1 rounded-2xl bg-neutral-100 font-extrabold"
                  onClick={() => setEditChild(null)}
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  disabled={busy || !editName.trim() || (editGrade !== editChild.gradeId && !gradeConfirm)}
                  className="min-h-11 flex-1 rounded-2xl bg-primary-orange font-extrabold text-white disabled:opacity-45"
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      await updateChildProfile(editChild.id, {
                        fullName: editName.trim(),
                        gradeId: editGrade ?? editChild.gradeId,
                      });
                      onChildren(
                        childrenList.map((c) =>
                          c.id === editChild.id
                            ? { ...c, fullName: editName.trim(), gradeId: editGrade ?? c.gradeId }
                            : c
                        )
                      );
                      setEditChild(null);
                      onSaved();
                    } catch (caught) {
                      const code = caught instanceof ParentAccountApiError ? caught.code : "ERROR";
                      setError(code === "GUARDIAN_LOCKED" ? t("errors.guardianLocked") : t("errors.saveFailed"));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {t("save")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (id === "learning") {
    if (childrenLoading) return <SkeletonBlock rows={3} />;
    if (childrenError) {
      return <ErrorBlock message={t("loadError")} retryLabel={t("retry")} onRetry={onRetryChildren} />;
    }
    if (!childrenList.length) {
      return <p className="text-sm font-semibold text-text-gray">{t("learning.needChild")}</p>;
    }
    const selected = childrenList.find((c) => c.id === learningChildId);
    return (
      <div className="space-y-4">
        <p className="text-sm font-medium text-text-gray">{t("learning.lead")}</p>
        <label className="block text-sm font-semibold" htmlFor="learning-child">
          {t("learning.pickChild")}
        </label>
        <select
          id="learning-child"
          value={learningChildId ?? ""}
          onChange={(e) => setLearningChildId(Number(e.target.value))}
          className="min-h-11 w-full rounded-2xl border border-neutral-200 px-3"
        >
          {childrenList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.fullName}
            </option>
          ))}
        </select>
        <p className="text-sm font-semibold text-text-navy">{t("learning.goalTitle")}</p>
        <p className="text-xs font-medium text-text-gray">{t("learning.goalHint")}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[3, 5, 7].map((n) => (
            <button
              key={n}
              type="button"
              disabled={!selected || busy}
              className="min-h-11 rounded-2xl bg-neutral-50 text-sm font-extrabold text-text-navy disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
              onClick={async () => {
                if (!selected) return;
                setBusy(true);
                setError("");
                try {
                  await updateStudentWeeklyGoal(selected.id, n);
                  onSaved();
                } catch {
                  setError(t("errors.saveFailed"));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t(`learning.presets.${n}`)}
            </button>
          ))}
          <div className="flex min-h-11 gap-1">
            <input
              aria-label={t("learning.custom")}
              inputMode="numeric"
              value={customGoal}
              onChange={(e) => setCustomGoal(e.target.value.replace(/\D/g, "").slice(0, 2))}
              className="min-h-11 w-full rounded-2xl border border-neutral-200 px-2 text-center text-sm font-extrabold"
            />
            <button
              type="button"
              disabled={!selected || busy || !customGoal}
              className="min-h-11 shrink-0 rounded-2xl bg-primary-orange px-3 text-sm font-extrabold text-white disabled:opacity-45"
              onClick={async () => {
                if (!selected) return;
                const n = Number(customGoal);
                if (!Number.isFinite(n) || n < 1 || n > 21) {
                  setError(t("learning.customInvalid"));
                  return;
                }
                setBusy(true);
                try {
                  await updateStudentWeeklyGoal(selected.id, n);
                  onSaved();
                } catch {
                  setError(t("errors.saveFailed"));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t("save")}
            </button>
          </div>
        </div>
        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
      </div>
    );
  }

  if (id === "appearance") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-text-gray">{t("appearance.lead")}</p>
        <p className="text-xs font-semibold text-text-gray">{t("appearance.deviceNote")}</p>
        <p className="rounded-2xl bg-neutral-50 px-3 py-2 text-sm font-semibold text-text-gray">{t("appearance.noDark")}</p>
        <div>
          <p className="mb-2 text-sm font-extrabold text-text-navy">{t("appearance.locale")}</p>
          <LanguageSwitcher />
        </div>
        <fieldset>
          <legend className="text-sm font-extrabold text-text-navy">{t("appearance.textSize")}</legend>
          <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("appearance.textSize")}>
            {(["default", "large", "xlarge"] as TextSizePref[]).map((size) => (
              <button
                key={size}
                type="button"
                role="radio"
                aria-checked={prefs.textSize === size}
                className={`min-h-11 rounded-2xl text-sm font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
                  prefs.textSize === size ? "bg-[#FFF1E4] text-primary-orange" : "bg-neutral-50"
                }`}
                onClick={() => onPrefs({ ...prefs, textSize: size })}
              >
                {t(`appearance.sizes.${size}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <Toggle
          label={t("appearance.contrast")}
          checked={prefs.contrast === "high"}
          onChange={(on) => onPrefs({ ...prefs, contrast: on ? "high" : "default" })}
        />
        <Toggle
          label={t("appearance.reduceMotion")}
          checked={prefs.reduceMotion}
          onChange={(reduceMotion) => onPrefs({ ...prefs, reduceMotion })}
        />
      </div>
    );
  }

  if (id === "security") {
    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-extrabold text-text-navy">{t("security.changePassword")}</h3>
          <label className="mt-2 block text-sm" htmlFor="cur-pw">
            {t("security.currentPassword")}
          </label>
          <PasswordInput id="cur-pw" name="current_password" placeholder="" value={pwCurrent} onChange={setPwCurrent} autoComplete="current-password" />
          <label className="mt-2 block text-sm" htmlFor="new-pw">
            {t("security.newPassword")}
          </label>
          <PasswordInput id="new-pw" name="new_password" placeholder="" value={pwNew} onChange={setPwNew} autoComplete="new-password" />
          <button
            type="button"
            disabled={busy || !pwCurrent || !pwNew}
            className="mt-3 min-h-11 rounded-2xl bg-primary-orange px-4 text-sm font-extrabold text-white disabled:opacity-45"
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await changeParentPassword({ currentPassword: pwCurrent, newPassword: pwNew });
                setPwCurrent("");
                setPwNew("");
                onSaved();
              } catch {
                setError(t("errors.saveFailed"));
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("security.updatePassword")}
          </button>
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-text-navy">{t("security.pinTitle")}</h3>
          <p className="mt-1 text-xs text-text-gray">{t("security.pinLead")}</p>
          <label className="mt-2 block text-sm" htmlFor="pin-pw">
            {t("security.currentPassword")}
          </label>
          <PasswordInput id="pin-pw" name="pin_password" placeholder="" value={pinPassword} onChange={setPinPassword} />
          <label className="mt-2 block text-sm" htmlFor="pin-val">
            {t("security.newPin")}
          </label>
          <input
            id="pin-val"
            inputMode="numeric"
            maxLength={6}
            value={pinValue}
            onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="mt-1 min-h-11 w-full rounded-2xl border border-neutral-200 px-3 tracking-widest"
          />
          <button
            type="button"
            disabled={busy || pinPassword.length < 1 || pinValue.length < 4}
            className="mt-3 min-h-11 rounded-2xl bg-[#003890] px-4 text-sm font-extrabold text-white disabled:opacity-45"
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await setGuardianPin(pinPassword, pinValue);
                setPinPassword("");
                setPinValue("");
                onSaved();
              } catch {
                setError(t("errors.saveFailed"));
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("security.savePin")}
          </button>
        </div>
        <p className="text-sm font-medium text-text-gray">{t("security.aiNote")}</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/privacy" className="min-h-11 rounded-2xl bg-neutral-50 px-4 text-sm font-extrabold leading-[2.75rem] text-text-navy">
            {t("security.privacy")}
          </Link>
          <Link href="/terms" className="min-h-11 rounded-2xl bg-neutral-50 px-4 text-sm font-extrabold leading-[2.75rem] text-text-navy">
            {t("security.terms")}
          </Link>
        </div>
        <button type="button" className="min-h-11 w-full rounded-2xl bg-red-50 px-4 text-sm font-extrabold text-red-600" onClick={onLogout}>
          {t("security.logout")}
        </button>
        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <HelpLink href="/family/help#faq" label={t("help.faq")} />
      <HelpLink href="/family/help#points" label={t("help.points")} />
      <HelpLink href="/family/help#hq" label={t("help.hq")} />
      <HelpLink href="/contact" label={t("help.contact")} />
      <HelpLink href="/contact" label={t("help.report")} />
    </div>
  );
}

function SkeletonBlock({ rows }: { rows: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-2xl bg-neutral-100" />
      ))}
    </div>
  );
}

function ErrorBlock({
  message,
  retryLabel,
  onRetry,
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-[22px] bg-red-50 p-4">
      <p className="text-sm font-semibold text-red-700">{message}</p>
      <button
        type="button"
        className="mt-3 min-h-11 rounded-2xl bg-white px-4 text-sm font-extrabold text-text-navy ring-1 ring-brand-navy/10"
        onClick={onRetry}
      >
        {retryLabel}
      </button>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 rounded-2xl bg-neutral-50 px-3">
      <span className="text-sm font-extrabold text-text-navy">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`relative h-8 w-14 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
          checked ? "bg-primary-orange" : "bg-neutral-300"
        }`}
        onClick={() => onChange(!checked)}
      >
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white ${checked ? "start-7" : "start-1"}`} />
      </button>
    </div>
  );
}

function HelpLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center rounded-2xl bg-neutral-50 px-4 text-sm font-extrabold text-text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
    >
      {label}
    </Link>
  );
}
