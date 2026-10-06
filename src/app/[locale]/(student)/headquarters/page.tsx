import { getLocale, getTranslations } from "next-intl/server";
import { requireStudentChild } from "@/lib/server/requireStudentChild";
import { loadHeadquarters, loadStoreCatalog } from "@/lib/server/loadStore";
import { redirect } from "@/i18n/navigation";
import { withChildQuery } from "@/lib/config/subjects";
import { HeadquartersExperience } from "@/components/headquarters/HeadquartersExperience";

type Props = {
  searchParams: Promise<{
    childId?: string;
    highlight?: string;
    fromBalance?: string;
    toBalance?: string;
    welcome?: string;
  }>;
};

export default async function HeadquartersPage({ searchParams }: Props) {
  const params = await searchParams;
  const child = await requireStudentChild(params.childId);
  // Doctors play the 3D clinic; the old stage-image HQ remains for other professions.
  if (child.professionCode === "doctor") {
    redirect({ href: withChildQuery("/headquarters/3d", child.id), locale: await getLocale() });
  }
  const [scene, catalog] = await Promise.all([
    loadHeadquarters(child.id),
    loadStoreCatalog(child.id),
  ]);
  const t = await getTranslations("student.store");

  if (!scene) {
    return <p className="py-16 text-center text-lg font-bold text-text-gray">{t("loadError")}</p>;
  }

  const highlightId = Number(params.highlight);
  const fromBalance = Number(params.fromBalance);

  return (
    <HeadquartersExperience
      child={child}
      scene={scene}
      catalog={catalog}
      highlightId={Number.isFinite(highlightId) && highlightId > 0 ? highlightId : null}
      fromBalance={Number.isFinite(fromBalance) ? fromBalance : null}
      welcome={params.welcome === "1"}
    />
  );
}
