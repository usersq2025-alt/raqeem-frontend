"use client";

import { useTranslations } from "next-intl";

export function RegisterVisualPanel() {
  const t = useTranslations("register");

  return (
    <div className="auth-visual relative h-full min-h-dvh overflow-hidden">
      <img
        src="/images/auth/register-start.png"
        alt={t("assistantAlt")}
        width={864}
        height={1152}
        className="absolute inset-0 h-full w-full object-cover object-top"
      />
    </div>
  );
}
