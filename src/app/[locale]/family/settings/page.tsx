import { cookies } from "next/headers";
import { FamilySettingsExperience } from "@/components/family/FamilySettingsExperience";
import { FamilyGuardianUnlockPanel } from "@/components/family/FamilyGuardianUnlockPanel";
import { GuardianLiveGuard } from "@/components/family/GuardianLiveGuard";
import { requireGuardianPage } from "@/lib/server/requireGuardianPage";

export default async function FamilySettingsPage() {
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
      />
    );
  }

  return <GuardianLiveGuard seed={seed} redirectTo="/family/settings"><FamilySettingsExperience seed={seed} /></GuardianLiveGuard>;
}
