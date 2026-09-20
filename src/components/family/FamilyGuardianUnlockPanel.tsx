"use client";

import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { BrandPageDecor } from "@/components/BrandPageDecor";
import { FieldInput, LockIcon } from "@/components/ui/FieldInput";
import {
  getGuardianStatus,
  verifyGuardianPassword,
  verifyGuardianPin,
} from "@/lib/api/guardian";

type Props = {
  seed: { id: number; fullName: string; email: string | null };
  pinSet: boolean;
  pinLocked: boolean;
  redirectTo?: string;
};

export function FamilyGuardianUnlockPanel({ seed, pinSet, pinLocked, redirectTo = "/family/settings" }: Props) {
  const t = useTranslations("familySettings.guardian");
  const tSettings = useTranslations("familySettings");
  const router = useRouter();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(pinLocked);
  const [usePin] = useState(pinSet);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || locked) return;
    setBusy(true);
    setError("");
    try {
      if (usePin) {
        await verifyGuardianPin(pin.trim());
      } else {
        await verifyGuardianPassword(password);
      }
      await getGuardianStatus();
      router.replace(redirectTo);
      router.refresh();
    } catch (caught) {
      const code =
        caught && typeof caught === "object" && "code" in caught
          ? String((caught as { code: string }).code)
          : "NETWORK";
      if (code === "INVALID_CREDENTIALS") setError(t("errors.invalidPassword"));
      else if (code === "INVALID" || code === "INVALID_PIN" || code === "WRONG_PIN") setError(t("errors.invalidPin"));
      else if (code === "LOCKED") {
        setLocked(true);
        setError(t("errors.pinLocked"));
      } else setError(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#F3F6FA]">
      <BrandPageDecor density="sparse" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between">
          <BrandLogo size="sm" />
          <button
            type="button"
            className="min-h-11 rounded-2xl bg-white px-4 text-sm font-extrabold text-text-navy ring-1 ring-brand-navy/10"
            onClick={() => router.push("/children")}
          >
            {tSettings("backToHub")}
          </button>
        </header>

        <div
          role="dialog"
          aria-labelledby={titleId}
          className="mt-10 rounded-[28px] bg-white p-5 shadow-[0_18px_40px_-28px_rgba(26,43,71,0.4)] sm:p-6"
        >
          <p className="text-sm font-semibold text-text-gray">
            {seed.fullName || seed.email || tSettings("title")}
          </p>
          <h1 id={titleId} className="mt-1 text-xl font-extrabold text-text-navy">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm font-medium leading-relaxed text-text-gray">{t("body")}</p>

          <form className="mt-5 space-y-3" onSubmit={onSubmit}>
            {usePin ? (
              <div>
                <label htmlFor="family-gate-pin" className="mb-1.5 block text-sm font-bold text-text-navy">
                  {t("pinPlaceholder")}
                </label>
                <FieldInput
                  ref={inputRef}
                  id="family-gate-pin"
                  name="pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  icon={<LockIcon />}
                  disabled={busy || locked}
                />
              </div>
            ) : (
              <div>
                <label htmlFor="family-gate-password" className="mb-1.5 block text-sm font-bold text-text-navy">
                  {t("passwordPlaceholder")}
                </label>
                <FieldInput
                  ref={inputRef}
                  id="family-gate-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<LockIcon />}
                  disabled={busy}
                />
                <p className="mt-2 text-xs font-semibold text-text-gray">{t("passwordHint")}</p>
              </div>
            )}
            {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={busy || locked || (usePin ? pin.length < 4 : password.length < 1)}
              className="min-h-12 w-full rounded-full bg-primary-orange text-sm font-extrabold text-white disabled:opacity-45"
            >
              {busy ? t("unlocking") : t("unlock")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
