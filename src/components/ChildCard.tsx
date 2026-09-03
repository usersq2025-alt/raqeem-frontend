"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { ChildProfile } from "@/lib/api/children";
import { hasChosenProfession } from "@/lib/api/children";
import { professionAvatarSrc } from "@/lib/config/professions";

const TINTS = [
  "from-violet-100 to-violet-50",
  "from-rose-100 to-pink-50",
  "from-emerald-100 to-teal-50",
  "from-sky-100 to-cyan-50",
  "from-amber-100 to-orange-50",
] as const;

type Props = {
  child: ChildProfile;
  index: number;
  animatePoints: boolean;
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useCountUp(target: number, enabled: boolean) {
  const [value, setValue] = useState(enabled ? 0 : target);

  useEffect(() => {
    if (!enabled || prefersReducedMotion()) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const duration = 720;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [enabled, target]);

  return value;
}

export function ChildCard({ child, index, animatePoints }: Props) {
  const t = useTranslations("hub");
  const tGrades = useTranslations("child.grades");
  const router = useRouter();
  const chosen = hasChosenProfession(child);
  const avatarSrc = chosen
    ? professionAvatarSrc(child.professionCode, child.gender) ?? "/images/brand/logo.png"
    : "/images/brand/logo.png";

  const points = useCountUp(child.pointsBalance, animatePoints);
  const gradeKey = String(child.gradeId) as "1" | "2" | "3" | "4" | "5" | "6";
  const gradeLabel = child.gradeId >= 1 && child.gradeId <= 6 ? tGrades(gradeKey) : "";

  function go() {
    const navigate = () => {
      if (chosen) {
        router.push(`/subjects?childId=${child.id}`);
      } else {
        router.push(`/career-selection?childId=${child.id}`);
      }
    };
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => void;
    };
    if (doc.startViewTransition) {
      doc.startViewTransition(navigate);
      return;
    }
    navigate();
  }

  return (
    <button
      type="button"
      onClick={go}
      className={`hub-card group relative flex w-[min(72vw,17.5rem)] shrink-0 flex-col items-center rounded-[28px] bg-gradient-to-b px-5 pb-5 pt-6 text-center shadow-[0_16px_36px_-22px_rgba(26,43,71,0.45)] transition-transform duration-150 ease-out hover:-translate-y-1 active:scale-[0.96] md:w-full ${TINTS[index % TINTS.length]}`}
    >
      {!chosen ? (
        <span className="absolute start-3 top-3 rounded-full bg-primary-orange px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm">
          {t("startNow")}
        </span>
      ) : null}

      <span
        className={`relative flex h-[7.25rem] w-[7.25rem] items-center justify-center overflow-hidden rounded-full bg-white/80 shadow-inner ${
          !chosen ? "hub-logo-pulse" : ""
        }`}
        style={{ viewTransitionName: `child-avatar-${child.id}` }}
      >
        <Image
          src={avatarSrc ?? "/images/brand/logo.png"}
          alt={child.fullName}
          width={256}
          height={256}
          unoptimized
          className="h-[85%] w-[85%] object-contain"
        />
      </span>

      <span className="mt-4 text-lg font-extrabold text-text-navy">{child.fullName}</span>
      <span className="mt-0.5 text-sm text-text-gray">{gradeLabel}</span>

      <span
        className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${
          child.pointsBalance > 0
            ? "bg-primary-orange text-white"
            : "border border-neutral-200 bg-white text-text-gray"
        }`}
      >
        <span aria-hidden="true">★</span>
        {t("points", { count: points })}
      </span>
    </button>
  );
}
