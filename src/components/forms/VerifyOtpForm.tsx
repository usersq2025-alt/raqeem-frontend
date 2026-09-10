"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { FieldInput, MailIcon } from "@/components/ui/FieldInput";
import { OtpInput, OTP_LENGTH } from "@/components/forms/OtpInput";
import {
  AuthApiError,
  OTP_TTL_MS,
  changeSignupEmail,
  resendOtp,
  verifyOtp,
} from "@/lib/api/auth";
import { persistSession } from "@/lib/auth/persistSession";
import { isValidEmail } from "@/lib/validation/registerSchema";
import { inboxUrlForEmail } from "@/lib/utils/openInbox";
import { saveRegisterDraft, loadRegisterDraft } from "@/lib/registerDraft";

type Status = "idle" | "invalid" | "expired" | "network";

type Props = {
  parentId: number | null;
  email: string;
};

export const OTP_RESEND_MS = 60_000;

function issuedAtKey(parentId: number) {
  return `raqeem:otp-issued:${parentId}`;
}

function readIssuedAt(parentId: number) {
  try {
    const stored = sessionStorage.getItem(issuedAtKey(parentId));
    const parsed = stored ? Number(stored) : NaN;
    if (Number.isFinite(parsed)) return parsed;
    const now = Date.now();
    sessionStorage.setItem(issuedAtKey(parentId), String(now));
    return now;
  } catch {
    return Date.now();
  }
}

