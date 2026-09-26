import { FamilyGuardianUnlockPanel } from "@/components/family/FamilyGuardianUnlockPanel";
import { GuardianLiveGuard } from "@/components/family/GuardianLiveGuard";
import { ExhibitionExperience } from "@/components/family/ExhibitionExperience";
import { requireGuardianPage } from "@/lib/server/requireGuardianPage";

export default async function ExhibitionPage() {
  const { session, guardian } = await requireGuardianPage();
  const seed = { id: session.parent.id, fullName: session.parent.full_name ?? "", email: session.parent.email ?? null };
  if (!guardian.unlocked) {
    return <FamilyGuardianUnlockPanel seed={seed} pinSet={guardian.pinSet} pinLocked={guardian.pinLocked} redirectTo="/family/exhibition" />;
  }
  return <GuardianLiveGuard seed={seed} redirectTo="/family/exhibition"><ExhibitionExperience /></GuardianLiveGuard>;
}
