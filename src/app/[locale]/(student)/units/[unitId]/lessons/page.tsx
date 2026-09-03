import { getLocale, getTranslations } from "next-intl/server";
import { requireStudentChild } from "@/lib/server/requireStudentChild";
import { loadLessonsProgress } from "@/lib/server/loadStudentProgress";
import { lessonPlayPath, unitLessonPath, withChildQuery } from "@/lib/config/subjects";
import { Link, redirect } from "@/i18n/navigation";

type Props = {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ childId?: string }>;
};

export default async function UnitLessonsPage({ params, searchParams }: Props) {
  const t = await getTranslations("student");
  const locale = await getLocale();
  const { unitId } = await params;
  const child = await requireStudentChild((await searchParams).childId);
  const lessons = await loadLessonsProgress(Number(unitId), child.id);
  const playable = lessons.filter((lesson) => lesson.status !== "locked" && Number.isFinite(lesson.lessonId));

  if (playable.length === 1 && lessons.length <= 1) {
    redirect({ href: lessonPlayPath(playable[0].lessonId, child.id), locale });
  }

  if (lessons.length > 1) {
    redirect({ href: unitLessonPath(Number(unitId), child.id), locale });
  }

  return (
    <div>
      <Link href={withChildQuery("/subjects", child.id)} className="text-sm font-bold text-primary-orange">
        {t("back")}
      </Link>
      <h1 className="mt-4 text-xl font-extrabold text-text-navy">{t("lessonsTitle")}</h1>
      {lessons.length === 0 ? (
        <p className="mt-8 text-center font-semibold text-text-gray">{t("emptyLessons")}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {lessons.map((lesson) => {
            const locked = lesson.status === "locked";
            return (
              <li key={lesson.lessonId}>
                {locked ? (
                  <div className="rounded-[22px] bg-white p-4 font-bold text-text-gray opacity-60">{lesson.title}</div>
                ) : (
                  <Link
                    href={lessonPlayPath(lesson.lessonId, child.id)}
                    className="block rounded-[22px] bg-white p-4 font-extrabold text-text-navy shadow-sm"
                  >
                    {lesson.title}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
