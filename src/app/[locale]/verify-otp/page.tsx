import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/AuthShell";
import { VerifyOtpForm } from "@/components/forms/VerifyOtpForm";

type Props = {
  searchParams: Promise<{ parentId?: string; email?: string }>;
};

export default async function VerifyOtpPage({ searchParams }: Props) {
  const t = await getTranslations("otp");
  const params = await searchParams;
  const parsedId = Number(params.parentId);
  const parentId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;

  return (
    <AuthShell backHref="/register" backLabel={t("back")}>
      <VerifyOtpForm parentId={parentId} email={params.email ?? ""} />
    </AuthShell>
  );
}
