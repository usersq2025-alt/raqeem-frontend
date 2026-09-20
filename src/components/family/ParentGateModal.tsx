"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
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
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<GuardianStatus | null>(null);
  const [step, setStep] = useState<Step>("auth");
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [setPinPassword, setSetPinPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPinConfirm, setNewPinConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setReady(true), []);

  useEffect(() => {
    if (!open) return;
    setStep("auth");
    setPin("");
    setPassword("");
    setError("");
    setBusy(false);
    let cancelled = false;
    getGuardianStatus()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => firstFieldRef.current?.focus(), 80);

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
      returnFocusRef?.current?.focus();
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
      else if (code === "INVALID_PIN" || code === "WRONG_PIN") setError(t("errors.invalidPin"));
      else if (code === "LOCKED") setError(t("errors.pinLocked"));
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

  if (!ready || !open) return null;

  const usePin = Boolean(status?.pinSet);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#1A2B47]/45 px-4 pb-8 pt-10 sm:items-center sm:pb-10">
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-[28px] bg-white px-5 pb-5 pt-6 shadow-[0_24px_50px_-24px_rgba(26,43,71,0.55)] outline-none"
      >
        <h2 id={titleId} className="text-center text-xl font-extrabold text-text-navy">
          {t("title")}
        </h2>
        <p className="mt-2 text-center text-sm font-semibold text-text-gray">{t("subtitle")}</p>

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
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="secondary" className="flex-1" disabled={busy} onClick={onClose}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="flex-1" disabled={busy || Boolean(status?.pinLocked)}>
                {busy ? t("verifying") : t("confirm")}
              </Button>
            </div>
          </form>
        ) : null}

        {step === "suggestPin" ? (
          <div className="mt-5 space-y-3">
            <p className="text-sm font-semibold leading-relaxed text-text-gray">{t("suggestPinBody")}</p>
            <div className="flex flex-col gap-2">
              <Button type="button" onClick={() => setStep("setPin")}>
                {t("suggestPinCta")}
              </Button>
              <Button type="button" variant="secondary" onClick={finishToHub}>
                {t("suggestPinSkip")}
              </Button>
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
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? t("savingPin") : t("savePin")}
            </Button>
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
