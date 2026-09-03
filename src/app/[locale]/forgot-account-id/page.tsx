import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/AuthShell";
import { ForgotAccountIdForm } from "@/components/forms/ForgotAccountIdForm";

export default async function ForgotAccountIdPage() {
  const t = await getTranslations("forgotAccountId");

  return (
    <AuthShell backHref="/login" backLabel={t("back")}>
      <ForgotAccountIdForm />
    </AuthShell>
  );
}
