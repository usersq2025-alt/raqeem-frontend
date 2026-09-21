"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { FieldInput, LockIcon } from "@/components/ui/FieldInput";
import {
  getGuardianStatus,
  setGuardianPin,
  verifyGuardianPassword,
  verifyGuardianPin,
  type GuardianStatus,
} from "@/lib/api/guardian";

type Props = {
  open: boolean;
  onClose: () => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
};

type Step = "auth" | "suggestPin" | "setPin";

export function ParentGateModal({ open, onClose, returnFocusRef }: Props) {
  const t = useTranslations("parentGate");
  const router = useRouter();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<GuardianStatus | null>(null);
  const [step, setStep] = useState<Step>("auth");
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [setPinPassword, setSetPinPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPinConfirm, setNewPinConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [gateSession, setGateSession] = useState(false);

  if (open && !gateSession) {
    setGateSession(true);
    setStep("auth");
    setPin("");
    setPassword("");
    setError("");
    setBusy(false);
  }
  if (!open && gateSession) {
    setGateSession(false);
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      try {
        const next = await getGuardianStatus();
        if (!cancelled) setStatus(next);
      } catch {
        if (!cancelled) {
          setStatus({
            pinSet: false,
            unlocked: false,
            pinLocked: false,
            unlockTtlMinutes: 15,
            pin_set: false,
            pin_locked: false,
            unlock_ttl_minutes: 15,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => firstFieldRef.current?.focus(), 80);
    const returnFocusEl = returnFocusRef?.current ?? null;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onClose();
      }
      if (event.key === "Tab" && panelRef.current) {
        trapFocus(event, panelRef.current);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(focusTimer);
      returnFocusEl?.focus();
    };
  }, [open, busy, onClose, returnFocusRef]);

  function finishToHub() {
    onClose();
    router.push("/children");
  }

  async function handleSubmitAuth(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      if (status?.pinSet) {
        await verifyGuardianPin(pin.trim());
        finishToHub();
        return;
      }
      const result = await verifyGuardianPassword(password);
      if (result.suggestPinSetup) {
        setStep("suggestPin");
      } else {
        finishToHub();
      }
    } catch (caught) {
      const code =
        caught && typeof caught === "object" && "code" in caught
          ? String((caught as { code: string }).code)
          : "NETWORK";
      if (code === "INVALID_CREDENTIALS") setError(t("errors.invalidPassword"));
      else if (code === "INVALID" || code === "INVALID_PIN" || code === "WRONG_PIN") setError(t("errors.invalidPin"));
      else if (code === "LOCKED") setError(t("errors.pinLocked"));
      else if (code === "NETWORK" || code === "501" || code === "mock") setError(t("errors.unavailable"));
      else setError(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function handleSetPin(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (newPin !== newPinConfirm) {
      setError(t("errors.pinMismatch"));
      return;
    }
    if (!/^\d{4,6}$/.test(newPin)) {
      setError(t("errors.pinFormat"));
      return;
    }
    setBusy(true);
    try {
      await setGuardianPin({
        password: setPinPassword,
        pin: newPin,
        pinConfirmation: newPinConfirm,
      });
      finishToHub();
    } catch (caught) {
      const code =
        caught && typeof caught === "object" && "code" in caught
          ? String((caught as { code: string }).code)
          : "NETWORK";
      if (code === "INVALID_CREDENTIALS") setError(t("errors.invalidPassword"));
      else setError(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  if (typeof document === "undefined" || !open) return null;

  const usePin = Boolean(status?.pinSet);

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[#1A2B47]/50 px-4 pb-6 pt-10 sm:items-center sm:pb-10"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[22rem] overflow-hidden rounded-[28px] bg-white p-5 shadow-[0_24px_50px_-24px_rgba(26,43,71,0.55)] outline-none sm:max-w-md sm:p-6"
      >
        <h2 id={titleId} className="text-center text-xl font-extrabold text-text-navy">
          {t("title")}
        </h2>
        <p className="mt-2 text-center text-sm font-semibold leading-relaxed text-text-gray">{t("subtitle")}</p>
        {!usePin && step === "auth" ? (
          <p className="mt-3 rounded-2xl bg-[#FFF8F1] px-3 py-2 text-center text-xs font-semibold leading-relaxed text-text-navy">
            {t("passwordHint")}
          </p>
        ) : null}

        {step === "auth" ? (
          <form className="mt-5 space-y-3" onSubmit={handleSubmitAuth}>
            {usePin ? (
              <div>
                <label htmlFor="parent-gate-pin" className="mb-1.5 block text-sm font-bold text-text-navy">
                  {t("pinLabel")}
                </label>
                <FieldInput
                  ref={firstFieldRef}
                  id="parent-gate-pin"
                  name="pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={pin}
                  onChange={(event) => setPin(event.target.value)}
                  icon={<LockIcon />}
                  disabled={busy || Boolean(status?.pinLocked)}
                />
              </div>
            ) : (
              <div>
                <label htmlFor="parent-gate-password" className="mb-1.5 block text-sm font-bold text-text-navy">
                  {t("passwordLabel")}
                </label>
                <FieldInput
                  ref={firstFieldRef}
                  id="parent-gate-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  icon={<LockIcon />}
                  disabled={busy}
                />
              </div>
            )}
            {status?.pinLocked ? (
              <p className="text-sm font-semibold text-red-600">{t("errors.pinLocked")}</p>
            ) : null}
            {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                disabled={busy}
                className="min-h-12 w-full rounded-full border-2 border-primary-orange bg-white px-3 text-sm font-extrabold text-primary-orange disabled:opacity-45"
                onClick={onClose}
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                disabled={busy || Boolean(status?.pinLocked) || (usePin ? pin.length < 4 : password.length < 1)}
                className="min-h-12 w-full rounded-full bg-primary-orange px-3 text-sm font-extrabold text-white disabled:opacity-45"
              >
                {busy ? t("verifying") : t("confirm")}
              </button>
            </div>
          </form>
        ) : null}

        {step === "suggestPin" ? (
          <div className="mt-5 space-y-3">
            <p className="text-sm font-semibold leading-relaxed text-text-gray">{t("suggestPinBody")}</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="min-h-12 w-full rounded-full bg-primary-orange text-sm font-extrabold text-white"
                onClick={() => setStep("setPin")}
              >
                {t("suggestPinCta")}
              </button>
              <button
                type="button"
                className="min-h-12 w-full rounded-full border-2 border-primary-orange bg-white text-sm font-extrabold text-primary-orange"
                onClick={finishToHub}
              >
                {t("suggestPinSkip")}
              </button>
            </div>
          </div>
        ) : null}

        {step === "setPin" ? (
          <form className="mt-5 space-y-3" onSubmit={handleSetPin}>
            <div>
              <label htmlFor="parent-gate-set-password" className="mb-1.5 block text-sm font-bold text-text-navy">
                {t("passwordLabel")}
              </label>
              <FieldInput
                ref={firstFieldRef}
                id="parent-gate-set-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={setPinPassword}
                onChange={(event) => setSetPinPassword(event.target.value)}
                icon={<LockIcon />}
                disabled={busy}
              />
            </div>
            <div>
              <label htmlFor="parent-gate-new-pin" className="mb-1.5 block text-sm font-bold text-text-navy">
                {t("newPinLabel")}
              </label>
              <FieldInput
                id="parent-gate-new-pin"
                name="pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={newPin}
                onChange={(event) => setNewPin(event.target.value)}
                icon={<LockIcon />}
                disabled={busy}
              />
            </div>
            <div>
              <label htmlFor="parent-gate-new-pin-confirm" className="mb-1.5 block text-sm font-bold text-text-navy">
                {t("confirmPinLabel")}
              </label>
              <FieldInput
                id="parent-gate-new-pin-confirm"
                name="pinConfirm"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={newPinConfirm}
                onChange={(event) => setNewPinConfirm(event.target.value)}
                icon={<LockIcon />}
                disabled={busy}
              />
            </div>
            {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="min-h-12 w-full rounded-full bg-primary-orange text-sm font-extrabold text-white disabled:opacity-45"
            >
              {busy ? t("savingPin") : t("savePin")}
            </button>
          </form>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

function trapFocus(event: KeyboardEvent, root: HTMLElement) {
  const focusable = root.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
