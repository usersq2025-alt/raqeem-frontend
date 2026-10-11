"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { FieldInput, LockIcon } from "@/components/ui/FieldInput";
import {
  getGuardianStatus,
  verifyGuardianPin,
  type GuardianStatus,
} from "@/lib/api/guardian";

type Props = {
  onUnlocked: (status: GuardianStatus) => void;
};

export function FamilyGuardianUnlockCard({ onUnlocked }: Props) {
  const tGate = useTranslations("parentGate");
  const t = useTranslations("familySettings.guardian");
  const [status, setStatus] = useState<GuardianStatus | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getGuardianStatus().then((next) => { setStatus(next); if (next.unlocked) onUnlocked(next); }).catch(() => setError(tGate("errors.unavailable")));
  }, [onUnlocked, tGate]);

  async function handleUnlock(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (status?.pinSet) {
        await verifyGuardianPin(pin.trim());
      } else {
        // No PIN is configured: refresh access without requesting credentials.
      }
      const next = await getGuardianStatus();
      setStatus(next);
      if (!next.unlocked) { setError(tGate(next.isDemo ? "demoBody" : "errors.unavailable")); return; }
      onUnlocked(next);
      setPin("");
    } catch (caught) {
      const code =
        caught && typeof caught === "object" && "code" in caught
          ? String((caught as { code: string }).code)
          : "NETWORK";
      if (code === "INVALID_CREDENTIALS") setError(t("errors.invalidPassword"));
      else if (code === "INVALID_PIN" || code === "WRONG_PIN") setError(t("errors.invalidPin"));
      else if (code === "LOCKED") setError(t("errors.pinLocked"));
      else setError(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  if (status?.unlocked) return null;

  const usePin = Boolean(status?.pinSet);

  return (
    <div className="rounded-[22px] border border-primary-orange/25 bg-[#FFF8F1] p-4">
      <p className="text-sm font-extrabold text-text-navy">{t("title")}</p>
      <p className="mt-1 text-sm font-semibold text-text-gray">{t("body")}</p>
      <form className="mt-3 space-y-2" onSubmit={handleUnlock}>
        {usePin ? (
          <FieldInput
            id="family-unlock-pin"
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            icon={<LockIcon />}
            disabled={busy || Boolean(status?.pinLocked)}
            placeholder={t("pinPlaceholder")}
          />
        ) : null}
        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={busy || Boolean(status?.pinLocked)}>
          {busy ? t("unlocking") : usePin ? t("unlock") : tGate("retry")}
        </Button>
      </form>
    </div>
  );
}
