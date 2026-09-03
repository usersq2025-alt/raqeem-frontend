"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import confetti from "canvas-confetti";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

type Props = {
  open: boolean;
  childName: string;
  onAddAnother: () => void;
  onGoToPlatform: () => void;
};

const CONFETTI_COLORS = ["#F48232", "#F9A8D4", "#7DD3FC", "#FDE68A", "#C4B5FD", "#6EE7B7"];

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function fireTinyCelebration() {
  if (prefersReducedMotion()) return;

  void confetti({
    particleCount: 46,
    spread: 68,
    startVelocity: 28,
    origin: { y: 0.42 },
    colors: CONFETTI_COLORS,
    scalar: 0.72,
    ticks: 140,
    disableForReducedMotion: true,
  });
}

export function AddAnotherChildModal({
  open,
  childName,
  onAddAnother,
  onGoToPlatform,
}: Props) {
  const t = useTranslations("child.popup");
  const titleId = useId();
  const [ready, setReady] = useState(false);
  const [ask, setAsk] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setAsk(false);
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fireTinyCelebration();

    const askTimer = window.setTimeout(() => setAsk(true), prefersReducedMotion() ? 0 : 520);
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 80);
    timers.current.push(askTimer, focusTimer);

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onGoToPlatform();
    }
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      for (const id of timers.current) window.clearTimeout(id);
      timers.current = [];
      confetti.reset();
    };
  }, [open, onGoToPlatform]);

  if (!ready || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="child-modal-backdrop absolute inset-0 bg-[#1A2B47]/45 backdrop-blur-[3px]"
        aria-label={t("close")}
        onClick={onGoToPlatform}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="child-modal-panel relative w-full max-w-[380px] overflow-hidden rounded-[28px] bg-white px-5 pb-5 pt-4 shadow-[0_28px_70px_-28px_rgba(26,43,71,0.55)]"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onGoToPlatform}
          className="absolute end-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-text-gray hover:bg-neutral-100 hover:text-text-navy"
          aria-label={t("close")}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
            <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        <div className="relative mx-auto mt-2 flex h-28 w-28 items-center justify-center">
          <span className="child-sparkle child-sparkle-a" aria-hidden="true" />
          <span className="child-sparkle child-sparkle-b" aria-hidden="true" />
          <span className="child-sparkle child-sparkle-c" aria-hidden="true" />
          <SuccessStar />
        </div>

        <h2 id={titleId} className="mt-1 text-center text-xl font-extrabold text-text-navy">
          {t("title")}
        </h2>
        {childName ? (
          <p className="mt-1 text-center text-sm font-semibold text-primary-orange">
            {t("named", { name: childName })}
          </p>
        ) : null}

        <div
          className={`grid transition-[opacity,transform,max-height] duration-300 ease-out ${
            ask ? "max-h-64 translate-y-0 opacity-100" : "max-h-0 -translate-y-2 opacity-0"
          }`}
        >
          <p className="mt-3 text-center text-sm leading-6 text-text-gray">{t("question")}</p>
          <div className="mt-5 flex flex-col gap-3">
            <Button type="button" fullWidth onClick={onAddAnother}>
              {t("yes")}
            </Button>
            <Button type="button" variant="secondary" fullWidth onClick={onGoToPlatform}>
              {t("no")}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function SuccessStar() {
  return (
    <svg viewBox="0 0 96 96" className="h-[5.5rem] w-[5.5rem] child-star-pop" aria-hidden="true">
      <defs>
        <linearGradient id="child-star-fill" x1="20" y1="8" x2="76" y2="88" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBBF24" />
          <stop offset="1" stopColor="#F48232" />
        </linearGradient>
      </defs>
      <path
        d="M48 8.5 58.2 34.4 86 37.1 65.4 55.8 71.6 83.2 48 69.1 24.4 83.2 30.6 55.8 10 37.1 37.8 34.4Z"
        fill="url(#child-star-fill)"
        stroke="#fff"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M36 49.5 44.2 57.5 61 39.5"
        fill="none"
        stroke="white"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
