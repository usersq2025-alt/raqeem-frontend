"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { readLastVisit } from "@/lib/navigation/lastVisit";
import { getGuardianStatus, GuardianApiError, lockGuardianMode } from "@/lib/api/guardian";
import { FamilyGuardianUnlockPanel } from "@/components/family/FamilyGuardianUnlockPanel";

type Props = { seed: { id: number; fullName: string; email: string | null } };

export function ResumeLastVisit({ seed }: Props) {
  const router = useRouter();
  const [gate, setGate] = useState<{ href: string; pinSet: boolean; pinLocked: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    const visit = readLastVisit(seed.id);
    if (visit?.area === "student") {
      router.replace(visit.href);
      return;
    }
    void (async () => {
      const href = visit?.href ?? "/children";
      try {
        // Reopening a parent page always requires fresh verification.
        await lockGuardianMode();
        const status = await getGuardianStatus();
        if (active) setGate({ href, pinSet: status.pinSet, pinLocked: status.pinLocked });
      } catch (error) {
        if (!active) return;
        if (error instanceof GuardianApiError && error.status === 401) {
          router.replace("/login");
        } else {
          setGate({ href, pinSet: false, pinLocked: false });
        }
      }
    })();
    return () => { active = false; };
  }, [seed.id, router]);

  if (!gate) return <div className="min-h-screen bg-[#F3F6FA]" aria-busy="true" />;
  return <FamilyGuardianUnlockPanel seed={seed} pinSet={gate.pinSet} pinLocked={gate.pinLocked} redirectTo={gate.href} />;
}
