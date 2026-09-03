"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { SubjectProgress } from "@/lib/api/student";
import { SUBJECT_TINTS, subjectCoverSrc, withChildQuery } from "@/lib/config/subjects";
import { useMountedViewTransitionName } from "@/lib/utils/useMountedViewTransitionName";
import { useRouter } from "@/i18n/navigation";

type Props = {
  subject: SubjectProgress;
  childId: number;
  index: number;
};

export function SubjectCard({ subject, childId, index }: Props) {
  const t = useTranslations("student");
  const router = useRouter();
  const href = withChildQuery(`/subjects/${subject.subjectId}/units`, childId);
  const cover = subjectCoverSrc(subject.key, subject.iconUrl);
  const coverTransition = useMountedViewTransitionName(`subject-cover-${subject.subjectId}`);

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      style={{ animationDelay: `${index * 70}ms` }}
      className={`subject-card group flex flex-col items-center rounded-[26px] px-3 pb-3.5 pt-4 text-center ${SUBJECT_TINTS[subject.key]} ${
        index === 6 ? "col-span-2 mx-auto w-[calc(50%-0.4rem)] md:col-span-1 md:mx-0 md:w-auto" : ""
      }`}
    >
      <span
        className="relative mb-2 flex h-[4.6rem] w-[4.6rem] items-center justify-center sm:h-24 sm:w-24"
        style={coverTransition}
      >
        <Image src={cover} alt="" width={220} height={220} unoptimized className="h-full w-full object-contain" />
      </span>
      <span className="text-[0.95rem] font-extrabold leading-tight text-text-navy sm:text-lg">
        {t(`subjects.${subject.key}`)}
      </span>
      <span className="mt-1 text-[11px] font-semibold text-text-gray sm:text-sm">
        {t("lessonsCount", { completed: subject.completedLessons, total: subject.totalLessons })}
      </span>
    </button>
  );
}
