"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { FieldInput, UserIcon } from "@/components/ui/FieldInput";
import type { ChildProfile } from "@/lib/api/children";
import { GRADE_IDS } from "@/lib/config/grades";
import { updateChildProfile, isGuardianLockedError } from "@/lib/api/parentAccount";

type Props = {
  open: boolean;
  child: ChildProfile | null;
  onClose: () => void;
  onSaved: () => void;
  onGuardianRequired: () => void;
};

export function FamilyEditChildModal({ open, child, onClose, onSaved, onGuardianRequired }: Props) {
  const t = useTranslations("familySettings.children");
  const tGrades = useTranslations("child.grades");
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [fullName, setFullName] = useState("");
  const [gradeId, setGradeId] = useState<number>(1);
  const [gradeOpen, setGradeOpen] = useState(false);
  const [confirmGrade, setConfirmGrade] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [seedChildId, setSeedChildId] = useState<number | null>(null);

  if (open && child && child.id !== seedChildId) {
    setSeedChildId(child.id);
    setFullName(child.fullName);
    setGradeId(child.gradeId);
    setConfirmGrade(false);
    setError("");
  }
  if (!open && seedChildId !== null) {
    setSeedChildId(null);
  }

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, busy, onClose]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!child || busy) return;
    const trimmed = fullName.trim();
    if (trimmed.length < 2) {
      setError(t("nameError"));
      return;
    }
    const gradeChanged = gradeId !== child.gradeId;
    if (gradeChanged && !confirmGrade) {
      setError(t("confirmGradeRequired"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await updateChildProfile(child.id, {
        fullName: trimmed,
        ...(gradeChanged ? { gradeId } : {}),
      });
      onSaved();
      onClose();
    } catch (caught) {
      if (isGuardianLockedError(caught)) {
        onGuardianRequired();
        setError(t("guardianRequired"));
      } else {
        setError(t("saveError"));
      }
    } finally {
      setBusy(false);
    }
  }

  if (typeof document === "undefined" || !open || !child) return null;

  const gradeChanged = gradeId !== child.gradeId;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#1A2B47]/45 px-4 pb-8 pt-10 sm:items-center">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-[28px] bg-white px-5 pb-5 pt-6 shadow-[0_24px_50px_-24px_rgba(26,43,71,0.55)]"
      >
        <h2 id={titleId} className="text-lg font-extrabold text-text-navy">
          {t("editTitle", { name: child.fullName })}
        </h2>
        <form className="mt-4 space-y-3" onSubmit={handleSave}>
          <div>
            <label htmlFor="edit-child-name" className="mb-1.5 block text-sm font-bold text-text-navy">
              {t("nameLabel")}
            </label>
            <FieldInput
              id="edit-child-name"
              name="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              icon={<UserIcon />}
              disabled={busy}
            />
          </div>
          <div className="relative">
            <span className="mb-1.5 block text-sm font-bold text-text-navy">{t("gradeLabel")}</span>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 bg-white px-3 py-3 text-sm font-semibold text-text-navy"
              onClick={() => setGradeOpen((value) => !value)}
              disabled={busy}
            >
              {tGrades(String(gradeId))}
              <span aria-hidden="true">▾</span>
            </button>
            {gradeOpen ? (
              <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-2xl border border-neutral-100 bg-white py-1 shadow-lg">
                {GRADE_IDS.map((id) => (
                  <li key={id}>
                    <button
                      type="button"
                      className="flex w-full px-3 py-2 text-start text-sm font-semibold hover:bg-neutral-50"
                      onClick={() => {
                        setGradeId(id);
                        setGradeOpen(false);
                        setConfirmGrade(false);
                      }}
                    >
                      {tGrades(String(id))}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {gradeChanged ? (
            <label className="flex items-start gap-2 rounded-2xl bg-[#FFF8F1] px-3 py-2.5 text-sm font-semibold text-text-navy">
              <input
                type="checkbox"
                checked={confirmGrade}
                onChange={(event) => setConfirmGrade(event.target.checked)}
                className="mt-0.5"
              />
              {t("gradeChangeConfirm")}
            </label>
          ) : null}
          {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" disabled={busy} onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" className="flex-1" disabled={busy}>
              {busy ? t("saving") : t("save")}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
