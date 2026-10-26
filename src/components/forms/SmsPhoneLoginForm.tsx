"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { apiClient } from "@/lib/api/client";
import { fetchOtpChannels, type VerifyOtpResult } from "@/lib/api/auth";
import { persistSession } from "@/lib/auth/persistSession";
import {
  CODE_VALIDITY_SECONDS,
  SUPPORT_URL,
  classifySendFailure,
  formatCountdown,
  formatDuration,
  normalizeSyrianPhone,
  phoneKey,
} from "@/lib/auth/phoneAuth";
import { Button } from "@/components/ui/Button";
import { FieldInput, MailIcon, PhoneIcon, UserIcon, WarningIcon } from "@/components/ui/FieldInput";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { OtpInput, OTP_LENGTH } from "@/components/forms/OtpInput";
import {
  clearPhoneChallenge,
  clearPhoneRegisterDraft,
  loadPhoneChallenge,
  loadPhoneRegisterDraft,
  savePendingLogin,
  savePhoneChallenge,
  savePhoneRegisterDraft,
} from "@/lib/registerDraft";

type SendResult = { challenge_id: string; resend_after?: number; support_required?: boolean };
type Challenge = { id: string; phone: string; key: string; issuedAt: number | null; binding: boolean };
/** A code request set aside while the parent edits the number; can be resumed without sending anything. */
type Parked = Challenge & { sig: string };
type Transient = "unavailable" | "network" | "unknown" | null;
type FieldId = "name" | "phone" | "login" | "password" | "terms" | "code";
type FieldErrors = Partial<Record<FieldId, string>>;

const FIELD_DOM_ID: Record<FieldId, string> = {
  name: "sms-full-name",
  phone: "sms-phone",
  login: "sms-login",
  password: "sms-password",
  terms: "sms-terms",
  code: "sms-code",
};
const REQUEST_TIMEOUT_MS = 25_000;
/** Shorter waits are normal pacing and shown only as a countdown; longer ones get a one-line reason. */
const LONG_WAIT_SECONDS = 600;

type Props = {
  mode?: "login" | "register";
  channelAvailable?: boolean;
  /** Login only: a number carried over from the sign-up form. */
  initialPhone?: string;
  /** Login only: switch the page to email / account ID log-in. */
  onUseEmail?: () => void;
  /** Register only: 1 = details, 2 = code entry. */
  onStepChange?: (step: 1 | 2) => void;
};

