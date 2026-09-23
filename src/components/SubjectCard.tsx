"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { SubjectProgress } from "@/lib/api/student";
import {
  SUBJECT_ACCENTS,
  SUBJECT_TINTS,
  subjectCoverSrc,
  withChildQuery,
} from "@/lib/config/subjects";
import { useMountedViewTransitionName } from "@/lib/utils/useMountedViewTransitionName";
import { useAnimatedFill } from "@/lib/utils/useAnimatedFill";
import { useRouter } from "@/i18n/navigation";
import { SubjectLessonProgress } from "@/components/SubjectLessonProgress";

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
  const accent = SUBJECT_ACCENTS[subject.key];
  const percentage =
    subject.totalLessons > 0
      ? Math.min(100, Math.round((subject.completedLessons / subject.totalLessons) * 100))
      : 0;
  const fill = useAnimatedFill(percentage);
  const available = subject.totalLessons > 0;

  return (
    <button
      type="button"
      onClick={() => available && router.push(href)}
      disabled={!available}
      style={{ animationDelay: `${index * 70}ms` }}
      className={`subject-card group flex flex-col items-center rounded-[26px] px-3 pb-3.5 pt-4 text-center ${SUBJECT_TINTS[subject.key]} ${
        index === 6 ? "col-span-2 mx-auto w-[calc(50%-0.4rem)] md:col-span-1 md:mx-0 md:w-auto" : ""
      } ${available ? "cursor-pointer" : "cursor-not-allowed opacity-75"}`}
    >
      <span
        className="relative mb-2 flex h-[4.6rem] w-[4.6rem] items-center justify-center sm:h-24 sm:w-24"
        style={coverTransition}
      >
        <Image src={cover} alt="" width={220} height={220} unoptimized className="h-full w-full object-contain" />
        {percentage >= 100 ? (
          <span
            className="absolute -bottom-0.5 -end-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-[0_4px_10px_-4px_rgba(26,43,71,0.45)]"
            aria-hidden="true"
          >
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none">
              <path
                d="M4.5 10.5 8 14l7.5-8"
                stroke={accent}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        ) : null}
      </span>
      <span className="text-[0.95rem] font-extrabold leading-tight text-text-navy sm:text-lg">
        {t(`subjects.${subject.key}`)}
      </span>
      {available ? (
        <SubjectLessonProgress
          completed={subject.completedLessons}
          total={subject.totalLessons}
          percentage={percentage}
          fill={fill}
          accent={accent}
          label={t("lessonsCount", {
            completed: subject.completedLessons,
            total: subject.totalLessons,
          })}
          className="mt-2.5 w-full"
        />
      ) : (
        <span className="mt-2.5 rounded-full bg-white/80 px-3 py-1 text-xs font-extrabold text-text-gray">
          {t("comingSoon")}
        </span>
      )}
    </button>
  );
}
