import { FamilyGuardianUnlockPanel } from "@/components/family/FamilyGuardianUnlockPanel";
import { requireGuardianPage } from "@/lib/server/requireGuardianPage";
import { FamilySettingsExperience } from "@/components/family/FamilySettingsExperience";

export default async function FamilyReportsPage() {
  const { session, guardian } = await requireGuardianPage();

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

  return <FamilySettingsExperience seed={seed} initialSection="reports" />;
}
