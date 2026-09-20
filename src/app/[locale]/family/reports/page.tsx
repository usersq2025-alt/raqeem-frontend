import { FamilyGuardianUnlockPanel } from "@/components/family/FamilyGuardianUnlockPanel";
import { requireGuardianPage } from "@/lib/server/requireGuardianPage";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/AuthShell";

export default async function FamilyReportsPage() {
  const { session, guardian } = await requireGuardianPage();
  const t = await getTranslations("familySettings");

  const seed = {
    id: session.parent.id,
    fullName: session.parent.full_name ?? "",
    email: session.parent.email ?? null,
  };

  if (!guardian.unlocked) {
    return (
      <FamilyGuardianUnlockPanel
        seed={seed}
        pinSet={guardian.pinSet}
        pinLocked={guardian.pinLocked}
        redirectTo="/family/reports"
      />
    );
  }

  return (
    <AuthShell backHref="/children" backLabel={t("backToHub")}>
      <div className="rounded-[28px] bg-[#F8FAFC] p-6 text-center ring-1 ring-brand-navy/10">
        <span className="inline-flex rounded-full bg-[#FFF1E4] px-3 py-1 text-xs font-extrabold text-primary-orange">
          {t("comingSoonBadge")}
        </span>
        <h1 className="mt-3 text-xl font-extrabold text-text-navy">{t("sections.reports")}</h1>
        <p className="mt-2 text-sm font-medium leading-relaxed text-text-gray">{t("comingSoon")}</p>
        <p className="mt-3 text-sm font-semibold text-text-navy">{t("reportsDisclaimer")}</p>
      </div>
    </AuthShell>
  );
}
