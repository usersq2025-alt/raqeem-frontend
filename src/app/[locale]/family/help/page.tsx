import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/AuthShell";
import { requireParentSession } from "@/lib/server/requireParentSession";

export default async function FamilyHelpPage() {
  await requireParentSession();
  const t = await getTranslations("familyHelp");

  const sections = [
    { id: "how", title: t("howTitle"), body: t("howBody") },
    { id: "points", title: t("pointsTitle"), body: t("pointsBody") },
    { id: "hq", title: t("hqTitle"), body: t("hqBody") },
    { id: "account", title: t("accountTitle"), body: t("accountBody") },
    { id: "faq", title: t("faqTitle"), body: t("faqBody") },
  ] as const;

  return (
    <AuthShell backHref="/family/settings" backLabel={t("back")}>
      <article className="space-y-8 rounded-[28px] bg-white p-5 shadow-sm sm:p-6">
        <header>
          <h1 className="text-2xl font-extrabold text-text-navy">{t("title")}</h1>
          <p className="mt-2 text-sm font-medium text-text-gray">{t("lead")}</p>
        </header>

        {sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="text-lg font-extrabold text-text-navy">{section.title}</h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-text-gray">{section.body}</p>
          </section>
        ))}
      </article>
    </AuthShell>
  );
}
