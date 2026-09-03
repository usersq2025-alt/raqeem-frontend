import { notFound } from "next/navigation";
import { requireStudentChild } from "@/lib/server/requireStudentChild";
import { ReviewStationExperience } from "@/components/ReviewStationExperience";

type Props = {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ childId?: string }>;
};

export default async function UnitReviewPage({ params, searchParams }: Props) {
  const child = await requireStudentChild((await searchParams).childId);
  const unitId = Number((await params).unitId);
  if (!Number.isFinite(unitId) || unitId <= 0) notFound();
  return <ReviewStationExperience unitId={unitId} childId={child.id} />;
}
