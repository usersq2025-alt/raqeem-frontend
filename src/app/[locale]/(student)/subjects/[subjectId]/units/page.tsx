import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireStudentChild } from "@/lib/server/requireStudentChild";
import { loadSubjectsProgress, loadUnitsProgress } from "@/lib/server/loadStudentProgress";
import { UnitsScreen } from "@/components/UnitsScreen";
import { SUBJECT_KEYS } from "@/lib/config/subjects";

type Props = {
  params: Promise<{ subjectId: string }>;
  searchParams: Promise<{ childId?: string }>;
};

export default async function UnitsPage({ params, searchParams }: Props) {
  const t = await getTranslations("student");
  const locale = await getLocale();
  const { subjectId: rawSubject } = await params;
  const { childId } = await searchParams;
  const child = await requireStudentChild(childId);
  const subjectId = Number(rawSubject);
  if (!Number.isFinite(subjectId) || subjectId <= 0) notFound();

  const [units, subjects] = await Promise.all([
    loadUnitsProgress(subjectId, child.id),
    loadSubjectsProgress(child.id),
  ]);
  const subject = subjects.find((row) => row.subjectId === subjectId);
  const subjectKey = subject?.key ?? SUBJECT_KEYS[Math.max(0, subjectId - 1)] ?? "arabic";
  const localizedApiName =
    locale.startsWith("ar") ? subject?.nameAr?.trim() : subject?.nameEn?.trim();
  const subjectName =
    localizedApiName ||
    subject?.nameAr?.trim() ||
    subject?.nameEn?.trim() ||
    t(`subjects.${subjectKey}`);

  return (
    <UnitsScreen
      childId={child.id}
      subjectId={subjectId}
      subjectKey={subjectKey}
      subjectName={subjectName}
      iconUrl={subject?.iconUrl ?? null}
      units={units}
    />
  );
}
