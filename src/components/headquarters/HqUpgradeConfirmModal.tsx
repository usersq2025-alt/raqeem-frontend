"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

type Props = {
  open: boolean;
  itemName: string;
  price: number;
  submitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
};

export function HqUpgradeConfirmModal({
  open,
  itemName,
  price,
  submitting,
  onConfirm,
  onCancel,
  returnFocusRef,
}: Props) {
  const t = useTranslations("student.hq.dev");
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      panelRef.current?.focus();
    }, 60);

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) {
        event.preventDefault();
        onCancel();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(focusTimer);
      returnFocusRef?.current?.focus();
    };
  }, [open, onCancel, submitting, returnFocusRef]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="purchase-modal-backdrop fixed inset-0 z-[70] flex items-end justify-center bg-[#1A2B47]/45 px-4 pb-8 pt-10 sm:items-center sm:pb-10">
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="purchase-modal-panel w-full max-w-sm rounded-[28px] bg-white px-5 pb-5 pt-6 shadow-[0_24px_50px_-24px_rgba(26,43,71,0.55)] outline-none"
      >
        <h2 id={titleId} className="text-center text-xl font-extrabold text-text-navy">
          {t("confirmTitle", { item: itemName })}
        </h2>
        <p id={descId} className="mt-3 text-center text-sm font-bold leading-relaxed text-text-gray">
          {t("confirmBody", { price })}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Button
            variant="secondary"
            fullWidth
            className="!min-h-11 !min-w-0"
            disabled={submitting}
            onClick={onCancel}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="primary"
            fullWidth
            className="!min-h-11 !min-w-0"
            disabled={submitting}
            onClick={onConfirm}
          >
            {submitting ? <span className="otp-spinner" aria-hidden="true" /> : null}
            {submitting ? t("buying") : t("confirmBuy")}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
