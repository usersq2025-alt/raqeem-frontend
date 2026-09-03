"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Props = {
  publicId: string;
  className?: string;
};

export function AccountIdCard({ publicId, className }: Props) {
  const t = useTranslations("success");
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | null>(null);
  const canCopy = Boolean(publicId);

  useEffect(() => {
    return () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    };
  }, []);

  async function handleCopy() {
    if (!canCopy || copied) return;

    let copiedOk = false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(publicId);
        copiedOk = true;
      } catch {
        copiedOk = false;
      }
    }

    if (!copiedOk) {
      const field = document.createElement("textarea");
      field.value = publicId;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.left = "-9999px";
      document.body.appendChild(field);
      field.select();
      copiedOk = document.execCommand("copy");
      document.body.removeChild(field);
    }

    if (!copiedOk) return;

    setCopied(true);
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={[
        "rounded-2xl border border-primary-orange/45 bg-white px-4 py-3.5 shadow-[0_8px_24px_-18px_rgba(244,130,50,0.55)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="text-xs font-medium text-text-gray">{t("idLabel")}</p>
      <div className="mt-2 flex items-center gap-3">
        <p
          dir="ltr"
          className="min-w-0 flex-1 text-start font-mono text-[1.35rem] font-extrabold tracking-[0.08em] text-text-navy"
        >
          {publicId || "—"}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!canCopy}
          aria-label={copied ? t("copied") : t("copy")}
          className={[
            "inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold transition-colors",
            copied
              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
              : "border-primary-orange text-primary-orange hover:bg-primary-orange/10 active:scale-[0.97]",
            "disabled:cursor-not-allowed disabled:opacity-40",
          ].join(" ")}
        >
          {copied ? (
            <span aria-hidden="true">✓</span>
          ) : (
            <CopyIcon />
          )}
          {copied ? t("copied") : t("copy")}
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {copied ? t("copied") : ""}
      </p>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <rect x="8.2" y="8.2" width="10.3" height="10.3" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M15.2 8.1V6.7A1.7 1.7 0 0 0 13.5 5H6.7A1.7 1.7 0 0 0 5 6.7v6.8A1.7 1.7 0 0 0 6.7 15.2h1.4"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}
