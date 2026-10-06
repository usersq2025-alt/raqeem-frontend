import { getLocale, getTranslations } from "next-intl/server";
import { requireStudentChild } from "@/lib/server/requireStudentChild";
import { redirect } from "@/i18n/navigation";
import { withChildQuery } from "@/lib/config/subjects";
import { loadStoreCatalog } from "@/lib/server/loadStore";
import { StoreExperience } from "@/components/store/StoreExperience";

type Props = {
  searchParams: Promise<{ childId?: string }>;
};

export default async function StorePage({ searchParams }: Props) {
  const child = await requireStudentChild((await searchParams).childId);
  // For doctors the store lives inside the 3D clinic.
  if (child.professionCode === "doctor") {
    redirect({ href: withChildQuery("/headquarters/3d", child.id), locale: await getLocale() });
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
