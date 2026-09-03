"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { logout } from "@/lib/api/auth";

export function SettingsMenu() {
  const t = useTranslations("hub.settings");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleLogout() {
    if (leaving) return;
    setLeaving(true);
    try {
      await logout();
    } catch {
      /* still leave the hub */
    }
    router.replace("/login");
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-text-navy shadow-sm transition-transform duration-150 hover:border-primary-orange/40 hover:bg-orange-50/60 active:scale-95"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("open")}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M12 3.8v1.7M12 18.5v1.7M4.9 7.2l1.5.9M17.6 16l1.5.9M3.8 12h1.7M18.5 12h1.7M4.9 16.8l1.5-.9M17.6 8l1.5-.9"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute end-0 z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-neutral-100 bg-white py-2 shadow-[0_18px_40px_-20px_rgba(26,43,71,0.45)]"
        >
          <div className="px-3 py-2">
            <LanguageSwitcher />
          </div>
          <button
            type="button"
            role="menuitem"
            className="flex w-full px-4 py-2.5 text-start text-sm font-semibold text-text-navy hover:bg-neutral-50"
            onClick={() => {
              setOpen(false);
              router.push("/account");
            }}
          >
            {t("edit")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full px-4 py-2.5 text-start text-sm font-semibold text-red-600 hover:bg-red-50"
            onClick={handleLogout}
          >
            {leaving ? t("loggingOut") : t("logout")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
