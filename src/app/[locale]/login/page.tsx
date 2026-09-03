import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "@/components/forms/LoginForm";

export default async function LoginPage() {
  const t = await getTranslations("login");

  return (
    <AuthShell backHref="/" backLabel={t("back")}>
      <h1 className="text-center text-2xl font-extrabold text-text-navy md:text-[1.7rem]">
        {t("title")}
      </h1>
      <p className="mt-2 text-center text-sm leading-6 text-text-gray">{t("subtitle")}</p>
      <LoginForm />
    </AuthShell>
  );
}
