"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { FieldInput, UserIcon } from "@/components/ui/FieldInput";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { OtpInput, OTP_LENGTH } from "@/components/forms/OtpInput";
import {
  AuthApiError,
  OTP_TTL_MS,
  requestPasswordReset,
  resetPassword,
} from "@/lib/api/auth";
import { persistSession } from "@/lib/auth/persistSession";
import { isPasswordStrong } from "@/lib/validation/registerSchema";
import { maskEmail } from "@/lib/utils/maskEmail";

type Step = 1 | 2 | 3 | 4;
type OtpStatus = "idle" | "invalid" | "expired" | "network";

function issuedAtKey(login: string) {
  return `raqeem:reset-otp:${login.trim().toLowerCase()}`;
}

function readIssuedAt(login: string) {
  try {
    const stored = sessionStorage.getItem(issuedAtKey(login));
    const parsed = stored ? Number(stored) : NaN;
    if (Number.isFinite(parsed)) return parsed;
    const now = Date.now();
    sessionStorage.setItem(issuedAtKey(login), String(now));
    return now;
  } catch {
    return Date.now();
  }
}

function writeIssuedAt(login: string, value: number) {
  try {
    sessionStorage.setItem(issuedAtKey(login), String(value));
  } catch {
    /* private mode */
  }
}

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function displayLogin(value: string) {
  return value.includes("@") ? maskEmail(value) : value.trim();
}

