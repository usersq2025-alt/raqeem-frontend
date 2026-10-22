import { notFound } from "next/navigation";
import { UnitsScreen } from "@/components/UnitsScreen";

type Props = {
  params: Promise<{ subjectId: string }>;
  searchParams: Promise<{ childId?: string }>;
};

// No server-side data fetching here on purpose - see UnitsScreen.tsx's doc comment.
export default async function UnitsPage({ params, searchParams }: Props) {
  const { subjectId: rawSubject } = await params;
  const { childId } = await searchParams;
  const subjectId = Number(rawSubject);
  if (!Number.isFinite(subjectId) || subjectId <= 0) notFound();

  return <UnitsScreen childId={Number(childId)} subjectId={subjectId} />;
}
