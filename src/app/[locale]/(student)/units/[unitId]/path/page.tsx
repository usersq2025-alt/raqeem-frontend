import { notFound } from "next/navigation";
import { requireStudentChild } from "@/lib/server/requireStudentChild";
import { loadUnitPath } from "@/lib/server/loadStudentProgress";
import { LessonPathCanvas } from "@/components/path/LessonPathCanvas";
import {
  getJourneyFixture,
  getJourneyFixtureByUnitId,
  isJourneyFixturesEnabled,
  JOURNEY_FIXTURE_CHILD,
  parseJourneyFixtureKey,
  type JourneyFixtureKey,
} from "@/lib/path/journeyFixtures";

type Props = {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ childId?: string; focusLesson?: string; fixture?: string }>;
};

/**
 * Real unit path route.
 * Dev fixtures (NODE_ENV === "development" only):
 *   /ar/units/9101/path?fixture=progress&childId=9001
 *   /ar/units/9102/path?fixture=complete&childId=9001
 *   /ar/units/9103/path?fixture=long&childId=9001
 */
export default async function UnitPathPage({ params, searchParams }: Props) {
  const { unitId } = await params;
  const query = await searchParams;
  const id = Number(unitId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  let fixtureKey: JourneyFixtureKey | null = null;
  if (isJourneyFixturesEnabled()) {
    fixtureKey = parseJourneyFixtureKey(query.fixture);
    if (!fixtureKey && getJourneyFixtureByUnitId(id)) {
      fixtureKey = parseJourneyFixtureKey(
        id === 9101 ? "progress" : id === 9102 ? "complete" : id === 9103 ? "long" : null
      );
    }
  }

  if (fixtureKey) {
    const data = getJourneyFixture(fixtureKey);
    if (!data) notFound();
    const focusLesson = Number(query.focusLesson);
    return (
      <LessonPathCanvas
        data={{ ...data, unitId: id }}
        childId={JOURNEY_FIXTURE_CHILD.id}
        focusLessonId={Number.isFinite(focusLesson) && focusLesson > 0 ? focusLesson : null}
        childName={JOURNEY_FIXTURE_CHILD.fullName}
        professionCode={JOURNEY_FIXTURE_CHILD.professionCode}
        gender={JOURNEY_FIXTURE_CHILD.gender}
        pointsBalance={JOURNEY_FIXTURE_CHILD.pointsBalance}
      />
    );
  }

  const child = await requireStudentChild(query.childId);
  const data = await loadUnitPath(id, child.id);
  if (!data) notFound();
  const focusLesson = Number(query.focusLesson);

  return (
    <LessonPathCanvas
      data={data}
      childId={child.id}
      focusLessonId={Number.isFinite(focusLesson) && focusLesson > 0 ? focusLesson : null}
      childName={child.fullName}
      professionCode={child.professionCode}
      gender={child.gender}
      pointsBalance={child.pointsBalance}
    />
  );
}
