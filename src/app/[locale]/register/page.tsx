import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/AuthShell";
import { RegisterForm } from "@/components/forms/RegisterForm";

export default async function RegisterPage() {
  const t = await getTranslations("register");

  return (
    <AuthShell backHref="/" backLabel={t("back")}>
      <h1 className="text-center text-2xl font-extrabold text-text-navy md:text-[1.7rem]">
        {t("title")}
      </h1>
      <RegisterForm />
    </AuthShell>
  );
}
