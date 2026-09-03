"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { FieldInput, MailIcon, UserIcon, WarningIcon } from "@/components/ui/FieldInput";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { AuthApiError, registerUser } from "@/lib/api/auth";
import { DEFAULT_PHONE_COUNTRY } from "@/config/phone";
import { createRegisterSchema } from "@/lib/validation/registerSchema";

type FieldErrors = Partial<
  Record<"fullName" | "email" | "password" | "confirmPassword" | "phone" | "terms", string>
>;

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
      confirmRequired: t("errors.confirmRequired"),
      confirmMismatch: t("errors.confirmMismatch"),
      termsRequired: t("errors.termsRequired"),
      phoneInvalid: t("errors.phoneInvalid"),
    }),
    [t]
  );

  const schema = useMemo(
    () => createRegisterSchema(schemaMessages),
    [schemaMessages]
  );

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneCountry, setPhoneCountry] = useState(DEFAULT_PHONE_COUNTRY);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");

  const formValues = {
    fullName,
    email,
    password,
    confirmPassword,
    phoneCountry,
    phoneNumber,
    acceptedTerms,
  };
  const schemaValid = schema.safeParse(formValues).success;
  const canSubmit = schemaValid && !emailTaken;

  function handleConfirmChange(value: string) {
    setConfirmPassword(value);
    setErrors((current) => ({
      ...current,
      confirmPassword:
        value && value !== password ? t("errors.confirmMismatch") : undefined,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");

    const parsed = schema.safeParse(formValues);

    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "fullName") next.fullName = issue.message;
        if (key === "email") next.email = issue.message;
        if (key === "password") next.password = issue.message;
        if (key === "confirmPassword") next.confirmPassword = issue.message;
        if (key === "phoneNumber") next.phone = issue.message;
        if (key === "acceptedTerms") next.terms = issue.message;
      }
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      const phone = parsed.data.phoneNumber
        ? `${parsed.data.phoneCountry}${parsed.data.phoneNumber.replace(/\s+/g, "")}`
        : undefined;

      const result = await registerUser({
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        password: parsed.data.password,
        phone,
      });

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
    <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-text-gray">
          {t("fields.fullName")}
        </label>
        <FieldInput
          id="fullName"
          name="fullName"
          autoComplete="name"
          value={fullName}
          placeholder={t("placeholders.fullName")}
          invalid={Boolean(errors.fullName)}
          aria-describedby={errors.fullName ? "fullName-error" : undefined}
          icon={<UserIcon />}
          onChange={(event) => {
            setFullName(event.target.value);
            setErrors((current) => ({ ...current, fullName: undefined }));
          }}
        />
        {errors.fullName ? (
          <p id="fullName-error" className="mt-1 text-xs text-red-500">
            {errors.fullName}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-gray">
          {t("fields.email")}
        </label>
        <FieldInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          placeholder={t("placeholders.email")}
          invalid={emailTaken || Boolean(errors.email)}
          icon={<MailIcon />}
          aria-describedby={
            emailTaken ? "email-taken" : errors.email ? "email-error" : undefined
          }
          onChange={(event) => {
            setEmail(event.target.value);
            setEmailTaken(false);
            setErrors((current) => ({ ...current, email: undefined }));
          }}
        />
        {errors.email && !emailTaken ? (
          <p id="email-error" className="mt-1 text-xs text-red-500">
            {errors.email}
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
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-gray">
          {t("fields.password")}
        </label>
        <PasswordInput
          id="password"
          name="password"
          value={password}
          placeholder={t("placeholders.password")}
          invalid={Boolean(errors.password)}
          showStrength
          describedBy={
            [
              errors.password ? "password-error" : null,
              password ? "password-strength" : null,
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
          onChange={(value) => {
            setPassword(value);
            setErrors((current) => ({ ...current, password: undefined }));
            if (confirmPassword) {
              setErrors((current) => ({
                ...current,
                confirmPassword:
                  value !== confirmPassword ? t("errors.confirmMismatch") : undefined,
              }));
            }
          }}
        />
        {errors.password ? (
          <p id="password-error" className="mt-1 text-xs text-red-500">
            {errors.password}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-text-gray">
          {t("fields.confirmPassword")}
        </label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          value={confirmPassword}
          placeholder={t("placeholders.confirmPassword")}
          invalid={Boolean(errors.confirmPassword)}
          describedBy={errors.confirmPassword ? "confirmPassword-error" : undefined}
          onChange={handleConfirmChange}
        />
        {errors.confirmPassword ? (
          <p id="confirmPassword-error" className="mt-1 text-xs text-red-500">
            {errors.confirmPassword}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-text-gray">
          {t("fields.phone")}
        </label>
        <PhoneInput
          id="phone"
          country={phoneCountry}
          number={phoneNumber}
          placeholder={t("placeholders.phone")}
          countryLabel={t("fields.countryCode")}
          invalid={Boolean(errors.phone)}
          describedBy={errors.phone ? "phone-error" : undefined}
          onCountryChange={setPhoneCountry}
          onNumberChange={(value) => {
            setPhoneNumber(value);
            setErrors((current) => ({ ...current, phone: undefined }));
          }}
        />
        {errors.phone ? (
          <p id="phone-error" className="mt-1 text-xs text-red-500">
            {errors.phone}
          </p>
        ) : null}
      </div>

      <label className="flex items-start gap-3 text-sm text-text-navy">
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

      <Button
        type="submit"
        variant="primary"
        fullWidth
        disabled={!canSubmit || submitting}
        aria-busy={submitting}
      >
        {submitting ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            {t("submitting")}
          </>
        ) : (
          t("submit")
        )}
      </Button>
    </form>
  );
}
