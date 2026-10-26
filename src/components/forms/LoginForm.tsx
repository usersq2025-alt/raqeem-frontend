"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { FieldInput, UserIcon, WarningIcon } from "@/components/ui/FieldInput";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { AuthApiError, fetchOtpChannels, loginUser } from "@/lib/api/auth";
import { formatDuration } from "@/lib/auth/phoneAuth";
import { persistSession } from "@/lib/auth/persistSession";
import { consumePendingLogin, loadAuthMethod, loadPhoneChallenge, saveAuthMethod } from "@/lib/registerDraft";
import { MethodChoice, MethodChoiceSkeleton } from "./MethodChoice";
import { SmsPhoneLoginForm } from "./SmsPhoneLoginForm";

type LoginProblem = "invalid" | "rate" | "network" | "unavailable";
type Method = "password" | "phone";

export function LoginForm() {
  const t = useTranslations("login");
  const tp = useTranslations("phoneAuth");
  const locale = useLocale();
  const router = useRouter();
  const shakeTimer = useRef<number | null>(null);
  const submitLock = useRef(false);
  const forcedMethod = useRef<Method | null>(null);
  const focusPasswordNext = useRef(false);
  const [method, setMethod] = useState<Method>("password");
  // null until the server says which methods exist; the space is held meanwhile.
  const [smsAvailable, setSmsAvailable] = useState<boolean | null>(null);
  const [carriedPhone, setCarriedPhone] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState<LoginProblem | null>(null);
  const [retryAfter, setRetryAfter] = useState(60);
  const [fieldErrors, setFieldErrors] = useState<{ login?: string; password?: string }>({});
  const [shake, setShake] = useState(false);
  // While a code is being entered the screen has one visible title (the code step's own).
  const [codeStep, setCodeStep] = useState(false);
  const handleStep = useCallback((step: 1 | 2) => setCodeStep(step === 2), []);

  // Someone sent here from sign-up keeps what they typed (read from session storage, not the URL).
  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      if (loadPhoneChallenge("login")) forcedMethod.current = "phone";
      const pending = consumePendingLogin();
      if (!pending) return;
      if (pending.kind === "email") {
        forcedMethod.current = "password";
        setLogin(pending.value);
        focusPasswordNext.current = true;
      } else {
        forcedMethod.current = "phone";
        setCarriedPhone(pending.value);
      }
    })();
  }, []);

  useEffect(() => {
    let active = true;
    void fetchOtpChannels().then((channels) => {
      if (!active) return;
      const sms = channels.sms === true;
      const stored = loadAuthMethod();
      setMethod(sms ? (forcedMethod.current ?? (stored === "email" ? "password" : "phone")) : "password");
      setSmsAvailable(sms);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    return () => {
      if (shakeTimer.current) window.clearTimeout(shakeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (smsAvailable === null || method !== "password" || !focusPasswordNext.current) return;
    focusPasswordNext.current = false;
    document.getElementById("password")?.focus();
  }, [smsAvailable, method]);

  function chooseMethod(next: Method) {
    setMethod(next);
    saveAuthMethod(next === "phone" ? "phone" : "email");
  }

  function triggerShake() {
    setShake(false);
    window.requestAnimationFrame(() => {
      setShake(true);
      if (shakeTimer.current) window.clearTimeout(shakeTimer.current);
      shakeTimer.current = window.setTimeout(() => setShake(false), 380);
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitLock.current) return;

    const found = {
      login: login.trim() ? undefined : tp("form.loginRequired"),
      password: password ? undefined : tp("form.passwordRequired"),
    };
    setFieldErrors(found);
    if (found.login || found.password) {
      document.getElementById(found.login ? "login" : "password")?.focus();
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    setProblem(null);

    try {
      const result = await loginUser({ login: login.trim(), password });
      await persistSession(result.token, result.parent);
      router.replace("/children");
    } catch (e) {
      if (e instanceof AuthApiError && e.verification) {
        router.push(`/verify-otp?parentId=${e.verification.parentId}&email=${encodeURIComponent(e.verification.email)}`);
        return;
      }
      if (e instanceof AuthApiError && e.status === 429) {
        setRetryAfter(e.retryAfter || 60);
        setProblem("rate");
      } else if (e instanceof AuthApiError && e.status === 0) {
        setProblem("network");
      } else if (e instanceof AuthApiError && e.status >= 500) {
        setProblem("unavailable");
      } else {
        setProblem("invalid");
        triggerShake();
      }
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }


  const problemText =
    problem === "rate"
      ? tp("notice.cooldown.title", { time: formatDuration(retryAfter, locale) })
      : problem === "network"
        ? tp("notice.network.title")
        : problem === "unavailable"
          ? tp("notice.unavailable.title")
          : problem === "invalid"
            ? t("errors.invalid")
            : null;

  const title = (
    <h1 className={codeStep ? "sr-only" : "mb-3 text-center text-2xl font-extrabold text-text-navy md:text-[1.7rem]"}>{t("title")}</h1>
  );

  if (smsAvailable === null) return <>{title}<MethodChoiceSkeleton /></>;

  return (
    <>
      {title}
      {smsAvailable && !codeStep ? (
        <MethodChoice
          legend={tp("loginMethod.legend")}
          name="loginMethod"
          value={method}
          onChange={chooseMethod}
          options={[
            { value: "phone", label: tp("loginMethod.phone") },
            { value: "password", label: tp("loginMethod.password") },
          ]}
        />
      ) : null}

      {method === "phone" && smsAvailable ? (
        <SmsPhoneLoginForm mode="login" channelAvailable initialPhone={carriedPhone} onUseEmail={() => chooseMethod("password")} onStepChange={handleStep} />
      ) : (
        <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
          <div className={shake ? "login-shake" : undefined}>
            <label htmlFor="login" className="mb-1 block text-sm font-semibold text-neutral-800">
              {t("fields.login")}
            </label>
            <FieldInput
              id="login"
              name="login"
              variant="soft"
              autoComplete="username"
              dir="ltr"
              lang="en"
              autoCapitalize="off"
              spellCheck={false}
              value={login}
              placeholder="name@example.com / RQMP-123456"
              invalid={problem === "invalid" || Boolean(fieldErrors.login)}
              aria-describedby={fieldErrors.login ? "login-error" : undefined}
              icon={<UserIcon />}
              onChange={(event) => {
                setLogin(event.target.value);
                setFieldErrors((current) => ({ ...current, login: undefined }));
                if (problem === "invalid") setProblem(null);
              }}
            />
            {fieldErrors.login ? <p id="login-error" role="alert" className="mt-1 text-sm font-semibold text-red-700">{fieldErrors.login}</p> : null}
          </div>

          <div className={shake ? "login-shake" : undefined}>
            <label htmlFor="password" className="mb-1 block text-sm font-semibold text-neutral-800">
              {t("fields.password")}
            </label>
            <PasswordInput
              id="password"
              name="password"
              variant="soft"
              autoComplete="current-password"
              value={password}
              placeholder=""
              invalid={problem === "invalid" || Boolean(fieldErrors.password)}
              describedBy={fieldErrors.password ? "password-error" : undefined}
              onChange={(value) => {
                setPassword(value);
                setFieldErrors((current) => ({ ...current, password: undefined }));
                if (problem === "invalid") setProblem(null);
              }}
            />
            {fieldErrors.password ? <p id="password-error" role="alert" className="mt-1 text-sm font-semibold text-red-700">{fieldErrors.password}</p> : null}
          </div>

          <Button type="submit" fullWidth aria-busy={submitting} disabled={submitting}>
            {submitting ? (
              <>
                <span className="otp-spinner" aria-hidden="true" />
                {t("submitting")}
              </>
            ) : (
              t("submit")
            )}
          </Button>

          {problemText ? (
            <div role="alert" className="login-error-enter flex items-start gap-2 rounded-xl border-2 border-red-300 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-800">
              <span className="mt-0.5 shrink-0"><WarningIcon /></span>
              <p>{problemText}</p>
            </div>
          ) : null}

          <details className="text-sm">
            <summary className="flex min-h-11 cursor-pointer items-center font-bold text-text-navy underline underline-offset-4">{tp("form.forgotCredentials")}</summary>
            <div className="flex flex-col items-start pb-1">
              <Link href="/forgot-password" className="inline-flex min-h-11 items-center font-bold text-text-navy underline underline-offset-4">
                {t("forgotPassword")}
              </Link>
              <Link href="/forgot-account-id" className="inline-flex min-h-11 items-center font-bold text-text-navy underline underline-offset-4">
                {t("forgotAccountId")}
              </Link>
            </div>
          </details>
        </form>
      )}

      {codeStep ? null : (
      <p className="pt-1 text-center text-sm">
        <Link href="/register" className="inline-flex min-h-11 items-center font-extrabold text-text-navy underline decoration-primary-orange/70 underline-offset-4">
          {tp("form.createAccount")}
        </Link>
      </p>
      )}
    </>
  );
}
