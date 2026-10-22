import { notFound } from "next/navigation";
import { UnitPathScreen } from "@/components/path/UnitPathScreen";

type Props = {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ childId?: string; focusLesson?: string }>;
};

// No server-side data fetching here on purpose - see UnitPathScreen.tsx's doc comment.
export default async function UnitPathPage({ params, searchParams }: Props) {
  const { unitId } = await params;
  const query = await searchParams;
  const id = Number(unitId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const focusLesson = Number(query.focusLesson);
  return (
    <UnitPathScreen
      childId={Number(query.childId)}
      unitId={id}
      focusLessonId={Number.isFinite(focusLesson) && focusLesson > 0 ? focusLesson : null}
    />
  );
}
