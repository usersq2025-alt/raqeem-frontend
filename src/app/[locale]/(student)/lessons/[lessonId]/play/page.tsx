import { requireStudentChild } from "@/lib/server/requireStudentChild";
import { LessonPlayExperience } from "@/components/LessonPlayExperience";

type Props = {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ childId?: string }>;
};

export default async function LessonPlayPage({ params, searchParams }: Props) {
  const { lessonId: raw } = await params;
  const child = await requireStudentChild((await searchParams).childId);
  const lessonId = Number(raw);
  return <LessonPlayExperience lessonId={lessonId} childId={child.id} pointsBalance={child.pointsBalance} />;
}
