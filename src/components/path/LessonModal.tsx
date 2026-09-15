"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import type { StationVisualState } from "@/components/path/types";

type Props = {
  open: boolean;
  title: string;
  state: StationVisualState;
  description: string;
  primaryLabel: string;
  closeLabel: string;
  onClose: () => void;
  onPrimary: () => void;
};

export function LessonModal({
  open,
  title,
  state,
  description,
  primaryLabel,
  closeLabel,
  onClose,
  onPrimary,
}: Props) {
  const tPath = useTranslations("student.path");

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lesson-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#1A2B47]/35 backdrop-blur-[2px]"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm rounded-[28px] border-[3px] border-white bg-white p-5 shadow-[0_24px_48px_-20px_rgba(26,43,71,0.45)]">
        <p className="text-center text-xs font-extrabold tracking-wide text-emerald-600">
          {state === "completed" ? "✓ " : "▶ "}
          {state === "completed" ? tPath("completed") : tPath("current")}
        </p>
        <h2 id="lesson-modal-title" className="mt-2 text-center text-xl font-black text-text-navy">
          {title}
        </h2>
        <p className="mt-2 text-center text-sm font-bold leading-relaxed text-text-gray">{description}</p>
        <div className="mt-5 flex flex-col gap-2">
          <Button type="button" fullWidth onClick={onPrimary}>
            {primaryLabel}
          </Button>
          <button type="button" onClick={onClose} className="rounded-2xl py-2.5 text-sm font-extrabold text-text-gray">
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
