import { getTranslations } from "next-intl/server";

export default async function ContactPage() {
  const t = await getTranslations("placeholder");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background-white px-6">
      <p className="text-lg text-text-gray">{t("contact")}</p>
    </main>
  );
}
