"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MethodChoice, MethodChoiceSkeleton } from "./MethodChoice";
import { SmsPhoneLoginForm } from "./SmsPhoneLoginForm";
import { Link, useRouter } from "@/i18n/navigation";
import { RocketIcon } from "@/components/ui/Button";
import { FieldInput, MailIcon, PhoneIcon, UserIcon, WarningIcon } from "@/components/ui/FieldInput";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { AuthApiError, fetchOtpChannels, registerUser, type OtpChannel } from "@/lib/api/auth";
import { formatDuration } from "@/lib/auth/phoneAuth";
import {
  NAME_PATTERN,
  createRegisterSchema,
  isPasswordStrong,
  isValidEmail,
} from "@/lib/validation/registerSchema";
import {
  clearRegisterDraft,
  loadRegisterDraft,
  loadAuthMethod,
  loadPhoneChallenge,
  loadRegisterPasswordDraft,
  saveAuthMethod,
  savePendingLogin,
  saveRegisterDraft,
  saveRegisterPasswordDraft,
} from "@/lib/registerDraft";

type FieldErrors = Partial<Record<"fullName" | "email" | "password" | "terms" | "phone", string>>;

/** Strips spaces/dashes; accepts +963… or 00963… and returns E.164, or null. */
function toE164(raw: string): string | null {
  let value = raw.replace(/[\s\-().]/g, "");
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  return /^\+[1-9]\d{7,14}$/.test(value) ? value : null;
}