function writeIssuedAt(parentId: number, value: number) {
  try {
    sessionStorage.setItem(issuedAtKey(parentId), String(value));
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

export function VerifyOtpForm({ parentId, email }: Props) {
  const t = useTranslations("otp");
  const tRegister = useTranslations("register");
  const router = useRouter();
  const [currentEmail, setCurrentEmail] = useState(email);
  const [emailDraft, setEmailDraft] = useState(email);
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [code, setCode] = useState("");
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);
  const [issuedAt, setIssuedAt] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [serverExpired, setServerExpired] = useState(false);
  const [shake, setShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const shakeTimer = useRef<number | null>(null);
  const submitLock = useRef(false);

  useEffect(() => {
    setCurrentEmail(email);
    setEmailDraft(email);
  }, [email]);

  useEffect(() => {
    setMounted(true);
    if (!parentId) return;

    const issued = readIssuedAt(parentId);
    setIssuedAt(issued);
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [parentId]);

  useEffect(() => {
    return () => {
      if (shakeTimer.current) window.clearTimeout(shakeTimer.current);
    };
  }, []);

  const remainingExpiry =
    !mounted || issuedAt === null ? OTP_TTL_MS : Math.max(0, issuedAt + OTP_TTL_MS - now);
  const resendRemaining =
    !mounted || issuedAt === null ? OTP_RESEND_MS : Math.max(0, issuedAt + OTP_RESEND_MS - now);
  const locallyExpired = remainingExpiry === 0;
  const canResend = (resendRemaining === 0 || serverExpired) && !resending && !succeeded;
  const progress = resendRemaining / OTP_RESEND_MS;
  const inboxUrl = inboxUrlForEmail(currentEmail);
  const errorMessage = useMemo(() => {
    if (locallyExpired || status === "expired") return t("expired");
    if (status === "invalid") return t("invalid");
    if (status === "network") return t("generic");
    return null;
  }, [locallyExpired, status, t]);

  function triggerShake() {
    setShake(false);
    window.requestAnimationFrame(() => {
      setShake(true);
      if (shakeTimer.current) window.clearTimeout(shakeTimer.current);
      shakeTimer.current = window.setTimeout(() => setShake(false), 520);
    });
  }

  async function submitCode(nextCode: string) {
    if (!parentId || nextCode.length !== OTP_LENGTH || submitting || succeeded || submitLock.current) {
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    setStatus("idle");

    try {
      const result = await verifyOtp(parentId, nextCode);
      await persistSession(result.token, result.parent);
      setSucceeded(true);
      window.setTimeout(() => {
        router.replace("/account-success");
      }, 900);
    } catch (error) {
      if (error instanceof AuthApiError && error.code === "OTP_INVALID") {
        setStatus("invalid");
        triggerShake();
        return;
      }
      if (error instanceof AuthApiError && error.code === "OTP_EXPIRED") {
        setStatus("expired");
        setServerExpired(true);
        const expiredAt = Date.now() - OTP_TTL_MS;
        writeIssuedAt(parentId, expiredAt);
        setIssuedAt(expiredAt);
        return;
      }
      setStatus("network");
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await submitCode(code);
  }

  async function handleResend() {
    if (!parentId || !canResend || succeeded) return;
    setResending(true);
    try {
      await resendOtp(parentId);
      const nextIssued = Date.now();
      writeIssuedAt(parentId, nextIssued);
      setIssuedAt(nextIssued);
      setCode("");
      setStatus("idle");
      setServerExpired(false);
    } catch {
      setStatus("network");
    } finally {
      setResending(false);
    }
  }

  async function handleSaveEmail() {
    if (!parentId || savingEmail) return;
    const next = emailDraft.trim();
    if (!isValidEmail(next)) {
      setEmailError(tRegister("errors.emailInvalid"));
      return;
    }
    if (next.toLowerCase() === currentEmail.trim().toLowerCase()) {
      setEditingEmail(false);
      setEmailError("");
      return;
    }

    setSavingEmail(true);
    setEmailError("");
    try {
      const result = await changeSignupEmail(parentId, next);
      setCurrentEmail(result.email);
      setEmailDraft(result.email);
      setEditingEmail(false);
      const nextIssued = Date.now();
      writeIssuedAt(parentId, nextIssued);
      setIssuedAt(nextIssued);
      setCode("");
      setStatus("idle");
      setServerExpired(false);
      const draft = loadRegisterDraft();
      saveRegisterDraft({
        fullName: draft?.fullName ?? "",
        email: result.email,
        acceptedTerms: draft?.acceptedTerms ?? true,
      });
      router.replace(`/verify-otp?parentId=${parentId}&email=${encodeURIComponent(result.email)}`);
    } catch (error) {
      if (error instanceof AuthApiError && error.code === "EMAIL_TAKEN") {
        setEmailError(tRegister("errors.emailTaken"));
        return;
      }
      setEmailError(t("generic"));
    } finally {
      setSavingEmail(false);
    }
  }

  if (!parentId) {
    return (
      <div className="text-start">
        <h1 className="text-2xl font-extrabold text-text-navy">{t("title")}</h1>
        <p className="mt-3 text-text-gray">{t("missingSession")}</p>
        <div className="mt-8">
          <Button href="/register" fullWidth>
            {t("goRegister")}
          </Button>
        </div>
      </div>
    );
  }

  const urgent = resendRemaining > 0 && resendRemaining <= 15_000;
  const ringColor = canResend ? "#F48232" : urgent ? "#F48232" : "#1A2B47";
  const radius = 11;
  const circumference = 2 * Math.PI * radius;

  return (
    <form onSubmit={handleSubmit} className="relative">
      {succeeded ? (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-3xl bg-white/92"
          role="status"
          aria-live="polite"
        >
          <span className="animate-otp-check flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-3xl text-white shadow-[0_8px_0_#059669]">
            ✓
          </span>
          <p className="mt-4 text-lg font-extrabold text-text-navy">{t("verified")}</p>
        </div>
      ) : null}

      <h1 className="text-start text-2xl font-extrabold leading-snug text-text-navy md:text-[1.85rem]">
        {t("verifyTitle")}
      </h1>

      <div className="mt-2.5">
        {editingEmail ? (
          <div className="w-full">
            <FieldInput
              id="otp-email"
              name="email"
              type="email"
              variant="soft"
              dir="ltr"
              lang="en"
              value={emailDraft}
              placeholder={tRegister("placeholders.email")}
              invalid={Boolean(emailError)}
              icon={<MailIcon />}
              onChange={(event) => {
                setEmailDraft(event.target.value);
                setEmailError("");
              }}
            />
            {emailError ? <p className="mt-1 text-start text-xs text-red-500">{emailError}</p> : null}
            <div className="mt-2 flex justify-end gap-3 text-xs font-extrabold">
              <button
                type="button"
                className="text-text-gray"
                onClick={() => {
                  setEditingEmail(false);
                  setEmailDraft(currentEmail);
                  setEmailError("");
                }}
              >
                {t("cancelEdit")}
              </button>
              <button
                type="button"
                className="text-primary-orange"
                disabled={savingEmail}
                onClick={() => void handleSaveEmail()}
              >
                {savingEmail ? t("savingEmail") : t("saveEmail")}
              </button>
            </div>
          </div>
        ) : (
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-start text-sm font-medium leading-relaxed text-text-gray">
            <span>{t("sentTo")}</span>
            <span className="inline-flex items-center gap-1.5">
              <span dir="ltr" className="font-extrabold text-text-navy">
                {currentEmail || "—"}
              </span>
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-text-gray transition-colors hover:bg-orange-50 hover:text-primary-orange"
                aria-label={t("editEmail")}
                onClick={() => setEditingEmail(true)}
              >
                <PencilIcon />
              </button>
            </span>
          </p>
        )}
      </div>

      <div className="mt-7">
        <OtpInput
          key={issuedAt ?? "otp"}
          value={code}
          onChange={(next) => {
            setCode(next);
            if (status === "invalid" || status === "network") {
              setStatus("idle");
            }
          }}
          onComplete={(next) => {
            void submitCode(next);
          }}
          error={status === "invalid"}
          shake={shake}
          disabled={submitting || succeeded}
          describedBy={errorMessage ? "otp-feedback" : "otp-timer"}
          groupLabel={t("groupLabel")}
          digitLabel={(n) => t("digitLabel", { n })}
        />
      </div>

      {inboxUrl ? (
        <a
          href={inboxUrl}
          target="_blank"
          rel="noreferrer"
          className="otp-inbox-btn mt-5"
        >
          <span>{t("openInbox")}</span>
        </a>
      ) : null}

      <div className="mt-3 min-h-7 text-start" aria-live="assertive" aria-atomic="true">
        {errorMessage ? (
          <p
            id="otp-feedback"
            className="inline-flex items-center gap-2 text-sm font-semibold text-red-700"
          >
            <span
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-[11px] font-black text-white"
              aria-hidden="true"
            >
              !
            </span>
            {errorMessage}
          </p>
        ) : null}
      </div>

      <div
        id="otp-timer"
        className="mt-5 flex items-center justify-start gap-2.5 text-sm text-text-gray"
        role="timer"
        aria-label={
          canResend ? t("resendReady") : t("resendIn", { time: formatRemaining(resendRemaining) })
        }
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
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
            <circle cx="12" cy="12" r="8.2" stroke={ringColor} strokeWidth="1.7" />
            <path
              d="M12 8.2v4.1l2.4 1.5"
              stroke={ringColor}
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className={urgent || canResend ? "font-semibold text-text-navy" : undefined}>
          {canResend ? t("resendReady") : t("resendIn", { time: formatRemaining(resendRemaining) })}
        </span>
      </div>

      <div className="mt-3 text-start">
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={!canResend || succeeded}
          className="text-sm font-bold text-primary-orange transition-colors disabled:cursor-not-allowed disabled:text-neutral-400"
        >
          {resending ? t("resending") : t("resend")}
        </button>
        <p className="mt-2 text-xs font-medium leading-relaxed text-text-gray">{t("spamHint")}</p>
      </div>

      <div className="mt-7">
        <button
          type="submit"
          className="hero-cta register-submit disabled:opacity-[0.78]"
          disabled={code.length !== OTP_LENGTH || submitting || succeeded}
        >
          {submitting ? (
            <>
              <span className="otp-spinner" aria-hidden="true" />
              {t("submitting")}
            </>
          ) : (
            <>
              <span>{t("confirmStart")}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M4 16.5 15.2 5.3a1.8 1.8 0 0 1 2.5 0l1 1a1.8 1.8 0 0 1 0 2.5L7.5 20H4v-3.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M13.2 7.3 16.7 10.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
