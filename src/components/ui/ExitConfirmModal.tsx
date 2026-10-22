"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";

type Props = {
  open: boolean;
  title: string;
  body: string;
  stayLabel: string;
  leaveLabel: string;
  onStay: () => void;
  onLeave: () => void;
};

/** "Are you sure you want to exit?" prompt shared by the in-progress lesson and review
 * screens - same portal/focus-trap/Escape-to-cancel shape as HqUpgradeConfirmModal. */
export function ExitConfirmModal({ open, title, body, stayLabel, leaveLabel, onStay, onLeave }: Props) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => panelRef.current?.focus(), 60);

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onStay();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(focusTimer);
    };
  }, [open, onStay]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#1A2B47]/45 px-4 pb-8 pt-10 sm:items-center sm:pb-10">
      <div
        ref={panelRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="w-full max-w-sm rounded-[28px] bg-white px-5 pb-5 pt-6 shadow-[0_24px_50px_-24px_rgba(26,43,71,0.55)] outline-none"
      >
        <h2 id={titleId} className="text-center text-xl font-extrabold text-text-navy">
          {title}
        </h2>
        <p id={descId} className="mt-3 text-center text-sm font-bold leading-relaxed text-text-gray">
          {body}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Button variant="secondary" fullWidth className="!min-h-11 !min-w-0" onClick={onStay}>
            {stayLabel}
          </Button>
          <Button variant="primary" fullWidth className="!min-h-11 !min-w-0" onClick={onLeave}>
            {leaveLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
