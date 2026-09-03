"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { HeadquartersScene } from "@/components/headquarters/HeadquartersScene";
import { PointsPill } from "@/components/store/PointsPill";
import { Button } from "@/components/ui/Button";
import { useStudentChrome } from "@/components/StudentChrome";
import type { ChildProfile } from "@/lib/api/children";
import type { HeadquartersSceneData } from "@/lib/api/store";
import { professionAvatarSrc } from "@/lib/config/professions";
import { withChildQuery } from "@/lib/config/subjects";

type Props = {
  child: ChildProfile;
  scene: HeadquartersSceneData;
  highlightId: number | null;
  fromBalance: number | null;
  welcome?: boolean;
};

export function HeadquartersExperience({ child, scene, highlightId, fromBalance, welcome = false }: Props) {
  const t = useTranslations("student.store");
  const tHq = useTranslations("student.hq");
  const tCareer = useTranslations("career");
  const tBrand = useTranslations("student");
  const tDesk = useTranslations("student.desktop");
  const router = useRouter();
  const chrome = useStudentChrome();
  const setChromePoints = chrome?.setPoints;
  const avatar = professionAvatarSrc(child.professionCode, child.gender) ?? "/images/brand/logo.png";
  const professionLabel =
    child.professionCode === "doctor" ||
    child.professionCode === "engineer" ||
    child.professionCode === "teacher" ||
    child.professionCode === "chef" ||
    child.professionCode === "astronaut" ||
    child.professionCode === "soldier"
      ? tCareer(`presets.${child.professionCode}.${child.gender}`)
      : "";

  useEffect(() => {
    setChromePoints?.(scene.pointsBalance);
  }, [scene.pointsBalance, setChromePoints]);

  useEffect(() => {
    if (highlightId == null && fromBalance == null) return;
    const timer = window.setTimeout(() => {
      router.replace(withChildQuery("/headquarters", child.id));
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [child.id, fromBalance, highlightId, router]);

  return (
    <div className="md:grid md:grid-cols-[minmax(0,1fr)_19rem] md:items-start md:gap-7">
      <h1 className="sr-only md:hidden">{t("hqTitle")}</h1>
      <div>
        {welcome ? (
          <section className="mb-5 rounded-[28px] bg-white p-5 text-center shadow-[0_16px_36px_-24px_rgba(26,43,71,0.4)] md:text-start">
            <h1 className="text-2xl font-extrabold text-text-navy">{tHq("welcomeTitle")}</h1>
            <p className="mt-2 text-sm font-bold leading-relaxed text-text-gray">
              {tHq("welcomeBody", { name: child.fullName, profession: professionLabel || child.fullName })}
            </p>
            <p className="mt-3 text-base font-extrabold text-primary-orange">{tHq("pointsZero")}</p>
            <p className="mt-2 text-sm font-semibold text-text-gray">{tHq("emptyWelcome")}</p>
            <div className="mt-4">
              <Button href={withChildQuery("/subjects", child.id)} fullWidth>
                {tHq("startLearning")}
              </Button>
            </div>
          </section>
        ) : null}

        <header dir="ltr" className="mb-4 flex items-center justify-between gap-3 md:hidden">
          <Image src="/images/brand/logo.png" alt={tBrand("brandAlt")} width={150} height={80} className="h-11 w-auto object-contain" priority />
          <div className="flex items-center gap-2">
            <PointsPill count={scene.pointsBalance} from={fromBalance} label={t("pointsUnit")} />
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_8px_18px_-12px_rgba(26,43,71,0.5)]">
              <Image src={avatar} alt={child.fullName} width={120} height={120} unoptimized className="h-[88%] w-[88%] object-contain" />
            </span>
          </div>
        </header>

        <HeadquartersScene scene={scene} highlightId={highlightId} />

        <div className="mt-5 grid grid-cols-2 gap-2.5 md:hidden">
          <Button href={withChildQuery("/subjects", child.id)} variant="secondary" fullWidth className="!min-w-0 text-[13px] sm:text-base">
            <BookIcon />
            {t("backToLearning")}
          </Button>
          <Button href={withChildQuery("/store", child.id)} variant="secondary" fullWidth className="!min-w-0 text-[13px] sm:text-base">
            <CartIcon />
            {t("continueShopping")}
          </Button>
        </div>
      </div>

      <aside className="hidden flex-col gap-4 md:flex">
        <section className="rounded-[28px] bg-white p-5 shadow-[0_16px_36px_-24px_rgba(26,43,71,0.4)]">
          <h1 className="text-2xl font-extrabold text-text-navy">{t("hqTitle")}</h1>
          <div className="mt-4 flex items-center gap-3">
            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FFF8F1]">
              <Image src={avatar} alt={child.fullName} width={120} height={120} unoptimized className="h-[88%] w-[88%] object-contain" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-text-navy">{child.fullName}</p>
              <div className="mt-1">
                <PointsPill count={scene.pointsBalance} from={fromBalance} label={t("pointsUnit")} />
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm font-bold text-text-gray">{tDesk("ownedCount", { count: scene.items.length })}</p>
        </section>

        <section className="rounded-[28px] bg-white p-5 shadow-[0_16px_36px_-24px_rgba(26,43,71,0.4)]">
          <h2 className="text-sm font-extrabold text-text-navy">{tDesk("hqInventory")}</h2>
          {scene.items.length === 0 ? (
            <p className="mt-3 text-sm font-semibold text-text-gray">{tDesk("hqEmpty")}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {scene.items.slice(0, 6).map((item) => (
                <li key={item.id} className="rounded-2xl bg-neutral-50 px-3 py-2 text-sm font-extrabold text-text-navy">
                  {t(`items.${item.slotKey}`)}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-2.5">
          <Button href={withChildQuery("/subjects", child.id)} variant="secondary" fullWidth className="!min-w-0">
            <BookIcon />
            {t("backToLearning")}
          </Button>
          <Button href={withChildQuery("/store", child.id)} variant="secondary" fullWidth className="!min-w-0">
            <CartIcon />
            {t("continueShopping")}
          </Button>
        </div>
      </aside>
    </div>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M5 5.5h11.5A2.5 2.5 0 0 1 19 8v11.5H7.5A2.5 2.5 0 0 0 5 22V5.5Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M4 5h2l2.2 9.2a1.5 1.5 0 0 0 1.5 1.15h7.7a1.5 1.5 0 0 0 1.45-1.1L21 8H8" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="10" cy="19.2" r="1.3" fill="currentColor" />
      <circle cx="17.2" cy="19.2" r="1.3" fill="currentColor" />
    </svg>
  );
}
