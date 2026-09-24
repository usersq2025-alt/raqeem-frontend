"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { hasChosenProfession, type ChildProfile } from "@/lib/api/children";
import { ParentAccountApiError, deleteChildProfile, updateChildProfile } from "@/lib/api/parentAccount";
import { lockGuardianMode } from "@/lib/api/guardian";
import { professionAvatarSrc } from "@/lib/config/professions";
import { GRADE_IDS } from "@/lib/config/grades";
import { CardShell, EmptyBlock, ErrorBlock, SectionIntro, SkeletonBlock } from "./SettingsUi";

type Props = {
  childrenList: ChildProfile[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onChildren: (c: ChildProfile[]) => void;
  onSaved: (message?: string) => void;
  summaries?: Record<number, { completedTotal: number; lastActivity: string | null }>;
};

export function ChildrenSection({
  childrenList,
  loading,
  error,
  onRetry,
  onChildren,
  onSaved,
  summaries = {},
}: Props) {
  const t = useTranslations("familySettings");
  const tGrades = useTranslations("child.grades");
  const locale = useLocale();
  const router = useRouter();
  const [editChild, setEditChild] = useState<ChildProfile | null>(null);
  const [deleteChild, setDeleteChild] = useState<ChildProfile | null>(null);
  const [deleteName, setDeleteName] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [editName, setEditName] = useState("");
  const [editGrade, setEditGrade] = useState<number | null>(null);
  const [gradeConfirm, setGradeConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [entryError, setEntryError] = useState<number | null>(null);

  if (loading) return <SkeletonBlock rows={4} />;
  if (error) {
    return <ErrorBlock message={t("loadError")} retryLabel={t("retry")} onRetry={onRetry} />;
  }

  if (!childrenList.length) {
    return (
      <div className="space-y-4">
        <SectionIntro title={t("children.panelTitle")} description={t("children.panelLead")} />
        <EmptyBlock
          title={t("children.emptyTitle")}
          body={t("children.emptyBody")}
          action={
            <Link
              href="/add-child"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary-orange px-5 text-sm font-extrabold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              {t("children.addFirst")}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionIntro title={t("children.panelTitle")} description={t("children.panelLead")} />

      {childrenList.map((child) => {
        const avatar =
          professionAvatarSrc(child.professionCode, child.gender) ?? "/images/brand/logo.png";
        const gradeKey = String(child.gradeId) as "1" | "2" | "3" | "4" | "5" | "6";
        const professionLabel = professionLabelFor(child, locale, t("children.noProfession"));
        const summary = summaries[child.id];
        const completed = summary?.completedTotal ?? null;
        const activity = activityLabel(summary?.lastActivity ?? child.lastActivityDate, t);

        return (
          <CardShell key={child.id}>
            <div className="flex items-start gap-3">
              <span className="relative flex h-14 w-14 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-brand-navy/10">
                <Image src={avatar} alt="" width={56} height={56} unoptimized className="object-contain p-1" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-extrabold text-text-navy">{child.fullName}</p>
                <p className="mt-0.5 text-sm font-semibold text-text-gray">
                  {child.gradeId >= 1 && child.gradeId <= 6 ? tGrades(gradeKey) : t("children.gradeUnknown")}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-text-gray">{professionLabel}</p>
                <ul className="mt-2 space-y-0.5 text-xs font-semibold text-text-gray">
                  <li>{t("children.points", { count: child.pointsBalance })}</li>
                  {completed != null ? <li>{t("children.completedLessons", { count: completed })}</li> : null}
                  <li>{activity}</li>
                </ul>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="min-h-11 rounded-2xl bg-primary-orange px-4 text-sm font-extrabold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                onClick={async () => {
                  setEntryError(null);
                  try {
                    await lockGuardianMode();
                  } catch {
                    setEntryError(child.id);
                    return;
                  }
                  router.push(
                    hasChosenProfession(child)
                      ? `/subjects?childId=${child.id}`
                      : `/career-selection?childId=${child.id}`
                  );
                }}
              >
                {t("children.openProfile")}
              </button>
              <button
                type="button"
                className="min-h-11 rounded-2xl bg-white px-4 text-sm font-extrabold text-text-navy ring-1 ring-brand-navy/10 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                onClick={() => {
                  setEditChild(child);
                  setEditName(child.fullName);
                  setEditGrade(child.gradeId);
                  setGradeConfirm(false);
                  setSaveError("");
                }}
              >
                {t("children.editData")}
              </button>
              <button
                type="button"
                className="min-h-11 rounded-2xl bg-white px-4 text-sm font-extrabold text-rose-700 ring-1 ring-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                onClick={() => { setDeleteChild(child); setDeleteName(""); setDeleteError(""); }}
              >
                {t("children.deleteAccount")}
              </button>
            </div>
            {entryError === child.id ? <p role="alert" className="mt-2 text-xs font-bold text-rose-700">{t("children.enterFailed")}</p> : null}
          </CardShell>
        );
      })}

      <Link
        href="/add-child"
        className="flex flex-col items-start gap-1 rounded-[22px] border border-dashed border-primary-orange/40 bg-[#FFF8F1] p-5 transition-colors hover:bg-[#FFF1E4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl font-black text-primary-orange ring-1 ring-primary-orange/20">
          +
        </span>
        <span className="mt-1 text-base font-extrabold text-text-navy">{t("children.addCardTitle")}</span>
        <span className="text-sm font-medium text-text-gray">{t("children.addCardBody")}</span>
        <span className="mt-2 inline-flex min-h-11 items-center rounded-2xl bg-primary-orange px-4 text-sm font-extrabold text-white">
          {t("children.add")}
        </span>
      </Link>

      {editChild ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-xl"
          >
            <h3 className="text-lg font-extrabold text-text-navy">{t("children.editTitle")}</h3>
            <label className="mt-3 block text-sm font-semibold" htmlFor="edit-child-name">
              {t("children.name")}
            </label>
            <input
              id="edit-child-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-2xl border border-neutral-200 px-3 outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
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
              className="mt-1 min-h-11 w-full rounded-2xl border border-neutral-200 px-3 outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              {GRADE_IDS.map((g) => (
                <option key={g} value={g}>
                  {tGrades(String(g) as "1")}
                </option>
              ))}
            </select>

            <p className="mt-3 rounded-2xl bg-neutral-50 px-3 py-2 text-xs font-semibold leading-relaxed text-text-gray">
              {t("children.avatarFollowsProfession")}
            </p>
            {hasChosenProfession(editChild) ? (
              <p className="mt-2 rounded-2xl bg-[#FFF8F1] px-3 py-2 text-xs font-semibold leading-relaxed text-text-navy">
                {t("children.professionLocked")}
              </p>
            ) : null}

            {editGrade !== editChild.gradeId ? (
              <div className="mt-3 rounded-2xl bg-[#FFF8F1] p-3 text-sm font-semibold text-text-navy">
                <p>{t("children.gradeWarn")}</p>
                {!gradeConfirm ? (
                  <button
                    type="button"
                    className="mt-2 min-h-11 rounded-2xl bg-white px-3 font-extrabold ring-1 ring-brand-navy/10"
                    onClick={() => setGradeConfirm(true)}
                  >
                    {t("children.gradeConfirm")}
                  </button>
                ) : (
                  <p className="mt-2 text-xs font-extrabold text-[#1A7A5C]">{t("children.gradeConfirmed")}</p>
                )}
              </div>
            ) : null}

            {saveError ? <p className="mt-2 text-sm font-semibold text-red-600">{saveError}</p> : null}

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
                className="min-h-11 flex-1 rounded-2xl bg-primary-orange font-extrabold text-white disabled:opacity-45"
                onClick={async () => {
                  setBusy(true);
                  setSaveError("");
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
                    onSaved(t("savedChanges"));
                  } catch (caught) {
                    const code = caught instanceof ParentAccountApiError ? caught.code : "ERROR";
                    setSaveError(
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
      {deleteChild ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-child-title" className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-xl">
            <h3 id="delete-child-title" className="text-lg font-extrabold text-rose-700">{t("children.deleteTitle", { name: deleteChild.fullName })}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-gray">{t("children.deleteWarning")}</p>
            <label htmlFor="delete-child-name" className="mt-4 block text-sm font-bold text-text-navy">{t("children.deleteConfirmName", { name: deleteChild.fullName })}</label>
            <input id="delete-child-name" value={deleteName} onChange={(event) => setDeleteName(event.target.value)} autoComplete="off"
              className="mt-2 min-h-11 w-full rounded-2xl border border-neutral-200 px-3 outline-none focus-visible:ring-2 focus-visible:ring-rose-400" />
            {deleteError ? <p role="alert" className="mt-2 text-sm font-bold text-rose-700">{deleteError}</p> : null}
            <div className="mt-5 flex gap-2">
              <button type="button" disabled={busy} onClick={() => setDeleteChild(null)} className="min-h-11 flex-1 rounded-2xl bg-neutral-100 font-extrabold disabled:opacity-50">{t("cancel")}</button>
              <button type="button" disabled={busy || deleteName.trim() !== deleteChild.fullName} className="min-h-11 flex-1 rounded-2xl bg-rose-700 font-extrabold text-white disabled:opacity-45"
                onClick={async () => {
                  setBusy(true);
                  setDeleteError("");
                  try {
                    await deleteChildProfile(deleteChild.id);
                    onChildren(childrenList.filter((child) => child.id !== deleteChild.id));
                    setDeleteChild(null);
                    onSaved(t("children.deleted"));
                  } catch (caught) {
                    const code = caught instanceof ParentAccountApiError ? caught.code : "ERROR";
                    setDeleteError(code === "GUARDIAN_LOCKED" ? t("errors.guardianLocked") : t("children.deleteFailed"));
                  } finally {
                    setBusy(false);
                  }
                }}>{t("children.deleteAccount")}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function professionLabelFor(child: ChildProfile, locale: string, fallback: string): string {
  if (!hasChosenProfession(child)) return fallback;
  if (locale.startsWith("ar") && child.professionNameAr) return child.professionNameAr;
  if (child.professionNameEn) return child.professionNameEn;
  if (child.professionNameAr) return child.professionNameAr;
  return child.professionCode ?? fallback;
}

function activityLabel(
  iso: string | null | undefined,
  t: ReturnType<typeof useTranslations<"familySettings">>
): string {
  if (!iso) return t("children.activityNever");
  const day = iso.slice(0, 10);
  const today = new Date();
  const local = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (day === local) return t("children.activityToday");
  return t("children.activityOn", { date: day });
}
