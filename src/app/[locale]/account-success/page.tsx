import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AuthShell } from "@/components/AuthShell";
import { AccountSuccessView } from "@/components/AccountSuccessView";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";

export default async function AccountSuccessPage() {
  const locale = await getLocale();
  const store = await cookies();
  const session = parseSessionCookie(store.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    redirect({ href: "/register", locale });
    return;
  }

  return (
    <AuthShell hideBack celebration>
      <AccountSuccessView publicId={session.parent.public_id ?? ""} />
    </AuthShell>
  );
}
