import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/AuthShell";
import { requireParentSession } from "@/lib/server/requireParentSession";

export default async function FamilyHelpPage() {
  await requireParentSession();
  const t = await getTranslations("familyHelp");

  return (
    <AuthShell backHref="/family/settings" backLabel={t("back")}>
      <article className="space-y-8 rounded-[28px] bg-white p-5 shadow-sm sm:p-6">
        <header>
          <h1 className="text-2xl font-extrabold text-text-navy">{t("title")}</h1>
          <p className="mt-2 text-sm font-medium text-text-gray">{t("lead")}</p>
        </header>

        <section id="faq" className="scroll-mt-24">
          <h2 className="text-lg font-extrabold text-text-navy">{t("faqTitle")}</h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-text-gray">{t("faqBody")}</p>
        </section>

        <section id="points" className="scroll-mt-24">
          <h2 className="text-lg font-extrabold text-text-navy">{t("pointsTitle")}</h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-text-gray">{t("pointsBody")}</p>
        </section>

        <section id="hq" className="scroll-mt-24">
          <h2 className="text-lg font-extrabold text-text-navy">{t("hqTitle")}</h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-text-gray">{t("hqBody")}</p>
        </section>
      </article>
    </AuthShell>
  );
}
