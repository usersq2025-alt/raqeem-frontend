"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { FieldInput, UserIcon, WarningIcon } from "@/components/ui/FieldInput";
import { GenderSelector } from "@/components/ui/GenderSelector";
import { GRADE_IDS } from "@/lib/config/grades";
import { ChildrenApiError, createChild, type ChildGender } from "@/lib/api/children";
import { NAME_PATTERN } from "@/lib/validation/registerSchema";
import {
  birthDateInputBounds,
  createChildSchema,
} from "@/lib/validation/childSchema";

type FieldErrors = Partial<Record<"fullName" | "birthDate" | "gradeId" | "gender", string>>;

type Props = {
  onSaved: (firstName: string) => void;
};

function firstNameOf(fullName: string) {
  const token = fullName.trim().split(/\s+/)[0] ?? "";
  return token.length >= 2 && NAME_PATTERN.test(token) ? token : "";
}

export function AddChildForm({ onSaved }: Props) {
  const t = useTranslations("child");
  const nameId = useId();
  const dateId = useId();
  const gradeIdAttr = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const gradeWrapRef = useRef<HTMLDivElement>(null);

  const schemaMessages = useMemo(
    () => ({
      nameRequired: t("errors.nameRequired"),
      nameLetters: t("errors.nameLetters"),
      nameLength: t("errors.nameLength"),
      birthRequired: t("errors.birthRequired"),
      birthInvalid: t("errors.birthInvalid"),
      gradeRequired: t("errors.gradeRequired"),
      genderRequired: t("errors.genderRequired"),
    }),
    [t]
  );
  const schema = useMemo(() => createChildSchema(schemaMessages), [schemaMessages]);
  const dateBounds = useMemo(() => birthDateInputBounds(), []);

  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gradeId, setGradeId] = useState<number | null>(null);
  const [gender, setGender] = useState<ChildGender | null>(null);
  const [gradeOpen, setGradeOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const firstName = firstNameOf(fullName);

  const parsedPreview = schema.safeParse({
    fullName,
    birthDate,
    gradeId: gradeId ?? undefined,
    gender: gender ?? undefined,
  });
  const canSubmit = parsedPreview.success;

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!gradeOpen) return;

    function onPointer(event: PointerEvent) {
      if (!gradeWrapRef.current?.contains(event.target as Node)) {
        setGradeOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setGradeOpen(false);
    }
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [gradeOpen]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");

    const parsed = schema.safeParse({
      fullName,
      birthDate,
      gradeId: gradeId ?? undefined,
      gender: gender ?? undefined,
    });

    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "fullName") next.fullName = issue.message;
        if (key === "birthDate") next.birthDate = issue.message;
        if (key === "gradeId") next.gradeId = issue.message;
        if (key === "gender") next.gender = issue.message;
      }
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      await createChild({
        fullName: parsed.data.fullName,
        birthDate: parsed.data.birthDate,
        gradeId: parsed.data.gradeId,
        gender: parsed.data.gender,
      });
      onSaved(firstNameOf(parsed.data.fullName));
    } catch (error) {
      if (error instanceof ChildrenApiError && error.code === "UNAUTHENTICATED") {
        setFormError(t("errors.unauthenticated"));
        return;
      }
      setFormError(t("errors.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  const birthLabel = firstName ? t("fields.birthNamed", { name: firstName }) : t("fields.birthDate");
  const gradeLabel = firstName ? t("fields.gradeNamed", { name: firstName }) : t("fields.grade");
  const genderLabel = firstName ? t("fields.genderNamed", { name: firstName }) : t("fields.gender");
  const selectedGradeLabel = gradeId ? t(`grades.${gradeId}` as "grades.1") : null;

  return (
    <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <div className="child-stagger child-delay-0">
        <label htmlFor={nameId} className="mb-1.5 block text-sm font-medium text-text-gray">
          {t("fields.name")}
        </label>
        <FieldInput
          ref={nameRef}
          id={nameId}
          name="fullName"
          autoComplete="off"
          value={fullName}
          placeholder={t("placeholders.name")}
          invalid={Boolean(errors.fullName)}
          aria-describedby={errors.fullName ? `${nameId}-error` : undefined}
          icon={<UserIcon />}
          onChange={(event) => {
            setFullName(event.target.value);
            setErrors((current) => ({ ...current, fullName: undefined }));
          }}
        />
        {errors.fullName ? (
          <p id={`${nameId}-error`} className="mt-1 text-xs text-red-500">
            {errors.fullName}
          </p>
        ) : null}
      </div>

      <div className="child-stagger child-delay-1">
        <label htmlFor={dateId} className="mb-1.5 block text-sm font-medium text-text-gray">
          {birthLabel}
        </label>
        <DateField
          id={dateId}
          value={birthDate}
          min={dateBounds.min}
          max={dateBounds.max}
          placeholder={t("placeholders.birthDate")}
          invalid={Boolean(errors.birthDate)}
          onChange={(value) => {
            setBirthDate(value);
            setErrors((current) => ({ ...current, birthDate: undefined }));
          }}
        />
        {errors.birthDate ? (
          <p id={`${dateId}-error`} className="mt-1 text-xs text-red-500">
            {errors.birthDate}
          </p>
        ) : null}
      </div>

      <div className="child-stagger child-delay-2" ref={gradeWrapRef}>
        <p id={`${gradeIdAttr}-label`} className="mb-1.5 text-sm font-medium text-text-gray">
          {gradeLabel}
        </p>
        <button
          type="button"
          id={gradeIdAttr}
          aria-haspopup="listbox"
          aria-expanded={gradeOpen}
          aria-labelledby={`${gradeIdAttr}-label`}
          aria-invalid={Boolean(errors.gradeId) || undefined}
          onClick={() => setGradeOpen((open) => !open)}
          className={`flex w-full items-center justify-between rounded-xl border bg-white px-3 py-3 text-sm outline-none transition-[border-color,box-shadow] focus:border-primary-orange focus:ring-2 focus:ring-primary-orange/20 ${
            errors.gradeId ? "border-red-400" : "border-neutral-200"
          }`}
        >
          <span className="flex items-center gap-2.5">
            <GradeIcon />
            <span className={selectedGradeLabel ? "font-medium text-text-navy" : "text-neutral-400"}>
              {selectedGradeLabel ?? t("placeholders.grade")}
            </span>
          </span>
          <ChevronIcon open={gradeOpen} />
        </button>
        {gradeOpen ? (
          <ul
            role="listbox"
            aria-labelledby={`${gradeIdAttr}-label`}
            className="child-grade-menu mt-2 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-1 shadow-[0_16px_40px_-24px_rgba(26,43,71,0.45)]"
          >
            {GRADE_IDS.map((id) => {
              const selected = gradeId === id;
              return (
                <li key={id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      setGradeId(id);
                      setGradeOpen(false);
                      setErrors((current) => ({ ...current, gradeId: undefined }));
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors ${
                      selected
                        ? "bg-orange-50 font-bold text-primary-orange"
                        : "text-text-navy hover:bg-neutral-50"
                    }`}
                  >
                    {t(`grades.${id}` as "grades.1")}
                    {selected ? <CheckMini /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
        {errors.gradeId ? (
          <p className="mt-1 text-xs text-red-500">{errors.gradeId}</p>
        ) : null}
      </div>

      <div className="child-stagger child-delay-3">
        <p className="mb-1.5 text-sm font-medium text-text-gray">{genderLabel}</p>
        <GenderSelector
          value={gender}
          invalid={Boolean(errors.gender)}
          groupLabel={genderLabel}
          femaleLabel={t("gender.female")}
          maleLabel={t("gender.male")}
          femaleAlt={t("gender.femaleAlt")}
          maleAlt={t("gender.maleAlt")}
          onChange={(value) => {
            setGender(value);
            setErrors((current) => ({ ...current, gender: undefined }));
          }}
        />
        {errors.gender ? <p className="mt-1 text-xs text-red-500">{errors.gender}</p> : null}
      </div>

      {formError ? (
        <div role="alert" className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
          <WarningIcon />
          <p>{formError}</p>
        </div>
      ) : null}

      <div className="child-stagger child-delay-4 mt-1">
        <Button type="submit" variant="primary" fullWidth disabled={!canSubmit || submitting} aria-busy={submitting}>
          {submitting ? (
            <>
              <span className="otp-spinner" />
              {t("submitting")}
            </>
          ) : (
            t("submit")
          )}
        </Button>
      </div>
    </form>
  );
}

function DateField({
  id,
  value,
  min,
  max,
  placeholder,
  invalid,
  onChange,
}: {
  id: string;
  value: string;
  min: string;
  max: string;
  placeholder: string;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute start-3 top-1/2 z-[1] -translate-y-1/2 text-neutral-400">
        <CalendarIcon />
      </span>
      {!value ? (
        <span className="pointer-events-none absolute inset-y-0 start-11 z-[1] flex items-center text-sm text-neutral-400">
          {placeholder}
        </span>
      ) : null}
      <input
        id={id}
        type="date"
        name="birthDate"
        value={value}
        min={min}
        max={max}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`child-date-input w-full rounded-xl border bg-white py-3 ps-11 pe-3 text-sm outline-none transition-[border-color,box-shadow] focus:border-primary-orange focus:ring-2 focus:ring-primary-orange/20 ${
          value ? "text-text-navy" : "text-transparent"
        } ${invalid ? "border-red-400" : "border-neutral-200"}`}
      />
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <rect x="4.5" y="5.5" width="15" height="14" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 4v3M16 4v3M4.5 10h15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function GradeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-neutral-400" fill="none" aria-hidden="true">
      <path
        d="M4.5 17.5 12 20l7.5-2.5M4.5 13 12 15.5 19.5 13M12 4 4.5 7.5 12 11l7.5-3.5L12 4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 text-neutral-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      aria-hidden="true"
    >
      <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CheckMini() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 text-primary-orange" fill="none" aria-hidden="true">
      <path d="M3.5 8.2 6.4 11l6.1-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
