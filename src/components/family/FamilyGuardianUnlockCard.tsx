"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { FieldInput, LockIcon } from "@/components/ui/FieldInput";
import {
  getGuardianStatus,
  verifyGuardianPassword,
  verifyGuardianPin,
  type GuardianStatus,
} from "@/lib/api/guardian";

type Props = {
  onUnlocked: (status: GuardianStatus) => void;
};

export function FamilyGuardianUnlockCard({ onUnlocked }: Props) {
  const t = useTranslations("familySettings.guardian");
  const [status, setStatus] = useState<GuardianStatus | null>(null);
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getGuardianStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  async function handleUnlock(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (status?.pinSet) {
        await verifyGuardianPin(pin.trim());
      } else {
        await verifyGuardianPassword(password);
      }
      const next = await getGuardianStatus();
      setStatus(next);
      onUnlocked(next);
      setPin("");
      setPassword("");
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
        ) : (
          <FieldInput
            id="family-unlock-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            icon={<LockIcon />}
            disabled={busy}
            placeholder={t("passwordPlaceholder")}
          />
        )}
        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={busy || Boolean(status?.pinLocked)}>
          {busy ? t("unlocking") : t("unlock")}
        </Button>
      </form>
    </div>
  );
}
