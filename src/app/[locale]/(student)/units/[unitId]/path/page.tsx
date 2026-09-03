import { notFound } from "next/navigation";
import { requireStudentChild } from "@/lib/server/requireStudentChild";
import { loadUnitPath } from "@/lib/server/loadStudentProgress";
import { LessonPathCanvas } from "@/components/path/LessonPathCanvas";

type Props = {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ childId?: string; focusLesson?: string }>;
};

export default async function UnitPathPage({ params, searchParams }: Props) {
  const { unitId } = await params;
  const query = await searchParams;
  const child = await requireStudentChild(query.childId);
  const id = Number(unitId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const data = await loadUnitPath(id, child.id);
  if (!data) notFound();
  const focusLesson = Number(query.focusLesson);

  return (
    <LessonPathCanvas
      data={data}
      childId={child.id}
      focusLessonId={Number.isFinite(focusLesson) && focusLesson > 0 ? focusLesson : null}
    />
  );
}