export function SmsPhoneLoginForm({ mode = "login", channelAvailable = false, initialPhone = "", onUseEmail, onStepChange }: Props) {
  const registering = mode === "register";
  const t = useTranslations("phoneAuth");
  const tr = useTranslations("register");
  const locale = useLocale();
  const router = useRouter();

  const [enabled, setEnabled] = useState(channelAvailable);
  const [fullName, setFullName] = useState("");
  const [terms, setTerms] = useState(false);
  const [binding, setBinding] = useState(false);
  const [phone, setPhone] = useState(initialPhone);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [parked, setParked] = useState<Parked | null>(null);
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(!registering);
  const [now, setNow] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [transient, setTransient] = useState<Transient>(null);
  // Facts the server told us are properties of one number, so they are keyed by number:
  // editing the phone field never inherits (or loses) another number's state.
  const [takenKeys, setTakenKeys] = useState<string[]>([]);
  const [blockedKeys, setBlockedKeys] = useState<string[]>([]);
  const [waits, setWaits] = useState<Record<string, number>>({});

  const attempt = useRef(0);
  const sending = useRef(false);
  const verifying = useRef(false);
  const focusPhoneNext = useRef(false);
  const noticeBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (channelAvailable) return;
    let active = true;
    fetchOtpChannels().then((r) => { if (active) setEnabled(r.sms === true); }).catch(() => {});
    return () => { active = false; };
  }, [channelAvailable]);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, []);

  // A reload or reclaimed mobile tab must not discard a code that was already sent:
  // the verification step and its number come back, and the code can still be entered.
  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      const pending = loadPhoneChallenge(mode);
      setNow(Date.now());
      if (pending && !initialPhone) {
        const key = phoneKey(pending.phone);
        setPhone(pending.phone);
        setChallenge({ id: pending.challengeId, phone: normalizeSyrianPhone(pending.phone) ?? pending.phone, key, issuedAt: pending.issuedAt ?? null, binding: pending.binding === true });
        setWaits({ [key]: pending.retryAt });
        if (pending.binding) setBinding(true);
      }
      if (registering) {
        const draft = loadPhoneRegisterDraft();
        if (draft) {
          setFullName(draft.fullName);
          setPhone((current) => current || draft.phone);
        }
      }
      setHydrated(true);
    })();
  }, [mode, registering, initialPhone]);
  useEffect(() => {
    if (!registering || !hydrated || challenge) return;
    savePhoneRegisterDraft({ fullName, phone });
  }, [registering, hydrated, fullName, phone, challenge]);

  useEffect(() => { onStepChange?.(challenge ? 2 : 1); }, [challenge, onStepChange]);

  useEffect(() => {
    if (challenge || !focusPhoneNext.current) return;
    focusPhoneNext.current = false;
    document.getElementById(FIELD_DOM_ID.phone)?.focus();
  }, [challenge]);

  const currentKey = challenge ? challenge.key : phoneKey(phone);
  const isTaken = !challenge && takenKeys.includes(currentKey);
  const isBlocked = blockedKeys.includes(currentKey);
  const waitSeconds = Math.max(0, Math.ceil(((waits[currentKey] ?? 0) - now) / 1000));
  const codeSecondsLeft = challenge?.issuedAt ? Math.max(0, Math.ceil((challenge.issuedAt + CODE_VALIDITY_SECONDS * 1000 - now) / 1000)) : null;
  const codeExpired = challenge !== null && codeSecondsLeft === 0;
  // What the code request was made with; the server keeps the name/credentials from that request.
  const signature = registering ? fullName.trim() : binding ? login.trim() : "";
  const resumable = !challenge && parked !== null && parked.key === phoneKey(phone) && parked.sig === signature;

  const noticeVisible = (!challenge && !resumable && (isTaken || isBlocked || waitSeconds >= LONG_WAIT_SECONDS)) || transient !== null;
  useEffect(() => {
    // The notice sits below the fields; on a small screen it must not be left off-screen.
    if (noticeVisible) noticeBox.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [noticeVisible, isTaken, isBlocked]);

  function focusField(id: FieldId) {
    window.requestAnimationFrame(() => document.getElementById(FIELD_DOM_ID[id])?.focus());
  }

  function changePhone(value: string) {
    // A request still in flight belongs to the number that was typed when it started.
    attempt.current += 1;
    sending.current = false;
    setBusy(false);
    setPhone(value);
    setTransient(null);
    setErrors((current) => ({ ...current, phone: undefined }));
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (registering && fullName.trim().length < 3) next.name = t("form.nameError");
    if (!phone.trim()) next.phone = t("form.phoneRequired");
    else if (!normalizeSyrianPhone(phone)) next.phone = t("form.phoneInvalid");
    if (binding && !login.trim()) next.login = t("form.loginRequired");
    if (registering || binding) {
      if (!password) next.password = registering ? t("form.passwordShort") : t("form.passwordRequired");
      else if (registering && password.length < 6) next.password = t("form.passwordShort");
    }
    if (registering && !terms) next.terms = t("form.termsRequired");
    return next;
  }

  function rememberFailure(key: string, failure: ReturnType<typeof classifySendFailure>) {
    if (failure.kind === "taken") setTakenKeys((keys) => (keys.includes(key) ? keys : [...keys, key]));
    if (failure.kind === "blocked") setBlockedKeys((keys) => (keys.includes(key) ? keys : [...keys, key]));
    if (failure.kind === "cooldown") setWaits((current) => ({ ...current, [key]: Date.now() + failure.retryAfter * 1000 }));
  }

  function resume() {
    if (!parked) return;
    const { sig, ...saved } = parked;
    void sig;
    setNow(Date.now());
    setChallenge(saved);
    setParked(null);
    setErrors({});
    setTransient(null);
  }

  async function requestCode(event?: FormEvent) {
    event?.preventDefault();
    if (sending.current) return;
    if (resumable) { resume(); return; }
    const resending = challenge !== null;
    if (resending && !registering && challenge.binding && !password) {
      // The linking credentials are never stored; ask for them again instead of resending blindly.
      editPhone();
      return;
    }
    if (!resending) {
      const found = validate();
      setErrors(found);
      const first = (["name", "phone", "login", "password", "terms"] as const).find((id) => found[id]);
      if (first) { focusField(first); return; }
    }
    const key = resending ? challenge.key : phoneKey(phone);
    if (takenKeys.includes(key) || blockedKeys.includes(key) || (waits[key] ?? 0) > Date.now()) return;

    sending.current = true;
    const mine = ++attempt.current;
    setBusy(true);
    setTransient(null);
    const normalized = resending ? challenge.phone : (normalizeSyrianPhone(phone) as string);
    try {
      const path = registering ? (resending ? "/register/phone/resend" : "/register/phone") : "/login/sms/request";
      const body = registering
        ? (resending ? { challenge_id: challenge.id } : { phone: normalized, full_name: fullName.trim(), password, accepted_terms: terms })
        : { phone: normalized, ...(binding ? { login: login.trim(), password } : {}) };
      const result = await apiClient.post<SendResult>(path, body, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      const retryAt = Date.now() + (result.resend_after ?? 60) * 1000;
      setWaits((current) => ({ ...current, [key]: retryAt }));
      if (result.support_required) setBlockedKeys((keys) => (keys.includes(key) ? keys : [...keys, key]));
      if (mine !== attempt.current) return;
      const issuedAt = Date.now();
      setNow(issuedAt);
      setChallenge({ id: result.challenge_id, phone: normalized, key, issuedAt, binding: !registering && binding });
      setParked(null);
      setCode("");
      setErrors({});
      savePhoneChallenge({ challengeId: result.challenge_id, phone: normalized, retryAt, issuedAt, binding: !registering && binding }, mode);
    } catch (error) {
      const failure = classifySendFailure(error);
      rememberFailure(key, failure);
      if (mine !== attempt.current) return;
      if (failure.kind === "taken") {
        if (registering) savePendingLogin({ kind: "phone", value: normalized });
      } else if (failure.kind === "invalid" && !resending) {
        setErrors({ phone: t("form.phoneInvalid") });
        focusField("phone");
      } else if (failure.kind === "unavailable" || failure.kind === "network" || failure.kind === "unknown" || failure.kind === "invalid") {
        setTransient(failure.kind === "invalid" ? "unknown" : failure.kind);
      }
    } finally {
      if (mine === attempt.current) { sending.current = false; setBusy(false); }
    }
  }

  async function verify(event?: FormEvent, value = code) {
    event?.preventDefault();
    if (verifying.current || !challenge || codeExpired) return;
    if (value.length !== OTP_LENGTH) {
      setErrors({ code: t("code.incomplete") });
      focusField("code");
      return;
    }
    verifying.current = true;
    setBusy(true);
    setErrors({});
    setTransient(null);
    let done = false;
    try {
      const result = await apiClient.post<VerifyOtpResult>("/login/sms/verify", { challenge_id: challenge.id, code: value }, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      await persistSession(result.token, result.parent);
      done = true;
      if (registering) clearPhoneRegisterDraft();
      clearPhoneChallenge(mode);
      router.replace(registering ? "/account-success" : "/children");
    } catch (error) {
      const failure = classifySendFailure(error);
      if (failure.kind === "network" || failure.kind === "unavailable") {
        setTransient(failure.kind);
      } else if (failure.kind === "cooldown") {
        setErrors({ code: t("notice.cooldown.title", { time: formatDuration(failure.retryAfter, locale) }) });
      } else {
        setErrors({ code: codeExpired ? t("code.expired") : t("code.wrong") });
        setCode("");
        focusField("code");
      }
    } finally {
      if (!done) { verifying.current = false; setBusy(false); }
    }
  }

  function editPhone() {
    attempt.current += 1;
    sending.current = false;
    focusPhoneNext.current = true;
    // Kept (and still stored) so the same number can pick up where it left off.
    if (challenge) setParked({ ...challenge, sig: signature });
    setBusy(false);
    setChallenge(null);
    setCode("");
    setErrors({});
    setTransient(null);
  }

  if (!enabled) return null;

  const supportLink = (label: string) => (
    <a className="inline-flex min-h-11 items-center font-bold text-text-navy underline underline-offset-4" href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">{label}</a>
  );

  const showNotices = !challenge && !resumable;
  let notice: ReactNode = null;
  if (showNotices && isTaken) {
    notice = (
      <Notice title={t("notice.taken.title")} body={t("notice.taken.body")}>
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
          <Link href="/login" className="btn-sticker-navy inline-flex min-h-11 items-center rounded-full px-5 font-bold">{t("notice.taken.login")}</Link>
          <Link href="/forgot-password" className="inline-flex min-h-11 items-center font-bold text-text-navy underline underline-offset-4">{t("form.forgot")}</Link>
        </div>
      </Notice>
    );
  } else if (showNotices && isBlocked) {
    notice = (
      <Notice title={t("notice.blocked.title")} body={t("notice.blocked.body")}>
        {supportLink(t("notice.blocked.support"))}
      </Notice>
    );
  } else if (showNotices && waitSeconds >= LONG_WAIT_SECONDS) {
    notice = <Notice title={t("notice.cooldown.title", { time: formatDuration(waitSeconds, locale) })} body={t("notice.cooldown.body")} />;
  } else if (transient) {
    notice = (
      <Notice title={t(`notice.${transient}.title`)}>
        {transient !== "unknown" ? (
          <button type="button" className="min-h-11 font-bold text-text-navy underline underline-offset-4" onClick={() => void (challenge ? verify() : requestCode())}>
            {t(`notice.${transient}.retry`)}
          </button>
        ) : null}
      </Notice>
    );
  }

  const sendBlocked = !resumable && (isTaken || isBlocked || waitSeconds > 0);
  const idleLabel = registering ? t("form.continue") : t("form.sendCode");
  const waitLabel = registering ? t("form.continueIn", { time: formatCountdown(waitSeconds, locale) }) : t("form.sendCodeIn", { time: formatCountdown(waitSeconds, locale) });
  const sendLabel = busy ? t("form.sending") : resumable ? t("form.resumeCode") : waitSeconds > 0 ? waitLabel : idleLabel;

  if (challenge) {
    const canResend = !busy && !isBlocked && waitSeconds === 0;
    const shownPhone = `0${challenge.phone.slice(4)}`;
    return (
      <form onSubmit={(event) => void verify(event)} className="flex flex-col gap-3" noValidate>
        <h2 className="text-lg font-extrabold text-text-navy">{t("code.title")}</h2>
        <p className="text-sm leading-6 text-neutral-700">
          {registering ? t("code.sentTo") : t("code.sentToLogin")}{" "}
          <bdi dir="ltr" className="font-extrabold text-text-navy">{shownPhone}</bdi>{" "}
          <button type="button" className="min-h-11 font-bold text-text-navy underline underline-offset-4" disabled={busy} onClick={editPhone}>
            {t("code.editPhone")}
          </button>
        </p>

        <div>
          <p id="sms-code-label" className="mb-2 text-center text-sm font-semibold text-neutral-800">{t("code.label")}</p>
          <OtpInput
            key={`${challenge.id}-${challenge.issuedAt ?? 0}`}
            value={code}
            onChange={(next) => { setCode(next); if (errors.code) setErrors({}); }}
            onComplete={(next) => void verify(undefined, next)}
            error={Boolean(errors.code)}
            disabled={busy || codeExpired}
            describedBy={errors.code ? "sms-code-error" : undefined}
            groupLabel={t("code.label")}
            digitLabel={(n) => t("code.digitLabel", { n })}
          />
        </div>
        {errors.code ? <FieldError id="sms-code-error" message={errors.code} /> : null}
        {codeExpired && !errors.code ? (
          <p role="status" className="text-center text-sm font-semibold text-red-800">{t("code.expired")}</p>
        ) : null}
        <div ref={noticeBox}>{notice}</div>

        {codeExpired ? (
          <>
            <Button type="button" fullWidth disabled={busy || isBlocked || waitSeconds > 0} aria-busy={busy} onClick={() => void requestCode()}>
              {busy ? t("code.resending") : waitSeconds > 0 ? t("code.sendNewIn", { time: formatCountdown(waitSeconds, locale) }) : t("code.sendNew")}
            </Button>
            <Button type="submit" variant="secondary" fullWidth disabled>{t("code.confirm")}</Button>
          </>
        ) : (
          <Button type="submit" fullWidth disabled={busy} aria-busy={busy}>
            {busy ? t("code.confirming") : t("code.confirm")}
          </Button>
        )}

        <div className="text-center text-sm">
          {isBlocked ? (
            <p role="alert" className="text-neutral-800">{t("otp.supportPaused")} {supportLink(t("otp.support"))}</p>
          ) : codeExpired ? null : waitSeconds > 0 ? (
            <p role="timer" className="py-2.5 font-semibold text-neutral-800">{t("code.resendIn", { time: formatCountdown(waitSeconds, locale) })}</p>
          ) : (
            <button type="button" disabled={!canResend} onClick={() => void requestCode()} className="min-h-11 font-bold text-text-navy underline underline-offset-4 disabled:no-underline disabled:text-neutral-600">
              {busy ? t("code.resending") : t("code.resend")}
            </button>
          )}
        </div>

        <details className="text-sm text-neutral-700">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-text-navy">{t("code.notArrivedSummary")}</summary>
          <p className="pb-2 leading-6">{t("code.notArrived")}</p>
          {waitSeconds >= LONG_WAIT_SECONDS ? <p className="pb-2 leading-6">{t("code.waitReason")}</p> : null}
        </details>
      </form>
    );
  }

  return (
    <form onSubmit={(event) => void requestCode(event)} className="flex flex-col gap-3" noValidate>
      {binding && !registering ? (
        <>
          <h2 className="text-base font-extrabold text-text-navy">{t("form.bindTitle")}</h2>
          <p className="text-sm leading-6 text-neutral-700">{t("form.bindHelp")}</p>
        </>
      ) : null}

      {registering ? (
        <div>
          <label htmlFor={FIELD_DOM_ID.name} className="mb-1 block text-start text-sm font-semibold text-neutral-800">{t("form.nameLabel")}</label>
          <FieldInput
            id={FIELD_DOM_ID.name}
            name="fullName"
            variant="soft"
            autoComplete="name"
            icon={<UserIcon />}
            value={fullName}
            invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "sms-full-name-error" : undefined}
            onChange={(e) => { setFullName(e.target.value); setErrors((c) => ({ ...c, name: undefined })); }}
            maxLength={120}
          />
          {errors.name ? <FieldError id="sms-full-name-error" message={errors.name} /> : null}
        </div>
      ) : null}

      <div>
        <label htmlFor={FIELD_DOM_ID.phone} className="mb-1 block text-start text-sm font-semibold text-neutral-800">{t("form.phoneLabel")}</label>
        <FieldInput
          id={FIELD_DOM_ID.phone}
          name="phone"
          variant="soft"
          type="tel"
          dir="ltr"
          autoComplete="tel"
          inputMode="tel"
          icon={<PhoneIcon />}
          placeholder="09xxxxxxxx"
          value={phone}
          invalid={Boolean(errors.phone) || isTaken}
          aria-describedby={errors.phone ? "sms-phone-error" : undefined}
          onChange={(e) => changePhone(e.target.value)}
          maxLength={40}
        />
        {errors.phone ? <FieldError id="sms-phone-error" message={errors.phone} /> : null}
      </div>

      {binding && !registering ? (
        <div>
          <label htmlFor={FIELD_DOM_ID.login} className="mb-1 block text-start text-sm font-semibold text-neutral-800">{t("form.loginLabel")}</label>
          <FieldInput
            id={FIELD_DOM_ID.login}
            name="login"
            variant="soft"
            dir="ltr"
            lang="en"
            autoComplete="username"
            autoCapitalize="off"
            spellCheck={false}
            icon={<MailIcon />}
            value={login}
            invalid={Boolean(errors.login)}
            aria-describedby={errors.login ? "sms-login-error" : undefined}
            onChange={(e) => { setLogin(e.target.value); setErrors((c) => ({ ...c, login: undefined })); }}
          />
          {errors.login ? <FieldError id="sms-login-error" message={errors.login} /> : null}
        </div>
      ) : null}

      {registering || binding ? (
        <div>
          <label htmlFor={FIELD_DOM_ID.password} className="mb-1 block text-start text-sm font-semibold text-neutral-800">{t("form.passwordLabel")}</label>
          <PasswordInput
            id={FIELD_DOM_ID.password}
            name="password"
            variant="soft"
            value={password}
            placeholder=""
            autoComplete={registering ? "new-password" : "current-password"}
            showStrength={registering}
            invalid={Boolean(errors.password)}
            describedBy={errors.password ? "sms-password-error" : undefined}
            onChange={(value) => { setPassword(value); setErrors((c) => ({ ...c, password: undefined })); }}
          />
          {errors.password ? <FieldError id="sms-password-error" message={errors.password} /> : null}
        </div>
      ) : null}

      {registering ? (
        <div>
          <label className="flex min-h-11 items-start gap-3 text-sm text-text-navy">
            <input
              id={FIELD_DOM_ID.terms}
              type="checkbox"
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#F48232]"
              checked={terms}
              aria-invalid={errors.terms ? true : undefined}
              aria-describedby={errors.terms ? "sms-terms-error" : undefined}
              onChange={(e) => { setTerms(e.target.checked); setErrors((c) => ({ ...c, terms: undefined })); }}
            />
            <span>
              {tr.rich("terms", {
                terms: (chunks) => <Link href="/terms" target="_blank" className="font-semibold underline underline-offset-2">{chunks}</Link>,
                privacy: (chunks) => <Link href="/privacy" target="_blank" className="font-semibold underline underline-offset-2">{chunks}</Link>,
              })}
            </span>
          </label>
          {errors.terms ? <FieldError id="sms-terms-error" message={errors.terms} /> : null}
        </div>
      ) : null}

      <div ref={noticeBox}>{notice}</div>

      <Button type="submit" fullWidth disabled={busy || sendBlocked} aria-busy={busy}>{sendLabel}</Button>

      {!registering && binding ? (
        <button type="button" className="min-h-11 text-start text-sm font-bold text-text-navy underline underline-offset-4" onClick={() => { setBinding(false); setErrors({}); }}>
          {t("form.bindClose")}
        </button>
      ) : null}

      {!registering && !binding ? (
        <details className="text-sm">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-neutral-700">{t("form.helpSummary")}</summary>
          <div className="flex flex-col items-start pb-1">
            {onUseEmail ? (
              <button type="button" className="min-h-11 font-bold text-text-navy underline underline-offset-4" onClick={onUseEmail}>{t("form.helpEmail")}</button>
            ) : null}
            <button type="button" className="min-h-11 font-bold text-text-navy underline underline-offset-4" onClick={() => { setBinding(true); setErrors({}); }}>{t("form.helpLink")}</button>
          </div>
        </details>
      ) : null}
    </form>
  );
}

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} role="alert" className="mt-1 flex items-start gap-1.5 text-sm font-semibold text-red-700">
      <span className="mt-0.5 shrink-0"><WarningIcon /></span>
      <span>{message}</span>
    </p>
  );
}

function Notice({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <div role="alert" className="rounded-2xl border-2 border-amber-500 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
      <p className="flex items-start gap-2 font-extrabold">
        <span className="mt-0.5 shrink-0"><WarningIcon /></span>
        <span>{title}</span>
      </p>
      {body ? <p className="mt-0.5">{body}</p> : null}
      {children}
    </div>
  );
}