export function ForgotPasswordFlow() {
  const t = useTranslations("forgotPassword");
  const tOtp = useTranslations("otp");
  const tRegister = useTranslations("register");
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [login, setLogin] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [resending, setResending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [otpStatus, setOtpStatus] = useState<OtpStatus>("idle");
  const [shake, setShake] = useState(false);
  const [issuedAt, setIssuedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [passwordError, setPasswordError] = useState("");
  const shakeTimer = useRef<number | null>(null);
  const tickTimer = useRef<number | null>(null);

  const remaining = issuedAt ? Math.max(0, issuedAt + OTP_TTL_MS - now) : OTP_TTL_MS;
  const locallyExpired = issuedAt !== null && remaining <= 0;
  const canResend = locallyExpired || otpStatus === "expired";
  const passwordReady =
    isPasswordStrong(password) && confirmPassword.length > 0 && password === confirmPassword;

  useEffect(() => {
    return () => {
      if (shakeTimer.current) window.clearTimeout(shakeTimer.current);
      if (tickTimer.current) window.clearInterval(tickTimer.current);
    };
  }, []);

  useEffect(() => {
    if (step !== 2 || !login) return;
    const issued = readIssuedAt(login);
    setIssuedAt(issued);
    const tick = () => setNow(Date.now());
    tick();
    tickTimer.current = window.setInterval(tick, 200);
    return () => {
      if (tickTimer.current) window.clearInterval(tickTimer.current);
      tickTimer.current = null;
    };
  }, [step, login]);

  function triggerShake() {
    setShake(false);
    window.requestAnimationFrame(() => {
      setShake(true);
      if (shakeTimer.current) window.clearTimeout(shakeTimer.current);
      shakeTimer.current = window.setTimeout(() => setShake(false), 520);
    });
  }

  async function handleIdentifier(event: FormEvent) {
    event.preventDefault();
    const value = login.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      await requestPasswordReset(value);
    } catch {
      /* Always continue — same visible path whether the account exists or the request fails. */
    } finally {
      const nextIssued = Date.now();
      writeIssuedAt(value, nextIssued);
      setIssuedAt(nextIssued);
      setCode("");
      setOtpStatus("idle");
      setStep(2);
      setSending(false);
    }
  }

  async function handleResend() {
    if (!canResend || resending) return;
    setResending(true);
    try {
      await requestPasswordReset(login.trim());
    } catch {
      /* same generic path */
    } finally {
      const nextIssued = Date.now();
      writeIssuedAt(login, nextIssued);
      setIssuedAt(nextIssued);
      setCode("");
      setOtpStatus("idle");
      setResending(false);
    }
  }

  function goToPassword(event: FormEvent) {
    event.preventDefault();
    if (code.length !== OTP_LENGTH) return;
    setPasswordError("");
    setStep(3);
  }

  async function handleReset(event: FormEvent) {
    event.preventDefault();
    if (!passwordReady || submitting) return;

    if (password !== confirmPassword) {
      setPasswordError(tRegister("errors.confirmMismatch"));
      return;
    }

    setSubmitting(true);
    setPasswordError("");

    try {
      const result = await resetPassword({
        login: login.trim(),
        code,
        newPassword: password,
      });
      await persistSession(result.token, result.parent);
      setStep(4);
      router.replace("/children");
    } catch (error) {
      if (error instanceof AuthApiError && error.code === "OTP_INVALID") {
        setStep(2);
        setOtpStatus("invalid");
        triggerShake();
        return;
      }
      if (error instanceof AuthApiError && error.code === "OTP_EXPIRED") {
        setStep(2);
        setOtpStatus("expired");
        const expiredAt = Date.now() - OTP_TTL_MS;
        writeIssuedAt(login, expiredAt);
        setIssuedAt(expiredAt);
        return;
      }
      setPasswordError(t("errors.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  const urgent = remaining > 0 && remaining <= 60_000;
  const ringColor = locallyExpired ? "#DC2626" : urgent ? "#F48232" : "#1A2B47";
  const radius = 11;
  const circumference = 2 * Math.PI * radius;
  const progress = issuedAt ? Math.min(1, remaining / OTP_TTL_MS) : 1;

  const otpError =
    otpStatus === "invalid"
      ? tOtp("invalid")
      : otpStatus === "expired"
        ? tOtp("expired")
        : otpStatus === "network"
          ? tOtp("generic")
          : "";

  return (
    <div>
      <StepDots current={step} labels={[t("steps.1"), t("steps.2"), t("steps.3"), t("steps.4")]} />

      {step === 1 ? (
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleIdentifier} noValidate>
          <h1 className="text-center text-2xl font-extrabold text-text-navy md:text-[1.7rem]">
            {t("title")}
          </h1>
          <p className="text-center text-sm leading-6 text-text-gray">{t("subtitle")}</p>
          <div>
            <label htmlFor="reset-login" className="mb-1.5 block text-sm font-medium text-text-gray">
              {t("fields.login")}
            </label>
            <FieldInput
              id="reset-login"
              name="login"
              autoComplete="username"
              value={login}
              placeholder={t("placeholders.login")}
              icon={<UserIcon />}
              onChange={(event) => setLogin(event.target.value)}
            />
          </div>
          <Button type="submit" fullWidth disabled={!login.trim() || sending}>
            {sending ? (
              <>
                <span className="otp-spinner" aria-hidden="true" />
                {t("sending")}
              </>
            ) : (
              t("send")
            )}
          </Button>
        </form>
      ) : null}

      {step === 2 ? (
        <form className="mt-6" onSubmit={goToPassword}>
          <h1 className="text-center text-2xl font-extrabold text-text-navy md:text-[1.7rem]">
            {tOtp("title")}
          </h1>
          <p className="mt-2 text-center text-sm leading-6 text-text-gray">
            {t("otpHint", { login: displayLogin(login) })}
          </p>
          <div className="mt-8">
            <OtpInput
              key={issuedAt ?? "otp"}
              value={code}
              onChange={(next) => {
                setCode(next);
                if (otpStatus === "invalid" || otpStatus === "network") setOtpStatus("idle");
              }}
              error={otpStatus === "invalid"}
              shake={shake}
              disabled={submitting}
              describedBy={otpError ? "reset-otp-feedback" : "reset-otp-timer"}
              groupLabel={tOtp("groupLabel")}
              digitLabel={(n) => tOtp("digitLabel", { n })}
            />
          </div>
          <div className="mt-3 min-h-7 text-center" aria-live="assertive">
            {otpError ? (
              <p id="reset-otp-feedback" className="text-sm font-semibold text-red-700">
                {otpError}
              </p>
            ) : null}
          </div>
          <div
            id="reset-otp-timer"
            className="mt-4 flex items-center justify-center gap-2.5 text-sm text-text-gray"
            role="timer"
          >
            <span className="relative inline-flex h-8 w-8 items-center justify-center" aria-hidden="true">
              <svg viewBox="0 0 28 28" className="absolute inset-0 h-8 w-8 -rotate-90">
                <circle cx="14" cy="14" r={radius} fill="none" stroke="#E8E8E8" strokeWidth="2.4" />
                <circle
                  cx="14"
                  cy="14"
                  r={radius}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - progress)}
                  className="transition-[stroke-dashoffset,stroke] duration-200"
                />
              </svg>
            </span>
            <span className={urgent || locallyExpired ? "font-semibold text-text-navy" : undefined}>
              {locallyExpired ? tOtp("timerExpired") : tOtp("timer", { time: formatRemaining(remaining) })}
            </span>
          </div>
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={!canResend || resending}
              className="text-sm font-bold text-primary-orange disabled:cursor-not-allowed disabled:text-neutral-400"
            >
              {resending ? tOtp("resending") : tOtp("resend")}
            </button>
          </div>
          <div className="mt-8">
            <Button type="submit" fullWidth disabled={code.length !== OTP_LENGTH}>
              {tOtp("confirm")}
            </Button>
          </div>
        </form>
      ) : null}

      {step === 3 ? (
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleReset} noValidate>
          <h1 className="text-center text-2xl font-extrabold text-text-navy md:text-[1.7rem]">
            {t("newPasswordTitle")}
          </h1>
          <p className="text-center text-sm leading-6 text-text-gray">{t("newPasswordSubtitle")}</p>
          <div>
            <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-text-gray">
              {tRegister("fields.password")}
            </label>
            <PasswordInput
              id="new-password"
              name="newPassword"
              value={password}
              placeholder={tRegister("placeholders.password")}
              showStrength
              describedBy={password ? "new-password-strength" : undefined}
              onChange={setPassword}
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-text-gray">
              {tRegister("fields.confirmPassword")}
            </label>
            <PasswordInput
              id="confirm-password"
              name="confirmPassword"
              value={confirmPassword}
              placeholder={tRegister("placeholders.confirmPassword")}
              invalid={Boolean(confirmPassword && confirmPassword !== password)}
              onChange={(value) => {
                setConfirmPassword(value);
                setPasswordError(
                  value && value !== password ? tRegister("errors.confirmMismatch") : ""
                );
              }}
            />
          </div>
          {passwordError ? <p className="text-sm text-red-500">{passwordError}</p> : null}
          <Button type="submit" fullWidth disabled={!passwordReady || submitting}>
            {submitting ? (
              <>
                <span className="otp-spinner" aria-hidden="true" />
                {t("saving")}
              </>
            ) : (
              t("save")
            )}
          </Button>
        </form>
      ) : null}

      {step === 4 ? (
        <div className="mt-10 text-center" role="status">
          <span className="mx-auto inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary-orange/25 border-t-primary-orange" />
          <p className="mt-4 text-sm font-semibold text-text-gray">{t("signingIn")}</p>
        </div>
      ) : null}
    </div>
  );
}

function StepDots({ current, labels }: { current: Step; labels: string[] }) {
  return (
    <ol className="flex items-center justify-center gap-2" aria-label={labels[current - 1]}>
      {labels.map((label, index) => {
        const n = (index + 1) as Step;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`block h-2 rounded-full transition-[width,background-color] duration-200 ${
                active ? "w-6 bg-primary-orange" : done ? "w-2 bg-primary-orange/70" : "w-2 bg-neutral-200"
              }`}
              aria-current={active ? "step" : undefined}
              title={label}
            />
          </li>
        );
      })}
    </ol>
  );
}
