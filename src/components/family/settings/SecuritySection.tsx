"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { changeParentPassword } from "@/lib/api/parentAccount";
import { getGuardianStatus, setGuardianPin } from "@/lib/api/guardian";
import type { ParentAccount } from "@/lib/api/parentAccount";
import { CardShell, SectionIntro } from "./SettingsUi";

type Props = {
  account: ParentAccount | null;
  onAccount: (a: ParentAccount) => void;
  onSaved: (message?: string) => void;
  onLogout: () => void;
};

export function SecuritySection({ account, onAccount, onSaved, onLogout }: Props) {
  const t = useTranslations("familySettings");
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pinPassword, setPinPassword] = useState("");
  const [pinValue, setPinValue] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [showPinForm, setShowPinForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pinError, setPinError] = useState("");

  const pinSet = Boolean(account?.pinSet);
  const pwValid =
    pwCurrent.length > 0 &&
    pwNew.length >= 8 &&
    pwNew === pwConfirm &&
    /[a-z]/.test(pwNew) &&
    /[A-Z]/.test(pwNew) &&
    /\d/.test(pwNew);

  return (
    <div className="space-y-4">
      <SectionIntro title={t("security.panelTitle")} description={t("security.panelLead")} />

      <CardShell>
        <h3 className="text-sm font-extrabold text-text-navy">{t("security.changePassword")}</h3>
        <label className="mt-3 block text-sm font-semibold" htmlFor="cur-pw">
          {t("security.currentPassword")}
        </label>
        <PasswordInput
          id="cur-pw"
          name="current_password"
          placeholder=""
          value={pwCurrent}
          onChange={setPwCurrent}
          autoComplete="current-password"
        />
        <label className="mt-3 block text-sm font-semibold" htmlFor="new-pw">
          {t("security.newPassword")}
        </label>
        <PasswordInput
          id="new-pw"
          name="new_password"
          placeholder=""
          value={pwNew}
          onChange={setPwNew}
          autoComplete="new-password"
        />
        {pwNew && pwNew.length < 8 ? (
          <p className="mt-1 text-xs font-semibold text-red-600">{t("security.passwordMin")}</p>
        ) : null}
        <label className="mt-3 block text-sm font-semibold" htmlFor="confirm-pw">
          {t("security.confirmPassword")}
        </label>
        <PasswordInput
          id="confirm-pw"
          name="confirm_password"
          placeholder=""
          value={pwConfirm}
          onChange={setPwConfirm}
          autoComplete="new-password"
        />
        {pwConfirm && pwConfirm !== pwNew ? (
          <p className="mt-1 text-xs font-semibold text-red-600">{t("security.passwordMismatch")}</p>
        ) : null}
        <button
          type="button"
          disabled={busy || !pwValid}
          className="mt-3 min-h-11 rounded-2xl bg-primary-orange px-4 text-sm font-extrabold text-white disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          onClick={async () => {
            setBusy(true);
            setPwError("");
            try {
              await changeParentPassword({ currentPassword: pwCurrent, newPassword: pwNew });
              setPwCurrent("");
              setPwNew("");
              setPwConfirm("");
              onSaved(t("security.passwordUpdated"));
            } catch {
              setPwError(t("security.passwordError"));
            } finally {
              setBusy(false);
            }
          }}
        >
          {t("security.updatePassword")}
        </button>
        {pwError ? <p className="mt-2 text-sm font-semibold text-red-600">{pwError}</p> : null}
      </CardShell>

      <CardShell>
        <h3 className="text-sm font-extrabold text-text-navy">{t("security.pinTitle")}</h3>
        <p className="mt-1 text-xs font-medium leading-relaxed text-text-gray">{t("security.pinLead")}</p>
        <p className="mt-2 text-sm font-extrabold text-text-navy">
          {pinSet ? t("security.pinActive") : t("security.pinMissing")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="min-h-11 rounded-2xl bg-[#003890] px-4 text-sm font-extrabold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            onClick={() => {
              setShowPinForm(true);
              setPinError("");
            }}
          >
            {pinSet ? t("security.changePin") : t("security.createPin")}
          </button>
        </div>

        {showPinForm ? (
          <div className="mt-4 space-y-2 border-t border-neutral-200 pt-4">
            <label className="block text-sm font-semibold" htmlFor="pin-pw">
              {t("security.currentPassword")}
            </label>
            <PasswordInput
              id="pin-pw"
              name="pin_password"
              placeholder=""
              value={pinPassword}
              onChange={setPinPassword}
            />
            <label className="block text-sm font-semibold" htmlFor="pin-val">
              {t("security.newPin")}
            </label>
            <input
              id="pin-val"
              inputMode="numeric"
              maxLength={6}
              value={pinValue}
              onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="min-h-11 w-full rounded-2xl border border-neutral-200 px-3 tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            />
            <label className="block text-sm font-semibold" htmlFor="pin-confirm">
              {t("security.confirmPin")}
            </label>
            <input
              id="pin-confirm"
              inputMode="numeric"
              maxLength={6}
              value={pinConfirm}
              onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="min-h-11 w-full rounded-2xl border border-neutral-200 px-3 tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            />
            <button
              type="button"
              disabled={
                busy ||
                pinPassword.length < 1 ||
                pinValue.length < 4 ||
                pinValue !== pinConfirm
              }
              className="min-h-11 rounded-2xl bg-primary-orange px-4 text-sm font-extrabold text-white disabled:opacity-45"
              onClick={async () => {
                if (pinValue !== pinConfirm) {
                  setPinError(t("security.pinMismatch"));
                  return;
                }
                setBusy(true);
                setPinError("");
                try {
                  await setGuardianPin({
                    password: pinPassword,
                    pin: pinValue,
                    pinConfirmation: pinConfirm,
                  });
                  const status = await getGuardianStatus().catch(() => null);
                  if (account) {
                    onAccount({
                      ...account,
                      pinSet: status?.pinSet ?? true,
                    });
                  }
                  setPinPassword("");
                  setPinValue("");
                  setPinConfirm("");
                  setShowPinForm(false);
                  onSaved(t("security.pinSaved"));
                } catch {
                  setPinError(t("security.pinError"));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t("security.savePin")}
            </button>
            {pinError ? <p className="text-sm font-semibold text-red-600">{pinError}</p> : null}
          </div>
        ) : null}
      </CardShell>

      <CardShell>
        <p className="text-sm font-extrabold text-text-navy">{t("security.privacyHeading")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/privacy"
            className="min-h-11 rounded-2xl bg-white px-4 text-sm font-extrabold leading-[2.75rem] text-text-navy ring-1 ring-brand-navy/10"
          >
            {t("security.privacy")}
          </Link>
          <Link
            href="/terms"
            className="min-h-11 rounded-2xl bg-white px-4 text-sm font-extrabold leading-[2.75rem] text-text-navy ring-1 ring-brand-navy/10"
          >
            {t("security.terms")}
          </Link>
          <Link
            href="/contact"
            className="min-h-11 rounded-2xl bg-white px-4 text-sm font-extrabold leading-[2.75rem] text-text-navy ring-1 ring-brand-navy/10"
          >
            {t("help.contact")}
          </Link>
        </div>
      </CardShell>

      <div className="rounded-[22px] border border-red-100 bg-red-50/60 p-4">
        <button
          type="button"
          className="min-h-11 w-full rounded-2xl bg-white px-4 text-sm font-extrabold text-red-600 ring-1 ring-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          onClick={onLogout}
        >
          {t("security.logout")}
        </button>
      </div>
    </div>
  );
}
