import { requireStudentChild } from "@/lib/server/requireStudentChild";
import { loadStreak, loadSubjectsProgress } from "@/lib/server/loadStudentProgress";
import { SubjectsHome } from "@/components/SubjectsHome";

type Props = {
  searchParams: Promise<{ childId?: string }>;
};

export default async function SubjectsPage({ searchParams }: Props) {
  const { childId } = await searchParams;
  const child = await requireStudentChild(childId);
  const [subjects, streak] = await Promise.all([loadSubjectsProgress(child.id), loadStreak(child.id)]);
  return <SubjectsHome child={child} subjects={subjects} streak={streak} />;
}
