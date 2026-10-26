"use client";

import { useEffect } from "react";
import Image from "next/image";
import confetti from "canvas-confetti";
import { useTranslations } from "next-intl";
import { AccountIdCard } from "@/components/AccountIdCard";
import { Button } from "@/components/ui/Button";

const CONFETTI_KEY = "raqeem:account-success-confetti";
const CONFETTI_COLORS = ["#F48232", "#F9A8D4", "#7DD3FC", "#FDE68A", "#C4B5FD", "#6EE7B7"];

type Props = {
  publicId: string;
  /** True when the account has an email, so email + password is a valid way back in. */
  hasEmail: boolean;
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function fireCelebration() {
  try {
    if (sessionStorage.getItem(CONFETTI_KEY)) return;
    sessionStorage.setItem(CONFETTI_KEY, "1");
  } catch {
    /* private mode — still fire once this mount */
  }

  if (prefersReducedMotion()) return;

  void confetti({
    particleCount: 110,
    spread: 82,
    startVelocity: 36,
    origin: { y: 0.22 },
    colors: CONFETTI_COLORS,
    scalar: 0.95,
    disableForReducedMotion: true,
  });

  window.setTimeout(() => {
    void confetti({
      particleCount: 42,
      angle: 65,
      spread: 50,
      origin: { x: 0.12, y: 0.38 },
      colors: CONFETTI_COLORS,
      disableForReducedMotion: true,
    });
    void confetti({
      particleCount: 42,
      angle: 115,
      spread: 50,
      origin: { x: 0.88, y: 0.38 },
      colors: CONFETTI_COLORS,
      disableForReducedMotion: true,
    });
  }, 280);
}

export function AccountSuccessView({ publicId, hasEmail }: Props) {
  const t = useTranslations("success");
  const tp = useTranslations("phoneAuth.success");

  useEffect(() => {
    fireCelebration();
  }, []);

  return (
    <div className="relative text-center">
      <MobileConfettiBits />

      <div className="success-enter success-delay-0 mx-auto flex justify-center">
        <WelcomeMoment label={t("mascotAlt")} />
      </div>

      <h1 className="success-enter success-delay-1 mt-2 text-2xl font-extrabold text-text-navy md:text-[1.75rem]">
        {t("title")}
      </h1>

      <div className="success-enter success-delay-3 mt-5">
        <Button href="/add-child" fullWidth>
          {tp("addChild")}
        </Button>
      </div>

      {publicId ? (
        <details className="success-enter success-delay-4 mt-4 text-start">
          <summary className="flex min-h-11 cursor-pointer items-center justify-center font-semibold text-text-navy">
            {tp("detailsSummary")}
          </summary>
          <div className="mt-2">
            <AccountIdCard publicId={publicId} />
            <section className="mt-3 rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-sm leading-6 text-neutral-800" aria-labelledby="sign-in-ways">
              <h2 id="sign-in-ways" className="font-extrabold text-text-navy">{tp("signInTitle")}</h2>
              <p className="mt-1">{hasEmail ? tp("signInEmail") : tp("signInPhone")}</p>
            </section>
            <p className="mt-3 text-sm font-semibold leading-5 text-neutral-800" role="note">{t("saveNotice")}</p>
          </div>
        </details>
      ) : (
        <p className="success-enter success-delay-3 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {t("idMissing")}
        </p>
      )}
    </div>
  );
}
function WelcomeMoment({ label }: { label: string }) {
  return (
    <div className="relative mx-auto h-[13.25rem] w-[13.25rem] sm:h-[15.5rem] sm:w-[15.5rem]">
      <span
        className="absolute inset-[28%] rounded-full bg-amber-100/35 blur-3xl"
        aria-hidden="true"
      />
      <span className="sparkle-orbit sparkle-orbit-a" aria-hidden="true" />
      <span className="sparkle-orbit sparkle-orbit-b" aria-hidden="true" />
      <span className="sparkle-orbit sparkle-orbit-c" aria-hidden="true" />
      <Image
        src="/images/success/welcome.png"
        alt={label}
        width={512}
        height={512}
        priority
        className="relative z-[1] h-full w-full object-contain motion-safe:animate-float-slow"
      />
    </div>
  );
}

function MobileConfettiBits() {
  return (
    <div className="pointer-events-none absolute inset-0 md:hidden" aria-hidden="true">
      <span className="absolute start-2 top-2 h-2 w-2 rotate-12 rounded-[1px] bg-pink-300" />
      <span className="absolute end-3 top-6 h-2 w-3 rotate-[24deg] rounded-[1px] bg-sky-300" />
      <span className="absolute start-6 top-24 h-2 w-2 rounded-full bg-amber-300" />
      <span className="absolute end-5 top-28 h-2.5 w-2.5 rounded-full bg-violet-300" />
    </div>
  );
}
