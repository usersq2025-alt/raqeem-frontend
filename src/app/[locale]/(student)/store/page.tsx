import { getTranslations } from "next-intl/server";
import { requireStudentChild } from "@/lib/server/requireStudentChild";
import { Hq3dStore } from "@/components/store/Hq3dStore";
import { isHq3dProfession } from "@/lib/config/hq3d";
import { loadStoreCatalog } from "@/lib/server/loadStore";
import { StoreExperience } from "@/components/store/StoreExperience";

type Props = {
  searchParams: Promise<{ childId?: string }>;
};

export default async function StorePage({ searchParams }: Props) {
  const child = await requireStudentChild((await searchParams).childId);
  // Doctors shop for the 3D clinic tools (priced in points, see config/hq3d.php).
  if (isHq3dProfession(child.professionCode)) {
    return <Hq3dStore childId={child.id} profession={child.professionCode} />;
  }
  const catalog = await loadStoreCatalog(child.id);
  const t = await getTranslations("student.store");

  if (!catalog) {
    return <p className="py-16 text-center text-lg font-bold text-text-gray">{t("loadError")}</p>;
  }

  return (
    <StoreExperience childId={child.id} catalog={catalog} professionCode={child.professionCode} />
  );
}
