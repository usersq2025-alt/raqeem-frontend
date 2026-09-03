import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/AuthShell";
import { ForgotPasswordFlow } from "@/components/forms/ForgotPasswordFlow";

export default async function ForgotPasswordPage() {
  const t = await getTranslations("forgotPassword");

  return (
    <AuthShell backHref="/login" backLabel={t("back")}>
      <ForgotPasswordFlow />
    </AuthShell>
  );
}
