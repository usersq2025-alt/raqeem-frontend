import { VerifyOtpExperience } from "@/components/otp/VerifyOtpExperience";

type Props = {
  searchParams: Promise<{ parentId?: string; email?: string }>;
};

export default async function VerifyOtpPage({ searchParams }: Props) {
  const params = await searchParams;
  const parsedId = Number(params.parentId);
  const parentId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;

  return <VerifyOtpExperience parentId={parentId} email={params.email ?? ""} />;
}
