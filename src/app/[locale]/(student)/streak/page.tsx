import { requireStudentChild } from "@/lib/server/requireStudentChild";
import { loadStreak } from "@/lib/server/loadStudentProgress";
import { StreakCalendarExperience } from "@/components/StreakCalendarExperience";

type Props = {
  searchParams: Promise<{ childId?: string }>;
};

export default async function StreakPage({ searchParams }: Props) {
  const child = await requireStudentChild((await searchParams).childId);
  const streak = await loadStreak(child.id);
  return <StreakCalendarExperience childId={child.id} streak={streak} />;
}
