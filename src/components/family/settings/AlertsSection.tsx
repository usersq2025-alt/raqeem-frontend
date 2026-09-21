"use client";

import { useTranslations } from "next-intl";
import { ComingSoonCard, SectionIntro } from "./SettingsUi";

export function AlertsSection() {
  const t = useTranslations("familySettings");
  return (
    <div className="space-y-4">
      <SectionIntro title={t("alerts.panelTitle")} description={t("alerts.panelLead")} />
      <ComingSoonCard
        badge={t("comingSoonBadge")}
        title={t("alerts.soonTitle")}
        body={t("alerts.soonBody")}
        note={t("alertsDisclaimer")}
      />
    </div>
  );
}
