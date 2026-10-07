import { requireStudentChild } from "@/lib/server/requireStudentChild";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { Hq3dExperience } from "@/components/headquarters/Hq3dExperience";
import { isHq3dProfession } from "@/lib/config/hq3d";

type Props = {
  searchParams: Promise<{ childId?: string; place?: string }>;
};

export default async function Headquarters3dPage({ searchParams }: Props) {
  const params = await searchParams;
  const child = await requireStudentChild(params.childId);
  if (!isHq3dProfession(child.professionCode)) {
    redirect({ href: "/headquarters", locale: await getLocale() });
    return null;
  }
  const place = params.place && /^[a-z0-9_]{1,64}$/.test(params.place) ? params.place : null;
  return <Hq3dExperience childId={child.id} childName={child.fullName} profession={child.professionCode} initialPlace={place} />;
}
