import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AuthShell } from "@/components/AuthShell";
import { AddChildExperience } from "@/components/forms/AddChildExperience";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";
import { requireGuardianPage } from "@/lib/server/requireGuardianPage";
import { FamilyGuardianUnlockPanel } from "@/components/family/FamilyGuardianUnlockPanel";

export default async function AddChildPage() {
  const locale = await getLocale();
  const t = await getTranslations("child");
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    redirect({ href: "/register", locale });
    return;
  }

  const { guardian } = await requireGuardianPage();
  if (!guardian.unlocked) {
    return <FamilyGuardianUnlockPanel
      seed={{ id: session.parent.id, fullName: session.parent.full_name ?? "", email: session.parent.email ?? null }}
      pinSet={guardian.pinSet}
      pinLocked={guardian.pinLocked}
      redirectTo="/add-child"
    />;
  }

  return (
    <AuthShell backHref="/children" backLabel={t("back")} alwaysShowBack>
      <AddChildExperience />
    </AuthShell>
  );
}
