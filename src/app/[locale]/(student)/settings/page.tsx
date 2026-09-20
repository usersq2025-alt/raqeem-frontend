import { requireStudentChild } from "@/lib/server/requireStudentChild";
import { ExperiencePreferencesExperience } from "@/components/experience/ExperiencePreferencesExperience";

type Props = {
  searchParams: Promise<{ childId?: string }>;
};

export default async function StudentSettingsPage({ searchParams }: Props) {
  const child = await requireStudentChild((await searchParams).childId);
  return <ExperiencePreferencesExperience childId={child.id} />;
}
