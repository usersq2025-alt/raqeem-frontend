"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { type ChildProfile } from "@/lib/api/children";
import { professionAvatarSrc } from "@/lib/config/professions";
import { EmptyBlock, ErrorBlock, SectionIntro, SkeletonBlock } from "./SettingsUi";
import { WeeklyInsightsCard } from "./WeeklyInsightsCard";

type Props = {
  childrenList: ChildProfile[];
  childrenLoading: boolean;
  childrenError: boolean;
  onRetryChildren: () => void;
  email: string | null;
  emailVerified: boolean;
};

export function ReportsSection({ childrenList, childrenLoading, childrenError, onRetryChildren, email, emailVerified }: Props) {
  const t = useTranslations("familySettings");
  const tGrades = useTranslations("child.grades");
  const requestedId = Number(useSearchParams().get("childId"));
  const [selectedId, setSelectedId] = useState<number | null>(() =>
    childrenList.find((child) => child.id === requestedId)?.id ?? childrenList[0]?.id ?? null
  );
  const childIdsKey = childrenList.map((child) => child.id).join(",");
  const [trackedChildIds, setTrackedChildIds] = useState(childIdsKey);
  if (trackedChildIds !== childIdsKey) {
    setTrackedChildIds(childIdsKey);
    if (selectedId === null || !childrenList.some((child) => child.id === selectedId)) {
      setSelectedId(childrenList[0]?.id ?? null);
    }
  }

  if (childrenLoading) return <SkeletonBlock rows={3} />;
  if (childrenError) return <ErrorBlock message={t("loadError")} retryLabel={t("retry")} onRetry={onRetryChildren} />;
  if (!childrenList.length) return <div className="space-y-4">
    <SectionIntro title={t("reports.panelTitle")} description={t("reports.panelLead")} />
    <EmptyBlock title={t("learning.needChildTitle")} body={t("learning.needChild")} />
  </div>;

  return <div className="space-y-4">
    <SectionIntro title={t("reports.panelTitle")} description={t("reports.panelLead")} />
    <p className="text-sm font-extrabold text-text-navy">{t("learning.pickChild")}</p>
    <ul className="grid gap-2 sm:grid-cols-2">
      {childrenList.map((child) => {
        const active = child.id === selectedId;
        const avatar = professionAvatarSrc(child.professionCode, child.gender) ?? "/images/brand/logo.png";
        const gradeKey = String(child.gradeId) as "1" | "2" | "3" | "4" | "5" | "6";
        return <li key={child.id}><button type="button" aria-pressed={active}
          className={`flex w-full items-center gap-3 rounded-[22px] p-3 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${active ? "bg-[#FFF1E4] ring-2 ring-brand-gold" : "bg-neutral-50 hover:bg-neutral-100"}`}
          onClick={() => setSelectedId(child.id)}>
          <span className="relative flex h-11 w-11 overflow-hidden rounded-full bg-white"><Image src={avatar} alt="" width={44} height={44} unoptimized className="object-contain p-0.5" /></span>
          <span><span className="block text-sm font-extrabold text-text-navy">{child.fullName}</span>
            <span className="block text-xs font-semibold text-text-gray">{child.gradeId >= 1 && child.gradeId <= 6 ? tGrades(gradeKey) : ""}</span></span>
        </button></li>;
      })}
    </ul>
    {selectedId ? <WeeklyInsightsCard key={selectedId} studentId={selectedId} email={email} emailVerified={emailVerified} /> : null}
  </div>;
}
