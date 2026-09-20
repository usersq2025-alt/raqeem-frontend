"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { BrandPageDecor } from "@/components/BrandPageDecor";
import { BrandLogo } from "@/components/BrandLogo";
import {
  changeParentPassword,
  getParentAccount,
  GuardianApiError,
  setGuardianPin,
  updateChildProfile,
  updateParentAccount,
  updateWeeklyGoal,
  type ParentAccount,
} from "@/lib/api/guardian";
import { getChildren, hasChosenProfession, type ChildProfile } from "@/lib/api/children";
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

export function FamilySettingsExperience() {
  const t = useTranslations("familySettings");
  const router = useRouter();
  const [section, setSection] = useState<SectionId | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [account, setAccount] = useState<ParentAccount | null>(null);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [flash, setFlash] = useState("");
  const [prefs, setPrefs] = useState<ExperiencePrefs>(() => readExperiencePrefs());

  const active = section ?? "account";

  useEffect(() => {
    let cancelled = false;
    Promise.all([getParentAccount(), getChildren()])
      .then(([acc, kids]) => {
        if (cancelled) return;
        setAccount(acc);
        setChildren(kids);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    applyExperiencePrefs(prefs);
  }, [prefs]);

  function showSaved(message?: string) {
    setFlash(message ?? t("saved"));
    window.setTimeout(() => setFlash(""), 1800);
  }

  function openSection(id: SectionId) {
    setSection(id);
    setMobileDetail(true);
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#F3F6FA]">
      <BrandPageDecor density="compact" />
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-5 sm:px-6 md:py-8">
        <header className="flex items-center justify-between gap-3">
          <BrandLogo size="sm" />
          <Link
            href="/children"
            className="min-h-11 rounded-2xl bg-white px-4 text-sm font-extrabold text-text-navy shadow-sm ring-1 ring-brand-navy/10"
          >
            {t("backToHub")}
          </Link>
        </header>

        <div className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_18px_40px_-28px_rgba(26,43,71,0.4)] sm:p-6">
          <h1 className="text-2xl font-extrabold text-text-navy md:text-[1.85rem]">{t("title")}</h1>
          <p className="mt-1.5 max-w-2xl text-sm font-medium leading-relaxed text-text-gray md:text-base">
            {t("subtitle")}
          </p>
          {flash ? (
            <p className="mt-3 rounded-2xl bg-[#E8F8F3] px-3 py-2 text-sm font-extrabold text-[#1A7A5C]" role="status">
              {flash}
            </p>
          ) : null}
          {loadError ? <p className="mt-3 text-sm font-semibold text-red-600">{t("loadError")}</p> : null}

          <div className="mt-6 md:grid md:grid-cols-[16rem_minmax(0,1fr)] md:gap-6">
            <nav
              className={`${mobileDetail ? "hidden md:block" : "block"}`}
              aria-label={t("navAria")}
            >
              <ul className="space-y-1.5">
                {SECTIONS.map((id) => {
                  const selected = active === id;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        className={`flex min-h-11 w-full items-start gap-2 rounded-2xl px-3 py-2.5 text-start transition-colors ${
                          selected
                            ? "bg-[#FFF1E4] text-primary-orange"
                            : "text-text-navy hover:bg-neutral-50"
                        }`}
                        aria-current={selected ? "page" : undefined}
                        onClick={() => openSection(id)}
                      >
                        <span className="mt-0.5 text-base" aria-hidden="true">
                          {sectionIcon(id)}
                        </span>
                        <span>
                          <span className="block text-sm font-extrabold">{t(`sections.${id}`)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className={`${mobileDetail ? "block" : "hidden md:block"}`}>
              <button
                type="button"
                className="mb-3 min-h-11 rounded-2xl bg-neutral-100 px-4 text-sm font-extrabold text-text-navy md:hidden"
                onClick={() => setMobileDetail(false)}
              >
                {t("backToSections")}
              </button>
              <SectionPanel
                id={active}
                account={account}
                childrenList={children}
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
                    /* leave anyway */
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

function sectionIcon(id: SectionId) {
  const map: Record<SectionId, string> = {
    account: "👤",
    children: "🧒",
    learning: "📚",
    reports: "📊",
    alerts: "🔔",
    appearance: "✨",
    security: "🔒",
    help: "❓",
  };
  return map[id];
}

function SectionPanel({
  id,
  account,
  childrenList,
  prefs,
  onPrefs,
  onAccount,
  onChildren,
  onSaved,
  onLogout,
}: {
  id: SectionId;
  account: ParentAccount | null;
  childrenList: ChildProfile[];
  prefs: ExperiencePrefs;
  onPrefs: (p: ExperiencePrefs) => void;
  onAccount: (a: ParentAccount) => void;
  onChildren: (c: ChildProfile[]) => void;
  onSaved: () => void;
  onLogout: () => void;
}) {
  const t = useTranslations("familySettings");
  const tGrades = useTranslations("child.grades");
  const router = useRouter();
  const [name, setName] = useState(account?.full_name ?? "");
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
    setName(account?.full_name ?? "");
  }, [account?.full_name]);

  useEffect(() => {
    if (childrenList.length && learningChildId === null) {
      setLearningChildId(childrenList[0].id);
    }
  }, [childrenList, learningChildId]);

  const initial = useMemo(() => {
    const n = (account?.full_name ?? "?").trim();
    return n.charAt(0).toUpperCase() || "?";
  }, [account?.full_name]);

  if (id === "reports") {
    return (
      <ComingSoonPanel
        title={t("sections.reports")}
        body={t("comingSoon")}
        disclaimer={t("reportsDisclaimer")}
      />
    );
  }
  if (id === "alerts") {
    return (
      <ComingSoonPanel
        title={t("sections.alerts")}
        body={t("comingSoon")}
        disclaimer={t("alertsDisclaimer")}
      />
    );
  }

  if (id === "account") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#003890] text-xl font-black text-white">
            {initial}
          </span>
          <div>
            <p className="text-lg font-extrabold text-text-navy">{account?.full_name ?? "—"}</p>
            <p className="text-sm font-semibold text-text-gray">{account?.email ?? "—"}</p>
          </div>
        </div>
        {account?.phone ? (
          <p className="text-sm font-semibold text-text-gray">
            {account.phone_country_code ?? ""} {account.phone}
          </p>
        ) : null}
        {account?.created_at ? (
          <p className="text-xs font-semibold text-text-gray">
            {t("account.memberSince", { date: new Date(account.created_at).toLocaleDateString() })}
          </p>
        ) : null}
        <p className="rounded-2xl bg-[#FFF8F1] px-3 py-2 text-sm font-semibold text-text-navy">
          {t("account.emailGap")}
        </p>
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
          disabled={busy || !name.trim()}
          className="min-h-11 rounded-2xl bg-primary-orange px-5 text-sm font-extrabold text-white disabled:opacity-50"
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const next = await updateParentAccount({ full_name: name.trim() });
              onAccount(next);
              onSaved();
            } catch (caught) {
              const code = caught instanceof GuardianApiError ? caught.code : "ERROR";
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
                <span className="relative flex h-12 w-12 overflow-hidden rounded-full bg-white">
                  <Image src={avatar} alt="" width={48} height={48} unoptimized className="object-contain p-1" />
                </span>
                <div>
                  <p className="font-extrabold text-text-navy">{child.fullName}</p>
                  <p className="text-xs font-semibold text-text-gray">
                    {child.gradeId >= 1 && child.gradeId <= 6 ? tGrades(gradeKey) : ""}
                    {child.professionCode ? ` · ${child.professionCode}` : ""}
                  </p>
                  <p className="text-xs font-bold text-primary-orange">
                    {t("children.points", { count: child.pointsBalance })}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="min-h-11 rounded-2xl bg-white px-4 text-sm font-extrabold text-text-navy ring-1 ring-brand-navy/10"
                  onClick={() => {
                    setEditChild(child);
                    setEditName(child.fullName);
                    setEditGrade(child.gradeId);
                    setGradeConfirm(false);
                    setError("");
                  }}
                >
                  {t("children.edit")}
                </button>
                <button
                  type="button"
                  className="min-h-11 rounded-2xl bg-primary-orange px-4 text-sm font-extrabold text-white"
                  onClick={() => {
                    if (hasChosenProfession(child)) {
                      router.push(`/subjects?childId=${child.id}`);
                    } else {
                      router.push(`/career-selection?childId=${child.id}`);
                    }
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
          className="flex min-h-11 items-center justify-center rounded-2xl bg-[#FFF1E4] px-4 text-sm font-extrabold text-primary-orange"
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
                  disabled={
                    busy ||
                    !editName.trim() ||
                    (editGrade !== editChild.gradeId && !gradeConfirm)
                  }
                  className="min-h-11 flex-1 rounded-2xl bg-primary-orange font-extrabold text-white disabled:opacity-50"
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      await updateChildProfile(editChild.id, {
                        full_name: editName.trim(),
                        grade_id: editGrade ?? editChild.gradeId,
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
                      const code = caught instanceof GuardianApiError ? caught.code : "ERROR";
                      setError(
                        code === "GUARDIAN_LOCKED" ? t("errors.guardianLocked") : t("errors.saveFailed")
                      );
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
              className="min-h-11 rounded-2xl bg-neutral-50 text-sm font-extrabold text-text-navy disabled:opacity-50"
              onClick={async () => {
                if (!selected) return;
                setBusy(true);
                try {
                  await updateWeeklyGoal(selected.id, n);
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
              className="min-h-11 shrink-0 rounded-2xl bg-primary-orange px-3 text-sm font-extrabold text-white disabled:opacity-50"
              onClick={async () => {
                if (!selected) return;
                const n = Number(customGoal);
                if (!Number.isFinite(n) || n < 1 || n > 21) {
                  setError(t("learning.customInvalid"));
                  return;
                }
                setBusy(true);
                try {
                  await updateWeeklyGoal(selected.id, n);
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
        <p className="rounded-2xl bg-neutral-50 px-3 py-2 text-sm font-semibold text-text-gray">
          {t("appearance.noDark")}
        </p>
        <div>
          <p className="mb-2 text-sm font-extrabold text-text-navy">{t("appearance.locale")}</p>
          <LanguageSwitcher />
        </div>
        <fieldset>
          <legend className="text-sm font-extrabold text-text-navy">{t("appearance.textSize")}</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(["default", "large", "xlarge"] as TextSizePref[]).map((size) => (
              <button
                key={size}
                type="button"
                aria-pressed={prefs.textSize === size}
                className={`min-h-11 rounded-2xl text-sm font-extrabold ${
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
            className="mt-3 min-h-11 rounded-2xl bg-primary-orange px-4 text-sm font-extrabold text-white disabled:opacity-50"
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await changeParentPassword(pwCurrent, pwNew);
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
            className="mt-3 min-h-11 rounded-2xl bg-[#003890] px-4 text-sm font-extrabold text-white disabled:opacity-50"
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
        <button
          type="button"
          className="min-h-11 w-full rounded-2xl bg-red-50 px-4 text-sm font-extrabold text-red-600"
          onClick={onLogout}
        >
          {t("security.logout")}
        </button>
        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <HelpLink href="/contact" label={t("help.faq")} />
      <HelpLink href="/contact" label={t("help.points")} />
      <HelpLink href="/contact" label={t("help.hq")} />
      <HelpLink href="/contact" label={t("help.contact")} />
      <HelpLink href="/contact" label={t("help.report")} />
    </div>
  );
}

function ComingSoonPanel({ title, body, disclaimer }: { title: string; body: string; disclaimer: string }) {
  const t = useTranslations("familySettings");
  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-full bg-[#FFF1E4] px-3 py-1 text-xs font-extrabold text-primary-orange">
        {t("comingSoonBadge")}
      </div>
      <h3 className="text-lg font-extrabold text-text-navy">{title}</h3>
      <p className="text-sm font-medium leading-relaxed text-text-gray">{body}</p>
      <p className="rounded-2xl bg-neutral-50 px-3 py-2 text-sm font-semibold text-text-navy">{disclaimer}</p>
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
        className={`relative h-8 w-14 rounded-full ${checked ? "bg-primary-orange" : "bg-neutral-300"}`}
        onClick={() => onChange(!checked)}
      >
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white ${checked ? "start-7" : "start-1"}`} />
      </button>
    </div>
  );
}

function HelpLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex min-h-11 items-center rounded-2xl bg-neutral-50 px-4 text-sm font-extrabold text-text-navy">
      {label}
    </Link>
  );
}
