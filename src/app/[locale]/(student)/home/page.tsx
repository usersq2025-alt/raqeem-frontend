import { requireStudentChild } from "@/lib/server/requireStudentChild";
import { StudentJourneyDashboard } from "@/components/journey/StudentJourneyDashboard";
import { loadJourneyDashboard } from "@/lib/server/loadJourneyDashboard";

type Props = {
  searchParams: Promise<{ childId?: string }>;
};

export default async function StudentHomePage({ searchParams }: Props) {
  const child = await requireStudentChild((await searchParams).childId);
  const initialData = await loadJourneyDashboard(child.id);
  return <StudentJourneyDashboard childId={child.id} initialData={initialData} />;
}