export function RegisterForm({ onCodeStep }: { onCodeStep?: (active: boolean) => void }) {
  const t = useTranslations("phoneAuth");
  const [method, setMethod] = useState<"email" | "phone">("email");
  // null until the server says which methods exist; the space is held meanwhile.
  const [smsAvailable, setSmsAvailable] = useState<boolean | null>(null);
  const [phoneStep, setPhoneStep] = useState<1 | 2>(1);
  useEffect(() => {
    let active = true;
    void fetchOtpChannels().then((channels) => {
      if (!active) return;
      const sms = channels.sms === true;
      setMethod(sms ? (loadPhoneChallenge("register") ? "phone" : (loadAuthMethod() ?? "phone")) : "email");
      setSmsAvailable(sms);
    });
    return () => { active = false; };
  }, []);

  const phoneMode = method === "phone" && smsAvailable === true;
  const inCodeStep = phoneMode && phoneStep === 2;
  useEffect(() => { onCodeStep?.(inCodeStep); }, [inCodeStep, onCodeStep]);

  if (smsAvailable === null) return <MethodChoiceSkeleton tall />;

  return <>
    {smsAvailable && !(phoneMode && phoneStep === 2) ? (
      <MethodChoice
        legend={t("registerMethod.legend")}
        name="registerMethod"
        value={method}
        onChange={(next) => { setMethod(next); saveAuthMethod(next); }}
        options={[
          { value: "phone", label: t("registerMethod.phone") },
          { value: "email", label: t("registerMethod.email") },
        ]}
      />
    ) : null}
    {phoneMode ? <SmsPhoneLoginForm mode="register" channelAvailable onStepChange={setPhoneStep} /> : <EmailRegisterForm />}
    {inCodeStep ? null : (
    <p className="pt-1 text-start text-sm font-medium text-neutral-700">
      {t("form.haveAccount")}{" "}
      <Link href="/login" className="inline-flex min-h-11 items-center font-extrabold text-text-navy underline decoration-primary-orange/70 underline-offset-4">
        {t("form.loginLink")}
      </Link>
    </p>
    )}
  </>;
}
function EmailRegisterForm() {
  const t = useTranslations("register");
  const tp = useTranslations("phoneAuth");
  const locale = useLocale();
  const submitLock = useRef(false);
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
  const [whatsappAvailable, setWhatsappAvailable] = useState(false);
  const [channel, setChannel] = useState<OtpChannel>("email");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetchOtpChannels().then((result) => {
      if (!cancelled) setWhatsappAvailable(result.whatsapp);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
  const useWhatsApp = whatsappAvailable && channel === "whatsapp";
  const phoneE164 = toE164(phone);
  // Stay enabled so a press explains what is missing instead of leaving a dead button.
  const canSubmit = !emailTaken && !submitting;

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

    if (useWhatsApp && !phoneE164) {
      setErrors({ phone: t("errors.phoneInvalid") });
      return;
    }

    if (submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    try {
      const result = await registerUser({
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        password: parsed.data.password,
        phone: phoneE164 ?? undefined,
        otpChannel: useWhatsApp ? "whatsapp" : "email",
      });
      clearRegisterDraft();
      const query = new URLSearchParams({
        parentId: String(result.parentId),
        email: parsed.data.email,
      });
      if (result.channel === "whatsapp") {
        query.set("channel", "whatsapp");
        if (result.phoneMasked) query.set("phone", result.phoneMasked);
      }
      router.push(`/verify-otp?${query.toString()}`);
    } catch (error) {
      if (error instanceof AuthApiError && error.code === "EMAIL_TAKEN") {
        setEmailTaken(true);
        savePendingLogin({ kind: "email", value: parsed.data.email });
        return;
      }
      if (error instanceof AuthApiError && error.status === 422 && useWhatsApp) {
        setErrors({ phone: t("errors.phoneInvalid") });
        return;
      }
      if (error instanceof AuthApiError && error.status === 0) {
        setFormError(tp("notice.network.title"));
      } else if (error instanceof AuthApiError && (error.status === 429 || error.status === 423)) {
        setFormError(tp("notice.cooldown.title", { time: formatDuration(error.retryAfter || 60, locale) }));
      } else {
        setFormError(t("errors.generic"));
      }
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="fullName" className="mb-1.5 block text-start text-sm font-semibold text-neutral-800">
          {t("fields.fullName")}
        </label>
        <FieldInput
          id="fullName"
          name="fullName"
          variant="soft"
          autoComplete="name"
          value={fullName}
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
          <p id="fullName-error" className="mt-1 text-sm font-semibold text-red-700">
            {errors.fullName ?? liveName}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-start text-sm font-semibold text-neutral-800">
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
          <p id="email-error" className="mt-1 text-sm font-semibold text-red-700">
            {errors.email ?? liveEmail}
          </p>
        ) : null}
        {emailTaken ? (
          <div
            id="email-taken"
            role="alert"
            className="mt-2 rounded-2xl border-2 border-amber-500 bg-amber-50 p-3.5 text-sm leading-6 text-amber-950"
          >
            <p className="flex items-start gap-2 font-extrabold">
              <span className="mt-0.5 shrink-0"><WarningIcon /></span>
              <span>{tp("notice.emailTaken.title")}</span>
            </p>
            <p className="mt-1">{tp("notice.emailTaken.body")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
              <Link href="/login" className="btn-sticker-navy inline-flex min-h-11 items-center rounded-full px-5 font-bold">
                {tp("notice.emailTaken.login")}
              </Link>
              <Link href="/forgot-password" className="inline-flex min-h-11 items-center font-bold text-text-navy underline underline-offset-4">
                {tp("form.forgot")}
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-start text-sm font-semibold text-neutral-800">
          {t("fields.password")}
        </label>
        <PasswordInput
          id="password"
          name="password"
          variant="soft"
          value={password}
          placeholder=""
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
          <p id="password-error" className="mt-1 text-sm font-semibold text-red-700">
            {errors.password}
          </p>
        ) : null}
      </div>

      {whatsappAvailable ? (
        <fieldset>
          <legend className="mb-1.5 block text-start text-sm font-semibold text-neutral-800">
            {t("channel.legend")}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {(["whatsapp", "email"] as const).map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer items-center justify-center rounded-2xl border px-3 py-2.5 text-sm font-bold transition-colors ${
                  channel === option
                    ? "border-primary-orange bg-orange-50 text-text-navy"
                    : "border-neutral-200 text-text-gray"
                }`}
              >
                <input
                  type="radio"
                  name="otpChannel"
                  value={option}
                  checked={channel === option}
                  onChange={() => setChannel(option)}
                  className="sr-only"
                />
                {t(`channel.${option}`)}
              </label>
            ))}
          </div>

          {useWhatsApp ? (
            <div className="mt-3">
              <label htmlFor="phone" className="mb-1.5 block text-start text-sm font-semibold text-neutral-800">
                {t("channel.phoneLabel")}
              </label>
              <FieldInput
                id="phone"
                name="phone"
                variant="soft"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                dir="ltr"
                value={phone}
                placeholder="+963 9xx xxx xxx"
                invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? "phone-error" : undefined}
                icon={<PhoneIcon />}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setErrors((current) => ({ ...current, phone: undefined }));
                }}
              />
              {errors.phone ? (
                <p id="phone-error" className="mt-1 text-sm font-semibold text-red-700">
                  {errors.phone}
                </p>
              ) : (
                <p className="mt-1 text-xs text-text-gray">{t("channel.phoneHint")}</p>
              )}
            </div>
          ) : null}
        </fieldset>
      ) : null}

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
        <p id="terms-error" className="text-sm font-semibold text-red-700">
          {errors.terms}
        </p>
      ) : null}
      {formError ? <p role="alert" className="text-sm font-semibold text-red-700">{formError}</p> : null}

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
    </form>
  );
}
