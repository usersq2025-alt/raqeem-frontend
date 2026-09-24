import { ChildrenHub } from "@/components/ChildrenHub";
import { FamilyGuardianUnlockPanel } from "@/components/family/FamilyGuardianUnlockPanel";
import { GuardianLiveGuard } from "@/components/family/GuardianLiveGuard";
import { requireGuardianPage } from "@/lib/server/requireGuardianPage";

export default async function ChildrenPage() {
  const { session, guardian } = await requireGuardianPage();
  const seed = {
    id: session.parent.id,
    fullName: session.parent.full_name ?? "",
    email: session.parent.email ?? null,
  };
  if (!guardian.unlocked) {
    return <FamilyGuardianUnlockPanel seed={seed} pinSet={guardian.pinSet} pinLocked={guardian.pinLocked} redirectTo="/children" />;
  }
  return <GuardianLiveGuard seed={seed} redirectTo="/children"><ChildrenHub parentName={seed.fullName} /></GuardianLiveGuard>;
}
