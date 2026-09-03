import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

export default async function LegacySuccessRedirect() {
  const locale = await getLocale();
  redirect({ href: "/account-success", locale });
}
