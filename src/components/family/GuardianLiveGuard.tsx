"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getGuardianStatus } from "@/lib/api/guardian";
import { FamilyGuardianUnlockPanel } from "@/components/family/FamilyGuardianUnlockPanel";

type Seed = { id: number; fullName: string; email: string | null };

export function GuardianLiveGuard({ seed, redirectTo, children }: { seed: Seed; redirectTo: string; children: ReactNode }) {
  const [state, setState] = useState<"checking" | "unlocked" | "locked">("checking");
  const [pinSet, setPinSet] = useState(false);
  const [pinLocked, setPinLocked] = useState(false);

  useEffect(() => {
    let active = true;
    let sequence = 0;
    async function check() {
      const request = ++sequence;
      setState("checking");
      try {
        const status = await getGuardianStatus();
        if (!active || request !== sequence) return;
        setPinSet(status.pinSet);
        setPinLocked(status.pinLocked);
        setState(status.unlocked ? "unlocked" : "locked");
      } catch {
        if (active && request === sequence) setState("locked");
      }
    }
    void check();
    const onVisible = () => { if (document.visibilityState === "visible") void check(); };
    const onPageShow = () => { void check(); };
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("popstate", onPageShow);
    window.addEventListener("focus", onPageShow);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("popstate", onPageShow);
      window.removeEventListener("focus", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (state === "checking") return <div className="min-h-screen bg-[#F3F6FA]" aria-busy="true" />;
  if (state === "locked") {
    return <FamilyGuardianUnlockPanel seed={seed} pinSet={pinSet} pinLocked={pinLocked} redirectTo={redirectTo} onUnlocked={() => setState("unlocked")} />;
  }
  return <>{children}</>;
}
