"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import type { StoreCatalogItem } from "@/lib/api/store";

type Props = {
  open: boolean;
  item: StoreCatalogItem | null;
  currentBalance: number;
  submitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function PurchaseConfirmModal({ open, item, currentBalance, submitting, onConfirm, onCancel }: Props) {
  const t = useTranslations("student.store");
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => panelRef.current?.focus(), 80);

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(focusTimer);
    };
  }, [open, onCancel, submitting]);

  if (!ready || !open || !item || item.pricePoints == null) return null;

  const remaining = currentBalance - item.pricePoints;
  const displayName = item.slotKey ? t(`items.${item.slotKey}`) : (item.name ?? "");

  return createPortal(
    <div className="purchase-modal-backdrop fixed inset-0 z-[70] flex items-end justify-center bg-[#1A2B47]/45 px-4 pb-8 pt-10 sm:items-center sm:pb-10">
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="purchase-modal-panel w-full max-w-sm rounded-[28px] bg-white px-5 pb-5 pt-6 shadow-[0_24px_50px_-24px_rgba(26,43,71,0.55)] outline-none"
      >
        <div className="relative mx-auto mb-3 flex h-14 w-14 items-center justify-center">
          <span className="purchase-star text-4xl" aria-hidden="true">
            ★
          </span>
        </div>
        <h2 id={titleId} className="sr-only">
          {t("confirmTitle")}
        </h2>
        <div className="mx-auto mb-3 flex h-32 w-32 items-center justify-center rounded-[22px] bg-[#FFF6EC] ring-4 ring-[#FFE0C2]">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="h-[85%] w-[85%] object-contain" />
          ) : null}
        </div>
        <p className="text-center text-lg font-extrabold text-text-navy">{displayName}</p>
        <p className="mt-1 text-center text-base font-extrabold text-primary-orange">
          {t("points", { count: item.pricePoints })}
        </p>
        <div className="my-4 border-t border-dashed border-[#E6E6E6]" />
        <p className="text-center text-sm font-bold text-text-gray">{t("balanceAfter")}</p>
        <p className="mt-2 flex justify-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF4CC] px-3 py-1 text-sm font-extrabold text-[#C49200]">
            <span aria-hidden="true">★</span>
            {t("points", { count: remaining })}
          </span>
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Button variant="secondary" fullWidth className="!min-w-0" disabled={submitting} onClick={onCancel}>
            {t("cancel")}
          </Button>
          <Button variant="primary" fullWidth className="!min-w-0" disabled={submitting} onClick={onConfirm}>
            {submitting ? <span className="otp-spinner" /> : null}
            {t("buyNow")}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
