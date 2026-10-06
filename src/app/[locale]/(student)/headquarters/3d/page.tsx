import { requireStudentChild } from "@/lib/server/requireStudentChild";
import { Hq3dExperience } from "@/components/headquarters/Hq3dExperience";

type Props = {
  searchParams: Promise<{ childId?: string }>;
};

export default async function Headquarters3dPage({ searchParams }: Props) {
  const params = await searchParams;
  const child = await requireStudentChild(params.childId);
  return <Hq3dExperience childId={child.id} childName={child.fullName} />;
}
