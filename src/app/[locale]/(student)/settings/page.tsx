import { requireStudentChild } from "@/lib/server/requireStudentChild";
import { ComingSoonScreen } from "@/components/ComingSoonScreen";

type Props = {
  searchParams: Promise<{ childId?: string }>;
};

export default async function StudentSettingsPage({ searchParams }: Props) {
  const child = await requireStudentChild((await searchParams).childId);
  return <ComingSoonScreen childId={child.id} />;
}
