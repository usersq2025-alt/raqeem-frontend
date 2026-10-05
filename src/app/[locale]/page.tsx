import { cookies } from "next/headers";
import { ResumeLastVisit } from "@/components/ResumeLastVisit";
import { WelcomeHero } from "@/components/WelcomeHero";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";

export default async function HomePage() {
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE_NAME)?.value);

  if (session) {
    return <ResumeLastVisit seed={{ id: session.parent.id, fullName: session.parent.full_name ?? "", email: session.parent.email ?? null }} />;
  }

  return <WelcomeHero />;
}
