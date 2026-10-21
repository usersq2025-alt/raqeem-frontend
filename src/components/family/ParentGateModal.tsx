"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { FieldInput, LockIcon } from "@/components/ui/FieldInput";
import {
  getGuardianStatus,
  verifyGuardianPin,
  type GuardianStatus,
} from "@/lib/api/guardian";

type Props = {
  open: boolean;
  onClose: () => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  onUnlocked?: () => void;
};

export function ParentGateModal({ open, onClose, returnFocusRef, onUnlocked }: Props) {
  const t = useTranslations("parentGate");
  const router = useRouter();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<GuardianStatus | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [gateSession, setGateSession] = useState(false);

  if (open && !gateSession) {
    setGateSession(true);
    setStatus(null);
    setPin("");
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
        if (!cancelled) {
          setStatus(next);
          if (next.unlocked) {
            onClose();
            if (onUnlocked) onUnlocked();
            // replace: the gate never pushed a history entry when it opened, so this exits
            // to the parent hub instead of leaving a back-stack entry that re-opens it.
            else router.replace("/children");
          }
        }
      } catch {
        if (!cancelled) {
          setError(t("errors.unavailable"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, onClose, onUnlocked, router, retry, t]);

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
    if (onUnlocked) onUnlocked();
    else router.replace("/children");
  }

  async function handleSubmitAuth(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      if (!status?.pinSet) return;
      await verifyGuardianPin(pin.trim());
      finishToHub();
    } catch (caught) {
      const code =
        caught && typeof caught === "object" && "code" in caught
          ? String((caught as { code: string }).code)
          : "NETWORK";
      if (code === "INVALID_CREDENTIALS") setError(t("errors.invalidPassword"));
      else if (code === "INVALID" || code === "INVALID_PIN" || code === "WRONG_PIN") setError(t("errors.invalidPin"));
      else if (code === "LOCKED") {
        setStatus((current) => current ? { ...current, pinLocked: true } : current);
        setError(t("errors.pinLocked"));
      }
      else if (code === "NETWORK" || code === "501" || code === "mock") setError(t("errors.unavailable"));
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
        {!status && !error ? <p role="status" className="mt-5 text-center">{t("checking")}</p> : null}
        {status?.isDemo ? <p className="mt-5 text-center text-sm">{t("demoBody")}</p> : null}
        {!usePin && (error || (status && !status.unlocked && !status.isDemo)) ? (
          <p role="alert" className="mt-5 text-sm text-red-600">{error || t("errors.unavailable")}</p>
        ) : null}
        {!usePin ? <div className="mt-5 flex gap-2">
          <button type="button" className="min-h-12 flex-1 rounded-full border-2 border-primary-orange text-primary-orange font-bold" onClick={onClose}>{t("cancel")}</button>
          <button type="button" className="min-h-12 flex-1 rounded-full bg-primary-orange text-white font-bold" onClick={() => {
            if (status?.isDemo) { onClose(); router.replace("/demo"); }
            else { setStatus(null); setError(""); setRetry((value) => value + 1); }
          }}>{status?.isDemo ? t("backToDemo") : t("retry")}</button>
        </div> : null}

        {usePin && status ? (
          <form className="mt-5 space-y-3" onSubmit={handleSubmitAuth}>
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
                disabled={busy || Boolean(status?.pinLocked) || pin.length < 4}
                className="min-h-12 w-full rounded-full bg-primary-orange px-3 text-sm font-extrabold text-white disabled:opacity-45"
              >
                {busy ? t("verifying") : t("confirm")}
              </button>
            </div>
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
