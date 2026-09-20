"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useStudentChrome } from "@/components/StudentChrome";
import { StreakBadge } from "@/components/StreakBadge";
import { Link, usePathname } from "@/i18n/navigation";
import { professionAvatarSrc } from "@/lib/config/professions";
import { ParentGateModal } from "@/components/family/ParentGateModal";
import { streakPath, withChildQuery } from "@/lib/config/subjects";

export type StudentNavKey = "subjects" | "store" | "headquarters" | "home" | "preferences";

const ITEMS: Array<{ key: StudentNavKey; href: string }> = [
  { key: "subjects", href: "/subjects" },
  { key: "store", href: "/store" },
  { key: "headquarters", href: "/headquarters" },
  { key: "home", href: "/home" },
  { key: "preferences", href: "/settings" },
];

type Props = {
  childId: number;
};

export function StudentNav({ childId }: Props) {
  const t = useTranslations("student.nav");
  const tBrand = useTranslations("student");
  const pathname = usePathname();
  const active = activeKey(pathname);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-100 bg-white/95 px-2 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden"
        aria-label={t("aria")}
      >
        <ul className="flex items-stretch justify-between">
          {ITEMS.map((item) => (
            <li key={item.key} className="flex-1">
              <NavItem item={item} label={t(item.key)} active={active === item.key} childId={childId} compact />
            </li>
          ))}
        </ul>
      </nav>

      <aside
        className="sticky top-0 z-40 hidden h-screen w-[16.75rem] shrink-0 flex-col border-e border-neutral-100 bg-white/95 py-5 backdrop-blur md:flex"
        aria-label={t("aria")}
      >
        <Link href={withChildQuery("/subjects", childId)} className="mb-6 flex items-center justify-center px-4">
          <Image
            src="/images/brand/logo.png"
            alt={tBrand("brandAlt")}
            width={1012}
            height={551}
            priority
            className="h-12 w-auto object-contain"
          />
        </Link>

        <nav className="flex flex-1 flex-col gap-1.5 px-3">
          {ITEMS.map((item) => (
            <NavItem
              key={item.key}
              item={item}
              label={t(item.key)}
              active={active === item.key}
              childId={childId}
              desktop
            />
          ))}
        </nav>

        <div className="mt-auto px-3 pt-4">
          <SidebarStudentCard />
        </div>
      </aside>
    </>
  );
}

function SidebarStudentCard() {
  const chrome = useStudentChrome();
  const t = useTranslations("student");
  const tGate = useTranslations("parentGate");
  const returnRef = useRef<HTMLButtonElement>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const child = chrome?.child ?? null;
  const streak = chrome?.streak ?? null;
  const points = chrome?.points ?? child?.pointsBalance ?? 0;
  const avatar = child
    ? professionAvatarSrc(child.professionCode, child.gender) ?? "/images/brand/logo.png"
    : "/images/brand/logo.png";

  if (!child) {
    return <div className="h-[5.5rem] animate-pulse rounded-[22px] bg-neutral-100" />;
  }

  return (
    <div className="rounded-[22px] bg-[#FFF8F1] p-3 shadow-[0_10px_24px_-18px_rgba(26,43,71,0.45)]">
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
          <Image src={avatar} alt={child.fullName} width={96} height={96} unoptimized className="h-[88%] w-[88%] object-contain" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-text-navy">{child.fullName}</p>
          <p className="mt-0.5 text-xs font-extrabold text-primary-orange">{t("points", { count: points })}</p>
        </div>
      </div>
      {streak ? (
        <div className="mt-2.5">
          <StreakBadge days={streak.streakCurrent} isActiveToday={streak.isActiveToday} href={streakPath(child.id)} />
        </div>
      ) : null}
      <button
        ref={returnRef}
        type="button"
        className="mt-3 w-full rounded-2xl border border-primary-orange/30 bg-white px-2 py-2 text-[11px] font-extrabold leading-snug text-primary-orange transition-colors hover:bg-[#FFF1E4]"
        onClick={() => setGateOpen(true)}
      >
        {tGate("returnToParent")}
      </button>
      <ParentGateModal open={gateOpen} onClose={() => setGateOpen(false)} returnFocusRef={returnRef} />
    </div>
  );
}

function activeKey(pathname: string): StudentNavKey {
  if (pathname.includes("/store")) return "store";
  if (pathname.includes("/headquarters")) return "headquarters";
  if (pathname.includes("/home")) return "home";
  if (pathname.includes("/settings")) return "preferences";
  return "subjects";
}

function NavItem({
  item,
  label,
  active,
  childId,
  compact = false,
  desktop = false,
}: {
  item: (typeof ITEMS)[number];
  label: string;
  active: boolean;
  childId: number;
  compact?: boolean;
  desktop?: boolean;
}) {
  return (
    <Link
      href={withChildQuery(item.href, childId)}
      className={
        desktop
          ? `flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-extrabold transition-colors ${
              active ? "bg-[#FFF1E4] text-primary-orange" : "text-text-gray hover:bg-neutral-50 hover:text-text-navy"
            }`
          : `flex flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-[11px] font-bold transition-colors ${
              compact ? "min-h-[3.4rem]" : "w-[4.6rem] py-2"
            } ${active ? "text-primary-orange" : "text-text-gray hover:text-text-navy"}`
      }
      aria-current={active ? "page" : undefined}
    >
      <NavIcon name={item.key} active={active} />
      <span className="leading-none">{label}</span>
    </Link>
  );
}

function NavIcon({ name, active }: { name: StudentNavKey; active: boolean }) {
  const stroke = active ? "#F48232" : "#8A93A3";
  const className = "h-6 w-6 shrink-0";
  if (name === "subjects") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <path d="M5 6.5h10.5A2.5 2.5 0 0 1 18 9v9.5H7.5A2.5 2.5 0 0 1 5 16V6.5Z" stroke={stroke} strokeWidth="1.8" />
        <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4H18" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "store") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <path d="M6 8h12l-1 11H7L6 8Z" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 8V7a3 3 0 0 1 6 0v1" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "headquarters") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <path d="M4 20V9l8-5 8 5v11" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M10 20v-6h4v6" stroke={stroke} strokeWidth="1.8" />
      </svg>
    );
  }
  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8.2" stroke={stroke} strokeWidth="1.8" />
        <path d="M8 13.5c1.1 1.3 2.5 2 4 2s2.9-.7 4-2" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="9.2" cy="10" r="1" fill={stroke} />
        <circle cx="14.8" cy="10" r="1" fill={stroke} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M5 9v8a1.5 1.5 0 0 0 1.5 1.5H11V14h2v4.5h4.5A1.5 1.5 0 0 0 19 17V9" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 10.5h6M9 13h4" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 5h8l1 4H7l1-4Z" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
