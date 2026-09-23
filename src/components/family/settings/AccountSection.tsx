"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { ParentAccount } from "@/lib/api/parentAccount";
import { ParentAccountApiError, updateParentAccount } from "@/lib/api/parentAccount";
import { formatLocaleDate } from "@/lib/i18n/latinNumerals";
import { CardShell, ComingSoonCard, EmptyBlock, ErrorBlock, SectionIntro, SkeletonBlock } from "./SettingsUi";

type Props = {
  account: ParentAccount | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onAccount: (a: ParentAccount) => void;
  onSaved: (message?: string) => void;
};

export function AccountSection({ account, loading, error, onRetry, onAccount, onSaved }: Props) {
  const t = useTranslations("familySettings");
  const locale = useLocale();
  const accountFullName = account?.fullName ?? "";
  const [name, setName] = useState(accountFullName);
  const [trackedFullName, setTrackedFullName] = useState(accountFullName);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");

  if (accountFullName !== trackedFullName) {
    setTrackedFullName(accountFullName);
    setName(accountFullName);
  }

  const memberSince =
    account?.createdAt != null
      ? t("account.memberSince", {
          date: formatMemberMonthYear(account.createdAt, locale),
        })
      : null;

  const initial = useMemo(() => {
    const n = (account?.fullName ?? "").trim();
    return n ? n.charAt(0).toUpperCase() : "";
  }, [account?.fullName]);

  const dirty = Boolean(account && name.trim() && name.trim() !== account.fullName);

  if (loading) return <SkeletonBlock rows={5} />;
  if (error || !account) {
    return <ErrorBlock message={t("loadError")} retryLabel={t("retry")} onRetry={onRetry} />;
  }

  return (
    <div className="space-y-4">
      <SectionIntro title={t("account.panelTitle")} description={t("account.panelLead")} />

      <CardShell>
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#003890] text-xl font-black text-white ring-1 ring-brand-navy/10">
            {initial || (
              <Image src="/images/brand/logo.png" alt="" width={36} height={36} className="object-contain" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold text-text-navy">
              {account.fullName.trim() || t("account.unnamed")}
            </p>
            {account.email ? (
              <p className="truncate text-sm font-semibold text-text-gray">{account.email}</p>
            ) : (
              <p className="text-sm font-semibold text-text-gray">{t("account.noEmail")}</p>
            )}
            {account.phone ? (
              <p className="mt-0.5 text-sm font-semibold text-text-gray">
                {[account.phoneCountryCode, account.phone].filter(Boolean).join(" ")}
              </p>
            ) : null}
            {memberSince ? <p className="mt-1 text-xs font-semibold text-text-gray">{memberSince}</p> : null}
          </div>
        </div>
      </CardShell>

      <CardShell>
        <label className="block text-sm font-extrabold text-text-navy" htmlFor="parent-name">
          {t("account.nameLabel")}
        </label>
        <input
          id="parent-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-2 min-h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-text-navy outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-brand-gold"
        />
        <button
          type="button"
          disabled={busy || !dirty}
          className="mt-3 min-h-11 rounded-2xl bg-primary-orange px-5 text-sm font-extrabold text-white transition-opacity disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          onClick={async () => {
            if (!name.trim()) return;
            setBusy(true);
            setSaveError("");
            try {
              const next = await updateParentAccount({ fullName: name.trim() });
              onAccount(next);
              onSaved(t("account.saved"));
            } catch (caught) {
              const code = caught instanceof ParentAccountApiError ? caught.code : "ERROR";
              setSaveError(code === "GUARDIAN_LOCKED" ? t("errors.guardianLocked") : t("account.saveError"));
            } finally {
              setBusy(false);
            }
          }}
        >
          {t("account.saveChanges")}
        </button>
        {saveError ? <p className="mt-2 text-sm font-semibold text-red-600">{saveError}</p> : null}
      </CardShell>

      <CardShell>
        <p className="text-sm font-extrabold text-text-navy">{t("account.emailLabel")}</p>
        {account.email ? (
          <p className="mt-1 text-sm font-semibold text-text-gray">{account.email}</p>
        ) : (
          <EmptyBlock title={t("account.noEmail")} body={t("account.emailGap")} />
        )}
        {account.email ? (
          <p className="mt-2 text-xs font-medium leading-relaxed text-text-gray">{t("account.emailGap")}</p>
        ) : null}
      </CardShell>

      {!account.phone ? (
        <ComingSoonCard
          badge={t("comingSoonBadge")}
          title={t("account.phoneSoonTitle")}
          body={t("account.phoneSoonBody")}
        />
      ) : null}

      <CardShell>
        <p className="mb-2 text-sm font-extrabold text-text-navy">{t("account.locale")}</p>
        <LanguageSwitcher />
      </CardShell>
    </div>
  );
}

function formatMemberMonthYear(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return formatLocaleDate(date, locale, { month: "long", year: "numeric" });
}
