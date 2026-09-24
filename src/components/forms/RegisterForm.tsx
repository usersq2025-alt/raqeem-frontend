"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { RocketIcon } from "@/components/ui/Button";
import { FieldInput, MailIcon, UserIcon, WarningIcon } from "@/components/ui/FieldInput";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { AuthApiError, registerUser } from "@/lib/api/auth";
import {
  NAME_PATTERN,
  createRegisterSchema,
  isPasswordStrong,
  isValidEmail,
} from "@/lib/validation/registerSchema";
import {
  clearRegisterDraft,
  loadRegisterDraft,
  loadRegisterPasswordDraft,
  saveRegisterDraft,
  saveRegisterPasswordDraft,
} from "@/lib/registerDraft";

type FieldErrors = Partial<Record<"fullName" | "email" | "password" | "terms", string>>;

export function RegisterForm() {
  const t = useTranslations("register");
  const router = useRouter();

  const schemaMessages = useMemo(
    () => ({
      nameRequired: t("errors.nameRequired"),
      nameLetters: t("errors.nameLetters"),
      nameLength: t("errors.nameLength"),
      emailRequired: t("errors.emailRequired"),
      emailInvalid: t("errors.emailInvalid"),
      passwordRequired: t("errors.passwordRequired"),
      passwordRules: t("errors.passwordRules"),
      termsRequired: t("errors.termsRequired"),
    }),
    [t]
  );

  const schema = useMemo(() => createRegisterSchema(schemaMessages), [schemaMessages]);

  const [hydrated, setHydrated] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");

  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      const draft = loadRegisterDraft();
      if (draft) {
        setFullName(draft.fullName);
        setEmail(draft.email);
        setAcceptedTerms(draft.acceptedTerms);
        if (draft.email) setEmailTouched(true);
        if (draft.fullName) setNameTouched(true);
      }
      setPassword(loadRegisterPasswordDraft());
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveRegisterDraft({ fullName, email, acceptedTerms });
    saveRegisterPasswordDraft(password);
  }, [fullName, email, acceptedTerms, password, hydrated]);

  const formValues = { fullName, email, password, acceptedTerms };
  const schemaValid = schema.safeParse(formValues).success;
  const canSubmit = schemaValid && !emailTaken && !submitting;

  function liveNameError(): string | undefined {
    const value = fullName.trim();
    const inspect = nameTouched || value.length >= 3;
    if (!inspect) return undefined;
    if (!value) return nameTouched ? t("errors.nameRequired") : undefined;
    if (value.length < 3 || value.length > 60) return t("errors.nameLength");
    if (!NAME_PATTERN.test(value)) return t("errors.nameLetters");
    return undefined;
  }

  function liveEmailError(): string | undefined {
    const value = email.trim();
    const inspect = emailTouched || value.includes("@") || value.length >= 3;
    if (!inspect) return undefined;
    if (!value) return emailTouched ? t("errors.emailRequired") : undefined;
    if (!isValidEmail(value)) return t("errors.emailInvalid");
    return undefined;
  }

  const liveName = liveNameError();
  const liveEmail = liveEmailError();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");
    setEmailTouched(true);
    setNameTouched(true);

    const parsed = schema.safeParse(formValues);

    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "fullName") next.fullName = issue.message;
        if (key === "email") next.email = issue.message;
        if (key === "password") next.password = issue.message;
        if (key === "acceptedTerms") next.terms = issue.message;
      }
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      const result = await registerUser({
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        password: parsed.data.password,
      });
      clearRegisterDraft();
      router.push(
        `/verify-otp?parentId=${result.parentId}&email=${encodeURIComponent(parsed.data.email)}`
      );
    } catch (error) {
      if (error instanceof AuthApiError && error.code === "EMAIL_TAKEN") {
        setEmailTaken(true);
        return;
      }
      setFormError(t("errors.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-7 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="fullName" className="mb-1.5 block text-start text-sm font-semibold text-text-gray">
          {t("fields.fullName")}
        </label>
        <FieldInput
          id="fullName"
          name="fullName"
          variant="soft"
          autoComplete="name"
          value={fullName}
          placeholder={t("placeholders.fullName")}
          invalid={Boolean(errors.fullName || liveName)}
          aria-describedby={errors.fullName || liveName ? "fullName-error" : undefined}
          icon={<UserIcon />}
          onBlur={() => {
            setNameTouched(true);
          }}
          onChange={(event) => {
            setFullName(event.target.value);
            setErrors((current) => ({ ...current, fullName: undefined }));
          }}
        />
        {errors.fullName || liveName ? (
          <p id="fullName-error" className="mt-1 text-xs text-red-500">
            {errors.fullName ?? liveName}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-start text-sm font-semibold text-text-gray">
          {t("fields.email")}
        </label>
        <FieldInput
          id="email"
          name="email"
          variant="soft"
          type="email"
          autoComplete="email"
          inputMode="email"
          dir="ltr"
          lang="en"
          spellCheck={false}
          value={email}
          placeholder={t("placeholders.email")}
          invalid={emailTaken || Boolean(errors.email || liveEmail)}
          icon={<MailIcon />}
          aria-describedby={
            emailTaken ? "email-taken" : errors.email || liveEmail ? "email-error" : undefined
          }
          onBlur={() => {
            setEmailTouched(true);
          }}
          onChange={(event) => {
            setEmail(event.target.value);
            setEmailTaken(false);
            setErrors((current) => ({ ...current, email: undefined }));
          }}
        />
        {!emailTaken && (errors.email || liveEmail) ? (
          <p id="email-error" className="mt-1 text-xs text-red-500">
            {errors.email ?? liveEmail}
          </p>
        ) : null}
        {emailTaken ? (
          <div
            id="email-taken"
            role="alert"
            className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600"
          >
            <WarningIcon />
            <p className="flex-1">
              {t("errors.emailTaken")}{" "}
              <Link href="/login" className="font-semibold underline underline-offset-2">
                {t("errors.loginLink")}
              </Link>
            </p>
          </div>
        ) : null}
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-start text-sm font-semibold text-text-gray">
          {t("fields.password")}
        </label>
        <PasswordInput
          id="password"
          name="password"
          variant="soft"
          value={password}
          placeholder={t("placeholders.password")}
          invalid={Boolean(errors.password)}
          showStrength
          describedBy={
            [errors.password ? "password-error" : null, "password-strength"]
              .filter(Boolean)
              .join(" ") || undefined
          }
          onChange={(value) => {
            setPassword(value);
            setErrors((current) => ({
              ...current,
              password: isPasswordStrong(value) ? undefined : current.password,
            }));
          }}
        />
        {errors.password ? (
          <p id="password-error" className="mt-1 text-xs text-red-500">
            {errors.password}
          </p>
        ) : null}
      </div>

      <label className="flex cursor-pointer items-start gap-3 text-sm text-text-navy">
        <input
          id="acceptedTerms"
          type="checkbox"
          checked={acceptedTerms}
          aria-describedby={errors.terms ? "terms-error" : undefined}
          onChange={(event) => {
            setAcceptedTerms(event.target.checked);
            setErrors((current) => ({ ...current, terms: undefined }));
          }}
          className="peer sr-only"
        />
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-primary-orange peer-focus-visible:ring-2 peer-focus-visible:ring-primary-orange/40 peer-checked:bg-primary-orange">
          {acceptedTerms ? (
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
              <path
                d="M3.5 8.2 6.4 11l6.1-7"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </span>
        <span>
          {t.rich("terms", {
            terms: (chunks) => (
              <Link href="/terms" className="font-semibold text-primary-orange underline underline-offset-2">
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/privacy" className="font-semibold text-primary-orange underline underline-offset-2">
                {chunks}
              </Link>
            ),
          })}
        </span>
      </label>
      {errors.terms ? (
        <p id="terms-error" className="text-xs text-red-500">
          {errors.terms}
        </p>
      ) : null}
      {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

      <button type="submit" className="hero-cta register-submit mt-1" disabled={!canSubmit} aria-busy={submitting}>
        {submitting ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            {t("submitting")}
          </>
        ) : (
          <>
            <RocketIcon />
            <span>{t("submit")}</span>
          </>
        )}
      </button>

      <p className="pt-1 text-start text-sm font-medium text-text-gray">
        {t("haveAccount")}{" "}
        <Link
          href="/login"
          className="font-extrabold text-text-navy underline decoration-primary-orange/70 underline-offset-4 transition-colors hover:text-primary-orange"
        >
          {t("haveAccountLogin")}
        </Link>
      </p>
    </form>
  );
}
